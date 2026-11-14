"""Mandatory startup reconciliation. The exchange is the source of truth.

Runs before any new entry is allowed:
1. Read exchange positions, open orders and recent fills.
2. Compare with local open trades and in-flight orders.
3. Repair what can be repaired safely:
   - an entry that was submitted right before a crash and did fill -> adopt it
     as a trade and protect it;
   - a local trade whose position closed while we were down -> book the close;
   - a position whose stop is missing -> place and verify a stop, or emergency close.
4. Anything unexplained (unknown position, unknown orders, size mismatch)
   trips the persistent halt for an operator to review.
"""
from __future__ import annotations

import json
import logging
from dataclasses import dataclass, field

from app.execution.adapter import ExchangeAdapter
from app.execution.order_manager import OrderManager
from app.execution.position_manager import PositionManager
from app.risk.circuit_breaker import CircuitBreaker
from app.storage.database import Database, now_ms

log = logging.getLogger(__name__)
EPS = 1e-9


@dataclass
class ReconcileReport:
    ok: bool = True
    actions: list[str] = field(default_factory=list)
    issues: list[str] = field(default_factory=list)

    def issue(self, msg: str) -> None:
        self.ok = False
        self.issues.append(msg)


def reconcile(ex: ExchangeAdapter, db: Database, om: OrderManager, pm: PositionManager,
              breaker: CircuitBreaker) -> ReconcileReport:
    rep = ReconcileReport()
    mode = ex.mode
    try:
        positions = ex.get_positions()
        orders = ex.get_open_orders()
    except Exception as e:  # noqa: BLE001
        rep.issue(f"could not read exchange state: {e}")
        breaker.trip("reconciliation failed: exchange state unreadable", {"error": str(e)})
        return rep

    open_trades = {t["market"]: t for t in db.trades(mode, "open")}

    # (a) in-flight entries from before a crash
    for o in db.orders(mode, ("submitting", "unknown")):
        if o["kind"] != "entry":
            if not any(x.cloid == o["cloid"] for x in orders):
                db.execute("UPDATE orders SET status='failed', updated_ts=? WHERE cloid=?", (now_ms(), o["cloid"]))
                rep.actions.append(f"marked stale {o['kind']} order {o['cloid'][:10]} failed")
            continue
        pos = positions.get(o["market"])
        long = o["side"] == "buy"
        if pos and (pos.size > 0) == long and o["market"] not in open_trades:
            stop, target, risk, submit = _recover_levels(db, o["cloid"])
            if stop is None:
                rep.issue(f"{o['market']}: filled entry {o['cloid'][:10]} has no recoverable stop level")
                om.emergency_close(None, o["market"], "adopted position has no known stop level")
                continue
            tid = db.open_trade(mode, o["market"], "long" if long else "short", None, o["ts"], pos.entry_px,
                                abs(pos.size), stop, target, risk, 0.0,
                                {"adopted": True, "entry_cloid": o["cloid"], "submit": submit})
            db.execute("UPDATE orders SET status='filled', trade_id=?, filled_size=?, avg_px=?, updated_ts=? "
                       "WHERE cloid=?", (tid, abs(pos.size), pos.entry_px, now_ms(), o["cloid"]))
            open_trades[o["market"]] = db.query("SELECT * FROM trades WHERE id=?", (tid,))[0]
            rep.actions.append(f"adopted filled entry on {o['market']} as trade {tid}")
        else:
            db.execute("UPDATE orders SET status='unfilled', updated_ts=? WHERE cloid=?", (now_ms(), o["cloid"]))
            rep.actions.append(f"entry {o['cloid'][:10]} on {o['market']} did not fill")

    # (b) positions with no local explanation
    for m, pos in positions.items():
        if m not in open_trades:
            rep.issue(f"unexpected position on exchange: {m} size {pos.size}")

    # (c) local trades: closed while offline, size mismatch, missing protection
    for m, t in open_trades.items():
        pos = positions.get(m)
        if pos is None:
            row = pm._book_close(t)
            rep.actions.append(f"booked close of trade {t['id']} on {m} ({row['exit_reason']})")
            continue
        expected = t["size"] if t["direction"] == "long" else -t["size"]
        if abs(pos.size - expected) > EPS:
            rep.issue(f"{m}: exchange size {pos.size} != local {expected}")
            continue
        resting = {r["cloid"]: r for r in db.query(
            "SELECT * FROM orders WHERE trade_id=? AND status='resting'", (t["id"],))}
        live = {o.cloid for o in orders}
        for cloid, r in resting.items():
            if cloid not in live:
                db.execute("UPDATE orders SET status='missing', updated_ts=? WHERE cloid=?", (now_ms(), cloid))
        has_stop = any(r["kind"] == "stop" and c in live for c, r in resting.items())
        if not has_stop:
            rep.actions.append(f"{m}: protective stop missing; re-placing")
            ok = om.protect(t["id"], m, t["direction"] == "long", t["size"], t["stop"], t["target"])
            if not ok:
                rep.issue(f"{m}: could not restore protective stop; emergency close executed")

    # (d) orders on the exchange we do not know about
    known = {r["cloid"] for r in db.orders(mode)}
    for o in ex.get_open_orders():
        if o.cloid not in known:
            rep.issue(f"unexpected open order on exchange: {o.market} {o.kind} cloid={o.cloid} oid={o.oid}")

    db.log_event("reconciliation", {"ok": rep.ok, "actions": rep.actions, "issues": rep.issues}, mode)
    if not rep.ok:
        breaker.trip("reconciliation found unexplained state", {"issues": rep.issues})
    return rep


def _recover_levels(db: Database, entry_cloid: str) -> tuple[float | None, float | None, float, dict | None]:
    """Stop/target were written to the order_submit event before the order was sent."""
    ev = db.query("SELECT payload FROM events WHERE kind='order_submit' AND payload LIKE ? ORDER BY id DESC LIMIT 1",
                  (f"%{entry_cloid}%",))
    if not ev:
        return None, None, 0.0, None
    d = json.loads(ev[0]["payload"])
    return d.get("stop"), d.get("target"), d.get("planned_risk", 0.0), d
