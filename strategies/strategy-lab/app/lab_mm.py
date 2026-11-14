"""EXP-011 market making (simplified Avellaneda-Stoikov), paper only.

Keeps one bid and one ask on BTC and ETH, priced around a reservation price that leans against the
inventory we hold, with a half-spread that widens with recent volatility. Every fill is a maker fill.

Fill model (deliberately pessimistic, because we cannot see the queue): our bid fills only when the
best ask drops BELOW it, our ask only when the best bid rises ABOVE it. So we are only filled when
the price moves through us, which also captures adverse selection.

Separate simple accounting (cash + inventory), not the trade-based order manager: a market maker adds
to and trims positions constantly. Equity goes to the shared equity table as mode "paper-mm".
"""
from __future__ import annotations

import logging
import math
import threading
import time

from app.storage.database import Database, now_ms

log = logging.getLogger(__name__)

BOOK, MODE = "mm", "paper-mm"
COINS = ("BTC", "ETH")
CLIP_USD, MAX_CLIPS = 12.0, 3            # order size and max inventory per coin, in clips
MIN_HALF_BPS, VOL_MULT, SKEW = 2.0, 1.5, 1.0
VOL_WINDOW_S, LOOP_S, STALE_S = 60.0, 2.0, 10.0
KILL_FRAC = 0.85                          # stop quoting and flatten below 85% of start equity


