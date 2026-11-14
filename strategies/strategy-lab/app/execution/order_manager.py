"""Order lifecycle: entry -> verify fill -> place protection -> verify protection.

Guarantees:
- Each signal maps to one deterministic client order id; it is written to the
  database *before* submission, so a crash mid-submit is recoverable and a
  resubmission of the same signal is refused.
- An entry is "done" only when the exchange reports a position, never because
  the request was accepted. Partial fills are protected at the filled size.
- If a filled position cannot be verified as protected by a reduce-only stop,
  the system halts new entries and closes the position (emergency procedure).
"""
from __future__ import annotations

import logging
from typing import Callable

from app.data.market_metadata import round_price, tick_size
from app.execution.adapter import ExchangeAdapter, make_cloid
from app.risk.circuit_breaker import CircuitBreaker
from app.storage.database import Database, now_ms
from app.storage.models import MarketInfo, RiskDecision

log = logging.getLogger(__name__)

Notify = Callable[[str, str, str], None]   # (level, kind, message)
EPS = 1e-9


class OrderError(RuntimeError):
    pass


class OrderManager:
    def __init__(self, adapter: ExchangeAdapter, db: Database, breaker: CircuitBreaker,
                 infos: dict[str, MarketInfo], notify: Notify, max_slippage_bps: float,
                 max_open_positions: int = 1, ioc_ticks: int | None = None):
        self.ex = adapter
        self.db = db
        self.breaker = breaker
        self.infos = infos
        self.notify = notify
        self.max_slippage = max_slippage_bps / 1e4
        self.max_open = max_open_positions
        self.ioc_ticks = ioc_ticks      # set: IOC limit this many ticks through d.entry (the touch)
        self.mode = adapter.mode

    # -- helpers ----------------------------------------------------------
    def _record(self, **o) -> None:
        o.setdefault("mode", self.mode)
        self.db.upsert_order(o)

    def _order(self, cloid: str) -> dict | None:
        rows = self.db.query("SELECT * FROM orders WHERE cloid=?", (cloid,))
        return rows[0] if rows else None

    # -- entry ------------------------------------------------------------
    def open_position(self, d: RiskDecision, signal_id: int | None, signal_ts_ms: int,
                      place_tp: bool = True, maker: bool = False) -> int | None:
        """Returns the trade id, or None if nothing was filled."""
        if not d.approved:
            raise OrderError("refusing to execute a trade the risk engine did not approve")
        if self.breaker.is_halted():
            raise OrderError(f"trading halted: {self.breaker.reason()}")
        market, long = d.market, d.direction == "long"
        info = self.infos[market]
        cloid = make_cloid("entry", self.mode, market, signal_ts_ms)

        if self._order(cloid):
            raise OrderError(f"duplicate: an order for this signal already exists ({cloid})")
        positions = self.ex.get_positions()
        if market in positions:
            raise OrderError(f"exchange already reports an open {market} position")
        if len(positions) >= self.max_open:
            raise OrderError(f"exchange already reports {len(positions)} open position(s)")
        pending = self.db.orders(self.mode, ("submitting",))
        if any(o["kind"] == "entry" for o in pending):
            raise OrderError("an entry order is already in flight")

        if maker:       # paper only: a resting limit at d.entry that the market traded through
            limit_px = round_price(d.entry, info.sz_decimals, "down" if long else "up")
        elif self.ioc_ticks is not None:
            tick = tick_size(d.entry, info.sz_decimals)
            limit_px = round_price(d.entry + (1 if long else -1) * self.ioc_ticks * tick, info.sz_decimals,
                                   "up" if long else "down")
        else:
            limit_px = round_price(d.entry * (1 + self.max_slippage) if long else d.entry * (1 - self.max_slippage),
                                   info.sz_decimals, "up" if long else "down")
        # Write-ahead: the intent is on disk before the request leaves.
        self._record(cloid=cloid, market=market, side="buy" if long else "sell", kind="entry", size=d.size,
                     limit_px=limit_px, reduce_only=False, status="submitting")
        self.db.log_event("order_submit", {"cloid": cloid, "market": market, "size": d.size,
                                           "limit_px": limit_px, "stop": d.stop, "target": d.target,
                                           "planned_risk": d.planned_risk, "signal_id": signal_id},
                          self.mode)
        try:
            ack = (self.ex.place_entry(market, long, d.size, limit_px, cloid, maker=True) if maker
                   else self.ex.place_entry(market, long, d.size, limit_px, cloid))
            self.breaker.record_api_success()
        except Exception as e:  # noqa: BLE001
            self.breaker.record_api_error(str(e))
            self._record(cloid=cloid, market=market, side="buy" if long else "sell", kind="entry", size=d.size,
                         limit_px=limit_px, reduce_only=False, status="unknown")
            self.notify("critical", "order_error", f"{market} entry submit raised {e}; reconciliation required")
            raise
        self.db.log_event("order_ack", {"cloid": cloid, "status": ack.status, "error": ack.error,
                                        "filled": ack.filled_size}, self.mode)

        # Verify against actual exchange state, not the ack.
        pos = self.ex.get_positions().get(market)
        filled = abs(pos.size) if pos and ((pos.size > 0) == long) else 0.0
        if filled <= EPS:
            self._record(cloid=cloid, market=market, side="buy" if long else "sell", kind="entry", size=d.size,
                         limit_px=limit_px, reduce_only=False, status="unfilled", exchange_oid=ack.oid)
            self.notify("info", "entry_unfilled", f"{market} entry not filled ({ack.status}: {ack.error})")
            return None
        status = "filled" if filled >= d.size - EPS else "partial"
        self._record(cloid=cloid, market=market, side="buy" if long else "sell", kind="entry", size=d.size,
                     limit_px=limit_px, reduce_only=False, status=status, exchange_oid=ack.oid,
                     filled_size=filled, avg_px=pos.entry_px)
        entry_fee = sum(f.fee for f in self.ex.get_fills(now_ms() - 600_000) if f.cloid == cloid)
        scale = filled / d.size if d.size else 0
        trade_id = self.db.open_trade(
            self.mode, market, d.direction, signal_id, now_ms(), pos.entry_px, filled, d.stop, d.target,
            d.planned_risk * scale, entry_fee,
            {"risk_decision": d.to_dict(), "entry_cloid": cloid, "initial_stop": d.stop})
        self.db.execute("UPDATE orders SET trade_id=? WHERE cloid=?", (trade_id, cloid))
        self.notify("info", "order_filled",
                    f"{market} {d.direction.upper()} filled {filled} @ {pos.entry_px} "
                    f"({'partial ' if status == 'partial' else ''}stop {d.stop:.2f}"
                    f"{f', target {d.target:.2f}' if d.target else ''})")
        self.protect(trade_id, market, long, filled, d.stop, d.target if place_tp else None)
        return trade_id

    # -- protection -------------------------------------------------------
    def protect(self, trade_id: int, market: str, long: bool, size: float, stop: float,
                target: float | None) -> bool:
        info = self.infos[market]
        stop_px = round_price(stop, info.sz_decimals, "down" if long else "up")
        if not self._place_verified(trade_id, market, "stop", not long, size, stop_px):
            self.emergency_close(trade_id, market, "protective stop could not be verified")
            return False
        if target is None:          # trailing-exit strategies run without a take-profit
            return True
        tp_px = round_price(target, info.sz_decimals, "nearest")
        if not self._place_verified(trade_id, market, "take_profit", not long, size, tp_px):
            # The stop still protects the position; this is a warning, not an emergency.
            self.notify("warning", "tp_missing", f"{market} take-profit could not be verified; stop is in place")
        return True

    def _place_verified(self, trade_id: int, market: str, kind: str, is_buy: bool, size: float, px: float,
                        attempts: int = 2, tag: object = 0) -> bool:
        for n in range(attempts):
            cloid = make_cloid(kind, self.mode, trade_id, tag, n)
            if self._order(cloid):
                continue
            self._record(cloid=cloid, trade_id=trade_id, market=market, side="buy" if is_buy else "sell",
                         kind=kind, size=size, limit_px=px if kind == "take_profit" else None,
                         trigger_px=px if kind == "stop" else None, reduce_only=True, status="submitting")
            try:
                if kind == "stop":
                    ack = self.ex.place_stop(market, is_buy, size, px, cloid)
                else:
                    ack = self.ex.place_take_profit(market, is_buy, size, px, cloid)
                self.breaker.record_api_success()
            except Exception as e:  # noqa: BLE001
                self.breaker.record_api_error(str(e))
                ack = None
                log.error("%s placement raised: %s", kind, e)
            ok = any(o.cloid == cloid and o.reduce_only and o.size >= size - EPS
                     for o in self.ex.get_open_orders())
            self._record(cloid=cloid, trade_id=trade_id, market=market, side="buy" if is_buy else "sell",
                         kind=kind, size=size, limit_px=px if kind == "take_profit" else None,
                         trigger_px=px if kind == "stop" else None, reduce_only=True,
                         status="resting" if ok else "failed", exchange_oid=ack.oid if ack else None)
            self.db.log_event("protection_check", {"trade_id": trade_id, "kind": kind, "cloid": cloid,
                                                   "verified": ok, "ack": ack.status if ack else None,
                                                   "error": ack.error if ack else "exception"}, self.mode)
            if ok:
                return True
        return False

    def move_stop(self, trade_id: int, market: str, long: bool, size: float, new_stop: float) -> bool:
        """Trail the stop: place and verify the NEW stop first, then cancel the old one,
        so the position is never without a stop. On failure the old stop stays."""
        info = self.infos[market]
        px = round_price(new_stop, info.sz_decimals, "down" if long else "up")
        old = self.db.query("SELECT cloid FROM orders WHERE trade_id=? AND kind='stop' AND status='resting'",
                            (trade_id,))
        if not self._place_verified(trade_id, market, "stop", not long, size, px, tag=f"trail{now_ms()}"):
            self.notify("warning", "trail_failed", f"{market}: could not move stop to {px}; previous stop kept")
            return False
        for o in old:
            try:
                self.ex.cancel(market, o["cloid"])
            except Exception as e:  # noqa: BLE001
                log.error("cancel old stop failed: %s", e)
            still = any(x.cloid == o["cloid"] for x in self.ex.get_open_orders())
            self.db.execute("UPDATE orders SET status=?, updated_ts=? WHERE cloid=?",
                            ("resting" if still else "replaced", now_ms(), o["cloid"]))
        self.db.execute("UPDATE trades SET stop=? WHERE id=?", (px, trade_id))
        self.db.log_event("stop_moved", {"trade_id": trade_id, "market": market, "stop": px}, self.mode)
        return True

    def cancel_trade_orders(self, trade_id: int, market: str, new_status: str = "cancelled") -> None:
        for o in self.db.query("SELECT * FROM orders WHERE trade_id=? AND status='resting'", (trade_id,)):
            try:
                self.ex.cancel(market, o["cloid"])
            except Exception as e:  # noqa: BLE001
                log.error("cancel %s failed: %s", o["cloid"], e)
            still = any(x.cloid == o["cloid"] for x in self.ex.get_open_orders())
            self.db.execute("UPDATE orders SET status=?, updated_ts=? WHERE cloid=?",
                            ("resting" if still else new_status, now_ms(), o["cloid"]))

    # -- emergency --------------------------------------------------------
    def emergency_close(self, trade_id: int | None, market: str, reason: str) -> bool:
        self.breaker.trip(reason, {"market": market, "trade_id": trade_id})
        self.notify("critical", "unprotected_position", f"{market}: {reason}. Emergency close started.")
        for o in self.ex.get_open_orders():
            if o.market == market and o.cloid:
                try:
                    self.ex.cancel(market, o.cloid)
                except Exception as e:  # noqa: BLE001
                    log.error("emergency cancel failed: %s", e)
        cloid = make_cloid("emergency", self.mode, market, trade_id, now_ms())
        self._record(cloid=cloid, trade_id=trade_id, market=market, side="close", kind="emergency", size=0,
                     reduce_only=True, status="submitting")
        try:
            ack = self.ex.close_position(market, cloid)
        except Exception as e:  # noqa: BLE001
            ack = None
            log.error("emergency close raised: %s", e)
        closed = market not in self.ex.get_positions()
        self._record(cloid=cloid, trade_id=trade_id, market=market, side="close", kind="emergency", size=0,
                     reduce_only=True, status="filled" if closed else "failed",
                     exchange_oid=ack.oid if ack else None)
        if not closed:
            self.notify("critical", "emergency_failed",
                        f"{market}: POSITION COULD NOT BE CLOSED AND MAY BE UNPROTECTED. Manual action required.")
        else:
            self.notify("critical", "emergency_closed", f"{market}: position closed by emergency procedure")
        return closed
