"""Paper books for EXP-009 (OU mean reversion + Monte Carlo exits) and EXP-010 (Hurst regime switch).

Both share PaperBook: own $100 simulated account, every order through the order manager (verified
stops, maker take-profits), optional maker entries that fill only once the market trades through
the limit, and time stops. Signal maths lives in app/montecarlo.py so the backtest uses the same code.
Paper only.
"""
from __future__ import annotations

import logging
import math
import time
from typing import Any

import numpy as np
import requests

from app.backtest.simulator import FillParams
from app.data.market_metadata import parse_markets, round_size_down
from app.execution.adapter import make_cloid
from app.execution.order_manager import OrderError, OrderManager
from app.execution.paper_exchange import PaperExchange
from app.execution.position_manager import PositionManager
from app.execution.reconciliation import reconcile
from app.monitoring.alerts import Notifier
from app import fast_trend as ft
from app.montecarlo import fit_ou, hurst, mc_levels
from app.risk.circuit_breaker import CircuitBreaker
from app.storage.database import Database, now_ms
from app.storage.models import RiskDecision

log = logging.getLogger(__name__)
INFO = "https://api.hyperliquid.xyz/info"
MIN_NOTIONAL = 10.0
HOUR = 3_600_000
IOC_TICKS = 3


class PaperBook:
    book = "base"
    max_positions = 5

    def __init__(self, cfg, db: Database, info, fp: FillParams, coins: list[str]):
        self.cfg, self.db, self.info, self.fp, self.coins = cfg, db, info, fp, coins
        self.s = requests.Session()
        self._quotes: dict[str, tuple[float, float, float]] = {}
        self._depth: dict[str, tuple[list, list]] = {}
        self.ex = PaperExchange(db, fp, cfg.account.starting_balance, self.quote, book=self.book,
                                depth_fn=self.depth)
        self.mode = self.ex.mode
        self.notify = Notifier(db, self.mode)
        self.breaker = CircuitBreaker(db, self.mode, max_api_errors=10)
        self.infos: dict = {}
        # Entries: IOC limit IOC_TICKS ticks through the touch, filled against the real book (latency-aware:
        # a fast move past the limit leaves the order unfilled instead of chasing the price).
        self.om = OrderManager(self.ex, db, self.breaker, self.infos, self.notify, max_slippage_bps=30,
                               max_open_positions=self.max_positions, ioc_ticks=IOC_TICKS)
        self.pm = PositionManager(self.ex, db, self.om, self.breaker, self.notify, max_hold_hours=24 * 365,
                                  leverage=cfg.trading.max_leverage)
        self._last_equity = 0

    # -- plumbing -----------------------------------------------------------
    def _fetch_book(self, coin: str) -> bool:
        try:
            book = self.s.post(INFO, json={"type": "l2Book", "coin": coin}, timeout=10).json()
            bids = [(float(x["px"]), float(x["sz"])) for x in book["levels"][0]]
            asks = [(float(x["px"]), float(x["sz"])) for x in book["levels"][1]]
            if not bids or not asks:
                return False
            self._quotes[coin] = (bids[0][0], asks[0][0], time.time())
            self._depth[coin] = (bids, asks)
            return True
        except Exception:  # noqa: BLE001
            return False

    def quote(self, coin: str):
        q = self._quotes.get(coin)
        if not (q and time.time() - q[2] < 20) and not self._fetch_book(coin):
            return None
        q = self._quotes[coin]
        return q[0], q[1]

    def depth(self, coin: str) -> tuple[list, list]:
        if coin not in self._depth or time.time() - self._quotes.get(coin, (0, 0, 0))[2] >= 20:
            if not self._fetch_book(coin):
                raise LookupError(f"no order book for {coin}")
        return self._depth[coin]

    def refresh_metadata(self) -> None:
        meta, ctxs = self.info.meta_and_ctxs()
        keep = [(a, c) for a, c in zip(meta["universe"], ctxs)
                if not a.get("isDelisted") and int(a["maxLeverage"]) >= 2]
        names = tuple(a["name"] for a, _ in keep)
        self.infos.clear()
        self.infos.update(parse_markets({"universe": [a for a, _ in keep]}, [c for _, c in keep], names))

    def startup(self) -> None:
        self.refresh_metadata()
        rep = reconcile(self.ex, self.db, self.om, self.pm, self.breaker)
        self.notify("info" if rep.ok else "critical", "startup",
                    f"{self.book} book started; reconciliation {'ok' if rep.ok else 'FAILED'}")
        self.db.record_equity(self.mode, self.ex.get_equity())

    def candles(self, coin: str, interval: str, bars: int) -> list[dict[str, Any]]:
        step = {"1h": HOUR, "4h": 4 * HOUR}[interval]
        now = now_ms()
        rows = self.info.candles(coin, interval, now - (bars + 2) * step, now)
        return [r for r in rows if r["close_t"] <= now]          # completed bars only

    def _state(self, key: str) -> dict:
        return self.db.get_state(f"{self.book}:{key}") or {}

    def _set(self, key: str, value: dict) -> None:
        self.db.set_state(f"{self.book}:{key}", value)

    def _record_equity(self, force: bool = False) -> None:
        if force or now_ms() - self._last_equity > 300_000:
            self.db.record_equity(self.mode, self.ex.get_equity())
            self._last_equity = now_ms()

    # -- orders -------------------------------------------------------------
    def open(self, coin: str, long: bool, entry: float, stop: float, target: float | None,
             deadline_ms: int, meta: dict, maker: bool, notional: float | None = None) -> int | None:
        equity = self.ex.get_equity()
        info = self.infos[coin]
        size = round_size_down((notional or equity / self.max_positions) / entry, info.sz_decimals)
        if size * entry < MIN_NOTIONAL:
            return None
        risk = abs(entry - stop) / entry
        d = RiskDecision(approved=True, reasons=[], market=coin, direction="long" if long else "short",
                         entry=entry, stop=stop, target=target, size=size, notional=size * entry,
                         margin=size * entry / self.cfg.trading.max_leverage, leverage=size * entry / equity,
                         planned_risk=size * entry * (risk + 2 * self.fp.taker_fee + 0.002))
        try:
            tid = self.om.open_position(d, None, time.time_ns(), place_tp=target is not None, maker=maker)
        except OrderError as e:
            log.info("%s: %s refused: %s", self.book, coin, e)
            return None
        if tid:
            exits = self._state("exits")
            exits[str(tid)] = {"deadline": deadline_ms, **meta}
            self._set("exits", exits)
        return tid

    def close(self, t: dict, kind: str) -> None:
        cloid = make_cloid(f"{self.book}_{kind}", self.mode, t["id"], now_ms())
        self.om.cancel_trade_orders(t["id"], t["market"])
        self.db.upsert_order({"cloid": cloid, "mode": self.mode, "trade_id": t["id"], "market": t["market"],
                              "side": "close", "kind": kind, "size": t["size"], "reduce_only": True,
                              "status": "submitting"})
        self.ex.close_position(t["market"], cloid)

    # -- periodic -------------------------------------------------------------
    def poll(self) -> None:
        """Every minute: fresh quotes for stops/targets, maker-entry fills, time stops."""
        held = {t["market"] for t in self.pm.open_trades()}
        for m in held:
            q = self.quote(m)
            if q:
                self.ex.on_quote(m, *q)
        self.pm.sync()
        exits = self._state("exits")
        open_ids = set()
        for t in self.pm.open_trades():
            open_ids.add(str(t["id"]))
            e = exits.get(str(t["id"]))
            if e and now_ms() >= e["deadline"]:
                self.close(t, "time")
                self.notify("info", f"{self.book}", f"{self.book}: time stop {t['market']}")
        if set(exits) - open_ids:
            self._set("exits", {k: v for k, v in exits.items() if k in open_ids})
        self.pm.sync()
        self._fill_pending()
        self._record_equity()

    def _fill_pending(self) -> None:
        pend = self._state("pending")
        if not pend:
            return
        keep = {}
        held = {t["market"] for t in self.pm.open_trades()}
        for coin, p in pend.items():
            if now_ms() >= p["expires"] or coin in held or self.breaker.is_halted():
                continue
            q = self.quote(coin)
            if q is None:
                keep[coin] = p
                continue
            bid, ask = q
            through = ask < p["px"] if p["long"] else bid > p["px"]
            if not through:
                keep[coin] = p
                continue
            tid = self.open(coin, p["long"], p["px"], p["stop"], p["target"], p["deadline"], p["meta"], maker=True)
            if tid:
                self.notify("info", self.book, f"{self.book}: maker fill {coin} "
                                               f"{'long' if p['long'] else 'short'} @ {p['px']:.6g}")
        self._set("pending", keep)

    def slots(self) -> int:
        return self.max_positions - len(self.pm.open_trades()) - len(self._state("pending"))

    def hourly_funding(self) -> None:
        for t in self.pm.open_trades():
            info, q = self.infos.get(t["market"]), self.quote(t["market"])
            if info and q:
                cost = self.ex.accrue_funding(t["market"], sum(q) / 2, info.funding_rate_hourly or 0.0)
                self.db.add_trade_funding(t["id"], cost)


