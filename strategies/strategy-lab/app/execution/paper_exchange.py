"""Paper exchange: simulates Hyperliquid order handling against live quotes.

No order ever leaves the machine. State (balance, positions, resting orders,
fills) is persisted in the database so restart recovery and reconciliation are
exercised exactly as they would be against a real venue.
"""
from __future__ import annotations

import logging
import threading
from typing import Callable

from app.backtest.simulator import FillParams
from app.execution.adapter import (ExchangeAdapter, ExchangeOrder, ExchangePosition, Fill, OrderAck)
from app.storage.database import Database, now_ms

log = logging.getLogger(__name__)

STATE_KEY = "paper_exchange"

QuoteFn = Callable[[str], tuple[float, float] | None]


class PaperExchange(ExchangeAdapter):
    mode = "paper"
    supports_protective_orders = True

    def __init__(self, db: Database, fp: FillParams, starting_balance: float, quote_fn: QuoteFn,
                 book: str | None = None, depth_fn=None):
        # Each book is an independent simulated account (separate balance, positions, DB mode).
        self.mode = "paper" if book is None else f"paper-{book}"
        self.state_key = STATE_KEY if book is None else f"{STATE_KEY}:{book}"
        self.db = db
        self.fp = fp
        self.quote_fn = quote_fn
        # depth_fn(coin) -> (bids, asks), each [(px, size), ...] best first. When set, taker fills walk
        # the real order book instead of applying the flat slippage assumption.
        self.depth_fn = depth_fn
        self._lock = threading.RLock()
        st = db.get_state(self.state_key)
        if st is None:
            st = {"balance": starting_balance, "positions": {}, "orders": [], "fills": [], "next_oid": 1}
            db.set_state(self.state_key, st)
        self.st = st

    # -- persistence ------------------------------------------------------
    def _save(self) -> None:
        self.st["fills"] = self.st["fills"][-500:]
        self.db.set_state(self.state_key, self.st)

    def _oid(self) -> int:
        oid = self.st["next_oid"]
        self.st["next_oid"] += 1
        return oid

    # -- reads ------------------------------------------------------------
    def get_equity(self) -> float:
        with self._lock:
            eq = self.st["balance"]
            for m, p in self.st["positions"].items():
                q = self.quote_fn(m)
                if q:
                    mid = (q[0] + q[1]) / 2
                    eq += p["size"] * (mid - p["entry_px"])
            return eq

    def get_positions(self) -> dict[str, ExchangePosition]:
        with self._lock:
            return {m: ExchangePosition(m, p["size"], p["entry_px"]) for m, p in self.st["positions"].items()}

    def get_open_orders(self) -> list[ExchangeOrder]:
        with self._lock:
            return [ExchangeOrder(o["cloid"], o["oid"], o["market"], o["is_buy"], o["size"], o.get("limit_px"),
                                  o.get("trigger_px"), o["reduce_only"], o["kind"]) for o in self.st["orders"]]

    def get_fills(self, since_ms: int) -> list[Fill]:
        with self._lock:
            return [Fill(f["cloid"], f["oid"], f["market"], f["is_buy"], f["size"], f["px"], f["fee"], f["ts"],
                         {"reason": f.get("reason")}) for f in self.st["fills"] if f["ts"] >= since_ms]

    # -- position accounting ---------------------------------------------
    def _apply_fill(self, market: str, is_buy: bool, size: float, px: float, fee: float, cloid: str | None,
                    oid: int, reason: str) -> None:
        signed = size if is_buy else -size
        pos = self.st["positions"].get(market)
        if pos is None:
            self.st["positions"][market] = {"size": signed, "entry_px": px}
        else:
            new = pos["size"] + signed
            if pos["size"] * signed > 0:          # adding
                pos["entry_px"] = (pos["entry_px"] * abs(pos["size"]) + px * size) / abs(new)
                pos["size"] = new
            else:                                  # reducing / closing
                closed = min(size, abs(pos["size"]))
                direction = 1 if pos["size"] > 0 else -1
                self.st["balance"] += direction * (px - pos["entry_px"]) * closed
                if abs(new) < 1e-12:
                    del self.st["positions"][market]
                else:
                    pos["size"] = new
        self.st["balance"] -= fee
        self.st["fills"].append({"cloid": cloid, "oid": oid, "market": market, "is_buy": is_buy, "size": size,
                                 "px": px, "fee": fee, "ts": now_ms(), "reason": reason})

    def _reduce_only_size(self, market: str, is_buy: bool, size: float) -> float:
        pos = self.st["positions"].get(market)
        if not pos:
            return 0.0
        if (pos["size"] > 0 and is_buy) or (pos["size"] < 0 and not is_buy):
            return 0.0
        return min(size, abs(pos["size"]))

    # -- orders -----------------------------------------------------------
    def place_entry(self, market: str, is_buy: bool, size: float, limit_px: float, cloid: str,
                    maker: bool = False) -> OrderAck:
        """IOC taker entry. maker=True simulates a resting limit order that the caller has already seen
        the market trade through: it fills at exactly limit_px and pays the maker fee."""
        with self._lock:
            if any(f["cloid"] == cloid for f in self.st["fills"]):
                return OrderAck("rejected", error="duplicate cloid")
            q = self.quote_fn(market)
            if q is None:
                return OrderAck("rejected", error="no fresh quote")
            bid, ask = q
            if maker:
                px = limit_px
                if (is_buy and ask >= limit_px) or (not is_buy and bid <= limit_px):
                    return OrderAck("rejected", error=f"maker entry: market has not traded through {limit_px}")
            elif self.depth_fn is not None:
                walked = self._walk(market, is_buy, size, limit_px)
                if walked is None:
                    return OrderAck("rejected", error=f"IOC: no liquidity within limit {limit_px}")
                px, size = walked
            else:
                px = ask * (1 + self.fp.slippage) if is_buy else bid * (1 - self.fp.slippage)
                if (is_buy and px > limit_px) or (not is_buy and px < limit_px):
                    return OrderAck("rejected", error=f"IOC not marketable within limit {limit_px} (would fill {px})")
            oid = self._oid()
            fee = px * size * (self.fp.maker_fee if maker else self.fp.taker_fee)
            self._apply_fill(market, is_buy, size, px, fee, cloid, oid, "entry")
            self._save()
            return OrderAck("filled", oid=oid, filled_size=size, avg_px=px)

    def _rest(self, market: str, is_buy: bool, size: float, cloid: str, kind: str,
              limit_px: float | None = None, trigger_px: float | None = None) -> OrderAck:
        with self._lock:
            if any(o["cloid"] == cloid for o in self.st["orders"]):
                return OrderAck("rejected", error="duplicate cloid")
            if self._reduce_only_size(market, is_buy, size) <= 0:
                return OrderAck("rejected", error="reduce-only order would not reduce a position")
            oid = self._oid()
            self.st["orders"].append({"cloid": cloid, "oid": oid, "market": market, "is_buy": is_buy, "size": size,
                                      "limit_px": limit_px, "trigger_px": trigger_px, "reduce_only": True,
                                      "kind": kind, "ts": now_ms()})
            self._save()
            return OrderAck("resting", oid=oid)

    def place_stop(self, market: str, is_buy: bool, size: float, trigger_px: float, cloid: str) -> OrderAck:
        return self._rest(market, is_buy, size, cloid, "stop", trigger_px=trigger_px)

    def place_take_profit(self, market: str, is_buy: bool, size: float, limit_px: float, cloid: str) -> OrderAck:
        return self._rest(market, is_buy, size, cloid, "take_profit", limit_px=limit_px)

    def cancel(self, market: str, cloid: str) -> bool:
        with self._lock:
            before = len(self.st["orders"])
            self.st["orders"] = [o for o in self.st["orders"] if o["cloid"] != cloid]
            self._save()
            return len(self.st["orders"]) < before

    def _walk(self, market: str, is_buy: bool, size: float, limit_px: float | None):
        """VWAP of taking `size` from the book up to limit_px. Returns (px, filled) or None.
        Without a limit (closes), anything beyond the visible book fills at the last level + slippage."""
        try:
            bids, asks = self.depth_fn(market)
        except Exception:  # noqa: BLE001
            return None
        levels = asks if is_buy else bids
        left, cost = size, 0.0
        for px, sz in levels:
            if limit_px is not None and ((is_buy and px > limit_px) or (not is_buy and px < limit_px)):
                break
            take = min(left, sz)
            cost += take * px
            left -= take
            if left <= 1e-12:
                break
        if left > 1e-12 and limit_px is None and levels:
            last = levels[-1][0] * (1 + self.fp.slippage if is_buy else 1 - self.fp.slippage)
            cost += left * last
            left = 0.0
        filled = size - left
        if filled <= 1e-12:
            return None
        return cost / filled, filled

    def close_position(self, market: str, cloid: str) -> OrderAck:
        with self._lock:
            pos = self.st["positions"].get(market)
            if not pos:
                return OrderAck("rejected", error="no position")
            q = self.quote_fn(market)
            if q is None:
                return OrderAck("error", error="no fresh quote; cannot close")
            bid, ask = q
            is_buy = pos["size"] < 0
            size = abs(pos["size"])
            walked = self._walk(market, is_buy, size, None) if self.depth_fn is not None else None
            px = walked[0] if walked else (ask * (1 + self.fp.slippage) if is_buy else bid * (1 - self.fp.slippage))
            oid = self._oid()
            self._apply_fill(market, is_buy, size, px, px * size * self.fp.taker_fee, cloid, oid, "close")
            self._save()
            return OrderAck("filled", oid=oid, filled_size=size, avg_px=px)

    # -- simulation hooks -------------------------------------------------
    def on_quote(self, market: str, bid: float, ask: float) -> list[Fill]:
        """Trigger resting stops/targets against a fresh quote."""
        fired: list[Fill] = []
        with self._lock:
            for o in list(self.st["orders"]):
                if o["market"] != market:
                    continue
                px = None
                if o["kind"] == "stop":
                    if not o["is_buy"] and bid <= o["trigger_px"]:
                        px = bid * (1 - self.fp.slippage)
                    elif o["is_buy"] and ask >= o["trigger_px"]:
                        px = ask * (1 + self.fp.slippage)
                    fee_rate = self.fp.taker_fee
                else:
                    if not o["is_buy"] and bid > o["limit_px"]:
                        px = o["limit_px"]
                    elif o["is_buy"] and ask < o["limit_px"]:
                        px = o["limit_px"]
                    fee_rate = self.fp.maker_fee
                if px is None:
                    continue
                size = self._reduce_only_size(market, o["is_buy"], o["size"])
                self.st["orders"].remove(o)
                if size <= 0:
                    continue
                self._apply_fill(market, o["is_buy"], size, px, px * size * fee_rate, o["cloid"], o["oid"], o["kind"])
                fired.append(Fill(o["cloid"], o["oid"], market, o["is_buy"], size, px, px * size * fee_rate, now_ms()))
            if fired:
                self._save()
        return fired

    def accrue_funding(self, market: str, mark_px: float, hourly_rate: float) -> float:
        """Charge one hour of funding. Returns the cost (positive = paid)."""
        with self._lock:
            pos = self.st["positions"].get(market)
            if not pos:
                return 0.0
            cost = pos["size"] * mark_px * hourly_rate
            self.st["balance"] -= cost
            self._save()
            return cost