class MarketMaker:
    def __init__(self, db: Database, feed, maker_fee: float, taker_fee: float, start: float = 100.0,
                 sz_decimals: dict[str, int] | None = None):
        self.db, self.feed, self.maker, self.taker = db, feed, maker_fee, taker_fee
        self.szd = sz_decimals or {"BTC": 5, "ETH": 4}
        st = db.get_state("mm:state")
        self.st = st or {"cash": start, "start": start, "inv": {c: 0.0 for c in COINS}, "fees": 0.0,
                         "funding": 0.0, "fills": 0, "volume": 0.0, "stopped": False, "since": now_ms()}
        self.var = {c: None for c in COINS}       # EWMA variance of log mid change per second
        self.last_mid: dict[str, tuple[float, float]] = {}
        self.quotes: dict[str, dict] = {}
        self._last_save = self._last_eq = 0.0
        self._stop = threading.Event()

    # -- maths --------------------------------------------------------------
    def _update_vol(self, coin: str, mid: float, t: float) -> None:
        prev = self.last_mid.get(coin)
        self.last_mid[coin] = (mid, t)
        if not prev or t <= prev[1]:
            return
        dt = t - prev[1]
        r2 = math.log(mid / prev[0]) ** 2 / dt
        a = min(1.0, dt / VOL_WINDOW_S)
        v = self.var[coin]
        self.var[coin] = r2 if v is None else (1 - a) * v + a * r2

    def target_quotes(self, coin: str, mid: float) -> tuple[float, float]:
        """Reservation price r = mid - skew * (inventory / max) * half; quotes at r -/+ half."""
        sig = math.sqrt(self.var[coin] or 0.0) * math.sqrt(VOL_WINDOW_S)       # 1-minute volatility
        half = max(MIN_HALF_BPS / 1e4, VOL_MULT * sig) * mid
        q = self.st["inv"][coin] * mid / (CLIP_USD * MAX_CLIPS)                  # -1 .. +1
        r = mid - SKEW * q * half
        return r - half, r + half

    def equity(self, mids: dict[str, float]) -> float:
        return self.st["cash"] + sum(self.st["inv"][c] * mids.get(c, 0.0) for c in COINS)

    # -- simulation step --------------------------------------------------------
    def _fill(self, coin: str, is_buy: bool, size: float, px: float, fee_rate: float) -> None:
        self.st["inv"][coin] += size if is_buy else -size
        self.st["cash"] -= (size * px) if is_buy else -(size * px)
        fee = size * px * fee_rate
        self.st["cash"] -= fee
        self.st["fees"] += fee
        self.st["fills"] += 1
        self.st["volume"] += size * px

    def step(self, t: float | None = None) -> None:
        t = t or time.time()
        mids = {}
        for coin in COINS:
            q = self.feed.quote(coin)
            if q is None or q.age > STALE_S:
                self.quotes.pop(coin, None)              # no fresh book: pull our quotes
                continue
            bid, ask = q.bid, q.ask
            mid = (bid + ask) / 2
            mids[coin] = mid
            self._update_vol(coin, mid, t)
            # 1) did the market trade through our resting quotes?
            cur = self.quotes.get(coin)
            if cur and not self.st["stopped"]:
                if cur.get("bid") and ask < cur["bid"]:
                    self._fill(coin, True, cur["bid_sz"], cur["bid"], self.maker)
                    self._event(coin, "buy", cur["bid_sz"], cur["bid"])
                if cur.get("ask") and bid > cur["ask"]:
                    self._fill(coin, False, cur["ask_sz"], cur["ask"], self.maker)
                    self._event(coin, "sell", cur["ask_sz"], cur["ask"])
            # 2) requote
            if self.st["stopped"] or self.var[coin] is None:
                self.quotes.pop(coin, None)
                continue
            b, a = self.target_quotes(coin, mid)
            b, a = min(b, bid), max(a, ask)              # post-only: never cross the book
            sz = round(CLIP_USD / mid, self.szd[coin])
            inv_clips = self.st["inv"][coin] * mid / CLIP_USD
            self.quotes[coin] = {"bid": b if inv_clips < MAX_CLIPS - 0.5 else None, "bid_sz": sz,
                                 "ask": a if inv_clips > -(MAX_CLIPS - 0.5) else None, "ask_sz": sz}
        if len(mids) == len(COINS):
            eq = self.equity(mids)
            if not self.st["stopped"] and eq < KILL_FRAC * self.st["start"]:
                self._flatten(mids, "kill switch")
            if t - self._last_eq > 300:
                self.db.record_equity(MODE, self.equity(mids))
                self._last_eq = t
        if t - self._last_save > 10:
            self.db.set_state("mm:state", self.st)
            self.db.set_state("mm:quotes", {"ts": now_ms(), "quotes": self.quotes,
                                            "vol_1m": {c: math.sqrt(v * VOL_WINDOW_S) if v else None
                                                       for c, v in self.var.items()}})
            self._last_save = t

    def _flatten(self, mids: dict[str, float], why: str) -> None:
        for coin in COINS:
            q = self.st["inv"][coin]
            if abs(q) > 0:
                self._fill(coin, q < 0, abs(q), mids[coin] * (1.001 if q < 0 else 0.999), self.taker)
        self.st["stopped"] = True
        self.quotes.clear()
        self.db.log_event("mm_stop", {"reason": why, "equity": self.equity(mids)}, MODE)
        log.warning("market maker stopped: %s", why)

    def _event(self, coin: str, side: str, sz: float, px: float) -> None:
        self.db.log_event("mm_fill", {"coin": coin, "side": side, "sz": sz, "px": px,
                                      "inv": self.st["inv"][coin]}, MODE)

    def hourly_funding(self, rates: dict[str, float], mids: dict[str, float]) -> None:
        """Longs pay positive funding, shorts receive it."""
        for c in COINS:
            if c in rates and c in mids:
                cost = self.st["inv"][c] * mids[c] * rates[c]
                self.st["cash"] -= cost
                self.st["funding"] += cost

    # -- thread -----------------------------------------------------------------
    def run_forever(self) -> None:
        while not self._stop.is_set():
            try:
                self.step()
            except Exception:  # noqa: BLE001
                log.exception("market maker step failed")
            self._stop.wait(LOOP_S)

    def start(self) -> threading.Thread:
        th = threading.Thread(target=self.run_forever, name="mm", daemon=True)
        th.start()
        return th