# == EXP-009: Ornstein-Uhlenbeck mean reversion with Monte Carlo exits =========
MR_FIT_BARS, MR_Z_ENTER, MR_HL_MIN, MR_HL_MAX = 720, 2.0, 6.0, 72.0
MR_PENDING_HOURS = 1


def mr_signal(log_ratio: np.ndarray, fp: FillParams, seed: int = 0) -> dict | None:
    """Fit OU to the last 720 hourly log(coin/BTC) values; trade |z| >= 2 if the half-life is 6-72 h and
    the Monte Carlo finds exit levels with positive expected value after costs."""
    ou = fit_ou(log_ratio[-MR_FIT_BARS:])
    if ou is None or not MR_HL_MIN <= ou.half_life <= MR_HL_MAX:
        return None
    z0 = (log_ratio[-1] - ou.mu) / ou.sigma_eq
    if abs(z0) < MR_Z_ENTER:
        return None
    slip = 0.001
    lv = mc_levels(ou, z0, cost_tp=2 * fp.maker_fee, cost_stop=fp.maker_fee + fp.taker_fee + slip,
                   cost_time=fp.maker_fee + fp.taker_fee + slip, seed=seed)
    if lv is None:
        return None
    return {"ou": ou, "z0": z0, "levels": lv, "long": z0 < 0}


