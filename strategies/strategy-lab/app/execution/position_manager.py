"""Tracks open trades against exchange state and books closed trades.

`sync()` runs on every poll. The exchange is authoritative: if a position is
gone, the trade is closed using the actual exit fills; if a position exists that
no trade explains, or its size differs, trading halts.
"""
from __future__ import annotations

import logging
from typing import Any

from app.execution.adapter import ExchangeAdapter, make_cloid
from app.execution.order_manager import Notify, OrderManager
from app.risk.circuit_breaker import CircuitBreaker
from app.storage.database import Database, now_ms
from app.storage.models import AccountState
from app.timeutil import HOUR_MS, week_start_ms

log = logging.getLogger(__name__)
EPS = 1e-9


class PositionManager:
    def __init__(self, adapter: ExchangeAdapter, db: Database, om: OrderManager, breaker: CircuitBreaker,
                 notify: Notify, max_hold_hours: int, leverage: float = 2.0):
        self.ex = adapter
        self.db = db
        self.om = om
        self.breaker = breaker
        self.notify = notify
        self.max_hold_ms = max_hold_hours * HOUR_MS
        self.leverage = leverage
        self.mode = adapter.mode

    def open_trades(self) -> list[dict[str, Any]]:
        return self.db.trades(self.mode, "open")

    def sync(self, now: int | None = None) -> list[dict[str, Any]]:
        """Returns trades closed during this sync."""
        now = now or now_ms()
        positions = self.ex.get_positions()
        closed: list[dict[str, Any]] = []
        tracked = set()
        for t in self.open_trades():
            m = t["market"]
            tracked.add(m)
            pos = positions.get(m)
            if pos is None:
                closed.append(self._book_close(t))
                continue
            expected = t["size"] if t["direction"] == "long" else -t["size"]
            if abs(pos.size - expected) > EPS:
                if not self.breaker.is_halted():
                    self.notify("critical", "position_mismatch",
                                f"{m}: exchange size {pos.size} != expected {expected}")
                self.breaker.trip("position size does not match local trade", {"market": m, "exchange": pos.size,
                                                                                "expected": expected})
                continue
            if not self._has_stop(t["id"], m):
                self.om.emergency_close(t["id"], m, "open position has no verified protective stop")
                continue
            if now - t["opened_ms"] >= self.max_hold_ms:
                cloid = make_cloid("time_stop", self.mode, t["id"])
                self.om.cancel_trade_orders(t["id"], m)
                self.db.upsert_order({"cloid": cloid, "mode": self.mode, "trade_id": t["id"], "market": m,
                                      "side": "close", "kind": "time", "size": t["size"], "reduce_only": True,
                                      "status": "submitting"})
                ack = self.ex.close_position(m, cloid)
                self.db.log_event("time_stop", {"trade_id": t["id"], "ack": ack.status, "error": ack.error},
                                  self.mode)
                if m not in self.ex.get_positions():
                    closed.append(self._book_close(t))
        for m in positions:
            if m not in tracked:
                if not self.breaker.is_halted():
                    self.notify("critical", "unexpected_position", f"{m}: exchange position with no local trade")
                self.breaker.trip("unexpected position on exchange", {"market": m})
        return closed

    def _has_stop(self, trade_id: int, market: str) -> bool:
        stops = {o["cloid"] for o in self.db.query(
            "SELECT cloid FROM orders WHERE trade_id=? AND kind='stop' AND status='resting'", (trade_id,))}
        return any(o.cloid in stops and o.market == market for o in self.ex.get_open_orders())

    def _book_close(self, t: dict[str, Any]) -> dict[str, Any]:
        m, long = t["market"], t["direction"] == "long"
        entry_cloid = self._entry_cloid(t)
        fills = [f for f in self.ex.get_fills(t["opened_ms"] - 60_000)
                 if f.market == m and f.cloid != entry_cloid and f.is_buy != long]
        kinds = {o["cloid"]: o["kind"] for o in self.db.query("SELECT cloid, kind FROM orders WHERE trade_id=?",
                                                              (t["id"],))}
        if fills:
            qty = sum(f.size for f in fills)
            exit_px = sum(f.px * f.size for f in fills) / qty
            exit_fee = sum(f.fee for f in fills)
            reason = kinds.get(fills[-1].cloid) or fills[-1].extra.get("reason") or "external"
            for f in fills:
                if f.cloid in kinds:
                    self.db.execute("UPDATE orders SET status='filled', filled_size=?, avg_px=?, updated_ts=? "
                                    "WHERE cloid=?", (f.size, f.px, now_ms(), f.cloid))
        else:
            # Position vanished with no visible fill (e.g. liquidation or manual action).
            exit_px, exit_fee, reason = t["entry"], 0.0, "unknown"
            self.notify("critical", "unexplained_close", f"{m}: position closed with no matching fills")
            self.breaker.trip("position closed without matching fills", {"trade_id": t["id"]})
        reason = {"take_profit": "target", "stop": "stop", "emergency": "emergency"}.get(reason, reason)
        self.om.cancel_trade_orders(t["id"], m)   # OCO: drop whichever protective order is left
        sign = 1 if long else -1
        gross = sign * (exit_px - t["entry"]) * t["size"]
        row = self.db.close_trade(t["id"], now_ms(), exit_px, gross, (t["fees"] or 0) + exit_fee,
                                  t["funding"] or 0.0, reason)
        self.db.log_event("trade_closed", row, self.mode)
        level = "info" if row["net_pnl"] > 0 else "warning"
        self.notify(level, f"exit_{reason}",
                    f"{m} {t['direction'].upper()} closed by {reason} @ {exit_px:.2f}: net ${row['net_pnl']:+.4f} "
                    f"({(row['r_multiple'] or 0):+.2f} R)")
        return row

    def _entry_cloid(self, t: dict[str, Any]) -> str | None:
        rows = self.db.query("SELECT cloid FROM orders WHERE trade_id=? AND kind='entry'", (t["id"],))
        return rows[0]["cloid"] if rows else None

    # -- account state for the risk engine --------------------------------
    def account_state(self, starting_balance: float) -> AccountState:
        now = now_ms()
        equity = self.ex.get_equity()
        wk = week_start_ms(now)
        closed = [t for t in self.db.trades(self.mode, "closed") if (t["closed_ms"] or 0) >= wk]
        week_pnl = sum(t["net_pnl"] or 0 for t in closed)
        opened = self.db.query("SELECT COUNT(*) n FROM trades WHERE mode=? AND opened_ms>=?", (self.mode, wk))[0]["n"]
        peak_row = self.db.query("SELECT MAX(equity) p FROM equity WHERE mode=?", (self.mode,))[0]["p"]
        peak = max(peak_row or starting_balance, starting_balance, equity)
        first = self.db.query("SELECT equity FROM equity WHERE mode=? AND ts>=? ORDER BY ts LIMIT 1", (self.mode, wk))
        week_start_eq = first[0]["equity"] if first else equity - week_pnl
        open_t = self.open_trades()
        lev = max(self.leverage, 1e-9)
        return AccountState(equity=equity, peak_equity=peak, week_start_equity=week_start_eq,
                            week_realized_pnl=week_pnl, trades_this_week=opened,
                            open_positions=list(self.ex.get_positions()),
                            halted=self.breaker.is_halted(), halt_reason=self.breaker.reason(),
                            open_margin=sum(t["size"] * t["entry"] / lev for t in open_t),
                            open_risk=sum(t["planned_risk"] or 0 for t in open_t))