class MeanRevBook(PaperBook):
    book = "meanrev"
    max_positions = 5

    def step(self) -> list[str]:
        """Hourly, after the 1h candle closes."""
        if self.breaker.is_halted():
            return []
        actions = []
        btc = {r["t"]: r["c"] for r in self.candles("BTC", "1h", MR_FIT_BARS + 5)}
        held = {t["market"] for t in self.pm.open_trades()}
        pend = self._state("pending")
        cands = []
        for coin in self.coins:
            if coin == "BTC" or coin in held or coin in pend or coin not in self.infos:
                continue
            try:
                rows = self.candles(coin, "1h", MR_FIT_BARS + 5)
            except Exception:  # noqa: BLE001
                continue
            pairs = [(r["c"], btc[r["t"]]) for r in rows if r["t"] in btc]
            if len(pairs) < MR_FIT_BARS * 0.9:
                continue
            x = np.log([a for a, _ in pairs]) - np.log([b for _, b in pairs])
            sig = mr_signal(x, self.fp, seed=int(now_ms() // HOUR))
            if sig:
                cands.append((sig["levels"].ev, coin, sig, x[-1], math.log(pairs[-1][1])))
            time.sleep(0.1)
        cands.sort(reverse=True)
        for ev, coin, sig, x_last, log_btc in cands:
            if self.slots() <= 0:
                break
            q = self.quote(coin)
            if q is None:
                continue
            ou, lv, z0 = sig["ou"], sig["levels"], sig["z0"]
            sgn = 1 if z0 > 0 else -1
            to_px = lambda z: math.exp(ou.mu + z * ou.sigma_eq + log_btc)   # noqa: E731  (BTC held fixed)
            scale = (q[0] + q[1]) / 2 / to_px(z0)          # anchor the model to the live price
            target, stop = to_px(sgn * lv.tp_z) * scale, to_px(sgn * lv.stop_z) * scale
            long = sig["long"]
            px = q[0] if long else q[1]                   # join the best bid (long) / ask (short)
            pend = self._state("pending")
            pend[coin] = {"long": long, "px": px, "stop": stop, "target": target,
                          "expires": now_ms() + MR_PENDING_HOURS * HOUR,
                          "deadline": now_ms() + int(lv.horizon * HOUR),
                          "meta": {"z0": round(z0, 2), "half_life_h": round(ou.half_life, 1),
                                   "tp_z": lv.tp_z, "stop_z": lv.stop_z, "ev": round(lv.ev, 5),
                                   "p_tp": round(lv.p_tp, 2)}}
            self._set("pending", pend)
            actions.append(f"bid {coin} {'long' if long else 'short'} @ {px:.6g} (z={z0:+.1f}, "
                           f"HL={ou.half_life:.0f}h, TP {target:.6g}, stop {stop:.6g}, P(tp)={lv.p_tp:.0%})")
        if actions:
            self.db.log_event("meanrev_step", {"actions": actions}, self.mode)
            self.notify("info", self.book, "meanrev: " + "; ".join(actions))
        self._record_equity(force=True)
        return actions


# == EXP-010: Hurst regime switch ===============================================
H_BARS, H_TREND, H_REVERT = 360, 0.55, 0.43
TREND_STOP_ATR, TREND_TP_ATR, TREND_DAYS, TREND_FRESH_BARS = 2.0, 4.0, 10, 6
REV_Z, REV_STOP_ATR, REV_DAYS, REV_OFFSET_ATR = 2.0, 1.5, 3, 0.25


def ema(x: np.ndarray, n: int) -> np.ndarray:
    a, out = 2 / (n + 1), np.empty(len(x))
    out[0] = x[0]
    for i in range(1, len(x)):
        out[i] = a * x[i] + (1 - a) * out[i - 1]
    return out


def atr(h: np.ndarray, lo: np.ndarray, c: np.ndarray, n: int = 14) -> float:
    tr = np.maximum(h[1:] - lo[1:], np.maximum(abs(h[1:] - c[:-1]), abs(lo[1:] - c[:-1])))
    return float(tr[-n:].mean())


def hurst_signal(h: np.ndarray, lo: np.ndarray, c: np.ndarray) -> dict | None:
    """Decide on the last completed 4h bar. Returns side, regime, entry reference, stop, target, days."""
    if len(c) < H_BARS:
        return None
    H = hurst(np.log(c[-H_BARS:]))
    if H is None:
        return None
    a = atr(h, lo, c)
    last = c[-1]
    if H >= H_TREND:
        f, s = ema(c, 10), ema(c, 30)
        side = 1 if f[-1] > s[-1] else -1
        diff = np.sign(f - s)
        fresh = (diff[-TREND_FRESH_BARS - 1:-1] != side).any()    # crossed within the last 24h
        if not fresh:
            return None
        return {"regime": "trend", "H": H, "long": side > 0, "ref": last, "maker": False,
                "stop": last - side * TREND_STOP_ATR * a, "target": last + side * TREND_TP_ATR * a,
                "days": TREND_DAYS}
    if H <= H_REVERT:
        win = c[-20:]
        mean, sd = win.mean(), win.std()
        if sd <= 0:
            return None
        z = (last - mean) / sd
        if abs(z) < REV_Z:
            return None
        side = -1 if z > 0 else 1
        px = last - side * REV_OFFSET_ATR * a          # rest a little beyond the close
        return {"regime": "revert", "H": H, "long": side > 0, "ref": px, "maker": True,
                "stop": px - side * REV_STOP_ATR * a, "target": mean, "days": REV_DAYS}
    return None


class HurstBook(PaperBook):
    book = "hurst"
    max_positions = 6

    def step(self) -> list[str]:
        """Every 4 hours, after the 4h candle closes."""
        if self.breaker.is_halted():
            return []
        actions = []
        held = {t["market"] for t in self.pm.open_trades()}
        pend = self._state("pending")
        for coin in self.coins:
            if self.slots() <= 0:
                break
            if coin in held or coin in pend or coin not in self.infos:
                continue
            try:
                rows = self.candles(coin, "4h", H_BARS + 5)
            except Exception:  # noqa: BLE001
                continue
            h = np.array([r["h"] for r in rows]); lo = np.array([r["l"] for r in rows])
            c = np.array([r["c"] for r in rows])
            sig = hurst_signal(h, lo, c)
            time.sleep(0.1)
            if not sig:
                continue
            meta = {"regime": sig["regime"], "H": round(sig["H"], 3)}
            deadline = now_ms() + sig["days"] * 86_400_000
            if sig["maker"]:
                pend = self._state("pending")
                pend[coin] = {"long": sig["long"], "px": sig["ref"], "stop": sig["stop"], "target": sig["target"],
                              "expires": now_ms() + 4 * HOUR, "deadline": deadline, "meta": meta}
                self._set("pending", pend)
                actions.append(f"bid {coin} {'long' if sig['long'] else 'short'} @ {sig['ref']:.6g} "
                               f"(revert, H={sig['H']:.2f})")
            else:
                q = self.quote(coin)
                if q is None:
                    continue
                px = q[1] if sig["long"] else q[0]
                shift = px - sig["ref"]                     # keep the ATR distances from the live price
                if self.open(coin, sig["long"], px, sig["stop"] + shift, sig["target"] + shift, deadline, meta,
                             maker=False):
                    actions.append(f"open {coin} {'long' if sig['long'] else 'short'} (trend, H={sig['H']:.2f})")
        if actions:
            self.db.log_event("hurst_step", {"actions": actions}, self.mode)
            self.notify("info", self.book, "hurst: " + "; ".join(actions))
        self._record_equity(force=True)
        return actions


# == EXP-013 C3: funding contrarian (passed the strategy search) ==================
FC_K, FC_HOLD_DAYS, FC_WEIGHT, FC_LOOKBACK_DAYS, FC_DISASTER_STOP = 5, 3, 0.10, 3, 0.25


def funding_targets(mean_funding: dict[str, float], k: int = FC_K) -> dict[str, bool]:
    """coin -> long? Short the k highest trailing funding, long the k lowest."""
    if len(mean_funding) < 2 * k:
        return {}
    ranked = sorted(mean_funding, key=lambda c: mean_funding[c])
    return {**{c: True for c in ranked[:k]}, **{c: False for c in ranked[-k:]}}


class FundingBook(PaperBook):
    """Every 3 days: rank universe coins by their trailing 3-day mean Hyperliquid funding; hold the
    10 legs (0.1 x equity each, at least the $10 exchange minimum) until the next rebalance.
    A 25% disaster stop is a safety net only; the strategy itself has no stop."""
    book = "funding"
    max_positions = 2 * FC_K

    def due(self) -> bool:
        last = self._state("rebalance").get("ts", 0)
        return now_ms() - last >= FC_HOLD_DAYS * 86_400_000 - HOUR

    def open(self, coin, long, entry, stop, target, deadline_ms, meta, maker):  # noqa: D401
        """Fixed 0.1 x equity per leg, rounded up to the $10 minimum."""
        info = self.infos[coin]
        notional = max(FC_WEIGHT * self.ex.get_equity(), MIN_NOTIONAL * 1.02)
        step = 10 ** -info.sz_decimals
        size = round(math.ceil(notional / entry / step) * step, info.sz_decimals)
        risk = abs(entry - stop) / entry
        d = RiskDecision(approved=True, reasons=[], market=coin, direction="long" if long else "short",
                         entry=entry, stop=stop, target=None, size=size, notional=size * entry,
                         margin=size * entry / self.cfg.trading.max_leverage,
                         leverage=size * entry / self.ex.get_equity(),
                         planned_risk=size * entry * (risk + 2 * self.fp.taker_fee + 0.002))
        try:
            return self.om.open_position(d, None, time.time_ns(), place_tp=False)
        except OrderError as e:
            log.info("funding: %s refused: %s", coin, e)
            return None

    def mean_funding(self) -> dict[str, float]:
        start = now_ms() - FC_LOOKBACK_DAYS * 86_400_000
        out = {}
        for c in self.coins:
            if c not in self.infos:
                continue
            try:
                rows = self.info.funding_history(c, start)
            except Exception:  # noqa: BLE001
                continue
            if len(rows) >= FC_LOOKBACK_DAYS * 20:            # hourly funding: allow a few gaps
                out[c] = sum(r for _, r in rows) / len(rows)
            time.sleep(0.1)
        return out

    def step(self, force: bool = False) -> list[str]:
        if self.breaker.is_halted() or not (force or self.due()):
            return []
        mf = self.mean_funding()
        want = funding_targets(mf)
        if not want:
            return []
        actions = []
        for t in self.pm.open_trades():
            if want.get(t["market"]) != (t["direction"] == "long"):
                self.close(t, "rebalance")
                actions.append(f"close {t['market']}")
        self.pm.sync()
        held = {t["market"] for t in self.pm.open_trades()}
        for c, long in want.items():
            if c in held:
                continue
            q = self.quote(c)
            if q is None:
                continue
            px = q[1] if long else q[0]
            stop = px * (1 - FC_DISASTER_STOP) if long else px * (1 + FC_DISASTER_STOP)
            if self.open(c, long, px, stop, None, 0, {}, maker=False):
                actions.append(f"open {c} {'long' if long else 'short'} (funding {mf[c] * 24 * 365:+.0%}/yr)")
        self._set("rebalance", {"ts": now_ms(), "targets": want,
                                "funding_apr": {c: round(mf[c] * 24 * 365, 3) for c in want}})
        if actions:
            self.db.log_event("funding_step", {"actions": actions}, self.mode)
            self.notify("info", self.book, "funding: " + "; ".join(actions))
        self._record_equity(force=True)
        return actions


# == EXP-024: fast trend (4H trend filter + 1H breakout, ATR trailing stop) =========
class FastTrendBook(PaperBook):
    """Hourly on BTC/ETH: enter 1H breakouts in the 4H trend direction; the stop trails once +1R.
    Rules and the backtest live in app/fast_trend.py."""
    book = "fasttrend"
    max_positions = 2

    def _arrays(self, rows: list[dict]) -> tuple[np.ndarray, ...]:
        return tuple(np.array([r[k] for r in rows], dtype=float) for k in ("h", "l", "c"))

    def _cooling(self, coin: str) -> bool:
        last = self.db.query("SELECT closed_ms FROM trades WHERE mode=? AND market=? AND status='closed' "
                             "ORDER BY closed_ms DESC LIMIT 1", (self.mode, coin))
        return bool(last) and now_ms() - (last[0]["closed_ms"] or 0) < ft.COOLDOWN_HOURS * HOUR

    def step(self) -> list[str]:
        """Hourly, after the 1h candle closes."""
        if self.breaker.is_halted():
            return []
        actions = []
        open_by = {t["market"]: t for t in self.pm.open_trades()}
        for coin in self.coins:
            if coin not in self.infos:
                continue
            try:
                h4, l4, c4 = self._arrays(self.candles(coin, "4h", ft.H4_WARMUP + 60))
                h1, l1, c1 = self._arrays(self.candles(coin, "1h", ft.BREAKOUT_BARS + 5))
            except Exception:  # noqa: BLE001
                log.exception("fasttrend: candles %s", coin)
                continue
            t = open_by.get(coin)
            if t:
                if not ft.trend_still_aligned(c4, t["direction"] == "long"):
                    self.close(t, "trend_exit")
                    actions.append(f"close {coin} (4H trend turned)")
                continue
            if self.slots() <= 0 or self._cooling(coin):
                continue
            sig = ft.signal(h1, l1, c1, h4, l4, c4)
            if not sig:
                continue
            q = self.quote(coin)
            if q is None:
                continue
            px = q[1] if sig.long else q[0]
            stop = px - sig.stop_dist if sig.long else px + sig.stop_dist
            equity = self.ex.get_equity()
            notional = min(ft.RISK * equity / (sig.stop_dist / px), ft.MAX_NOTIONAL_X * equity)
            meta = {"atr": sig.atr, "dist": sig.stop_dist, "best": px}
            if self.open(coin, sig.long, px, stop, None, now_ms() + ft.HOLD_DAYS * 86_400_000, meta,
                         maker=False, notional=max(notional, MIN_NOTIONAL * 1.02)):
                actions.append(f"open {coin} {'long' if sig.long else 'short'} ${notional:.0f} "
                               f"(1H {ft.BREAKOUT_BARS}h breakout, stop {stop:.6g})")
        self.pm.sync()
        if actions:
            self.db.log_event("fasttrend_step", {"actions": actions}, self.mode)
            self.notify("info", self.book, "fasttrend: " + "; ".join(actions))
        self._record_equity(force=True)
        return actions

    def poll(self) -> None:
        super().poll()
        self._label_trail_exits()
        self._trail()

    def _trail(self) -> None:
        exits = self._state("exits")
        changed = False
        for t in self.pm.open_trades():
            e = exits.get(str(t["id"]))
            q = self.quote(t["market"])
            if not e or not q or "atr" not in e:
                continue
            long = t["direction"] == "long"
            px = q[0] if long else q[1]                       # price we could exit at
            best = max(e["best"], px) if long else min(e["best"], px)
            if best != e["best"]:
                e["best"], changed = best, True
            new = ft.trail_stop(long, t["entry"], t["stop"], best, e["atr"], e["dist"])
            better = new > t["stop"] * 1.001 if long else new < t["stop"] * 0.999
            if better and self.om.move_stop(t["id"], t["market"], long, t["size"], new):
                trailed = self._state("trailed")
                trailed[str(t["id"])] = True
                self._set("trailed", trailed)
                self.db.log_event("fasttrend_trail", {"market": t["market"], "stop": new}, self.mode)
        if changed:
            self._set("exits", exits)

    def _label_trail_exits(self) -> None:
        """Stops that were trailed are recorded as trail_stop, like the other take-profit books."""
        trailed = self._state("trailed")
        if not trailed:
            return
        keep = {}
        for tid in trailed:
            row = self.db.query("SELECT status, exit_reason FROM trades WHERE id=?", (int(tid),))
            if not row or row[0]["status"] != "closed":
                keep[tid] = True
            elif row[0]["exit_reason"] == "stop":
                self.db.execute("UPDATE trades SET exit_reason='trail_stop' WHERE id=?", (int(tid),))
        self._set("trailed", keep)
