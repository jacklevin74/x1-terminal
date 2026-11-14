"""Restart recovery: the crash scenarios reconciliation must handle."""
import pytest

from app.execution.adapter import make_cloid
from app.execution.order_manager import OrderManager
from app.execution.position_manager import PositionManager
from app.execution.reconciliation import reconcile
from app.risk.circuit_breaker import CircuitBreaker
from app.storage.models import RiskDecision
from tests.fakes import FaultyExchange, Quotes, RecordingNotifier

SIG_TS = 1_800_000_000_000


def build(cfg, db, infos, fp, q=None):
    """A fresh process: new objects, same database (and same persisted paper exchange)."""
    q = q or Quotes(BTC=100_000.0, ETH=3_000.0)
    ex = FaultyExchange(db, fp, 100.0, q)
    br = CircuitBreaker(db, "paper")
    n = RecordingNotifier(db)
    om = OrderManager(ex, db, br, infos, n, cfg.execution.max_slippage_bps)
    pm = PositionManager(ex, db, om, br, n, cfg.strategy.max_hold_hours)
    return ex, br, n, om, pm, q


def decision():
    return RiskDecision(approved=True, reasons=[], market="BTC", direction="long", entry=100_000.0,
                        stop=98_000.0, target=104_000.0, size=0.0002, notional=20.0, planned_risk=0.45,
                        risk_budget=0.5)


def test_clean_start_reconciles_ok(cfg, db, infos, fp):
    ex, br, n, om, pm, _ = build(cfg, db, infos, fp)
    rep = reconcile(ex, db, om, pm, br)
    assert rep.ok and not br.is_halted()


def test_crash_after_entry_fill_is_adopted_and_protected(cfg, db, infos, fp):
    """Entry accepted and filled, process dies before the trade or stop are recorded."""
    ex, br, n, om, pm, q = build(cfg, db, infos, fp)
    d = decision()
    cloid = make_cloid("entry", "paper", "BTC", SIG_TS)
    om._record(cloid=cloid, market="BTC", side="buy", kind="entry", size=d.size, limit_px=100_100,
               reduce_only=False, status="submitting")
    db.log_event("order_submit", {"cloid": cloid, "market": "BTC", "size": d.size, "stop": d.stop,
                                  "target": d.target, "planned_risk": d.planned_risk}, "paper")
    ex.place_entry("BTC", True, d.size, 100_100, cloid)       # filled on the venue... then crash

    ex2, br2, n2, om2, pm2, _ = build(cfg, db, infos, fp, q)
    assert db.trades("paper", "open") == []
    rep = reconcile(ex2, db, om2, pm2, br2)
    assert rep.ok, rep.issues
    trades = db.trades("paper", "open")
    assert len(trades) == 1 and trades[0]["stop"] == 98_000
    assert any(o.kind == "stop" and o.reduce_only for o in ex2.get_open_orders())
    # And the same signal cannot be submitted again.
    with pytest.raises(Exception, match="duplicate|position"):
        om2.open_position(d, None, SIG_TS)


def test_crash_after_submit_without_fill(cfg, db, infos, fp):
    ex, br, n, om, pm, q = build(cfg, db, infos, fp)
    cloid = make_cloid("entry", "paper", "BTC", SIG_TS)
    om._record(cloid=cloid, market="BTC", side="buy", kind="entry", size=0.0002, limit_px=100_100,
               reduce_only=False, status="submitting")
    ex2, br2, n2, om2, pm2, _ = build(cfg, db, infos, fp, q)
    rep = reconcile(ex2, db, om2, pm2, br2)
    assert rep.ok and db.orders("paper")[0]["status"] == "unfilled"


def test_stop_hit_while_offline_is_booked(cfg, db, infos, fp):
    ex, br, n, om, pm, q = build(cfg, db, infos, fp)
    om.open_position(decision(), 1, SIG_TS)
    ex.on_quote("BTC", 97_000, 97_000)                        # stop fills while we are "down"
    ex2, br2, n2, om2, pm2, _ = build(cfg, db, infos, fp, q)
    rep = reconcile(ex2, db, om2, pm2, br2)
    assert rep.ok
    closed = db.trades("paper", "closed")
    assert len(closed) == 1 and closed[0]["exit_reason"] == "stop"


def test_missing_stop_is_restored_on_startup(cfg, db, infos, fp):
    ex, br, n, om, pm, q = build(cfg, db, infos, fp)
    om.open_position(decision(), 1, SIG_TS)
    stop = next(o for o in ex.get_open_orders() if o.kind == "stop")
    ex.cancel("BTC", stop.cloid)
    ex2, br2, n2, om2, pm2, _ = build(cfg, db, infos, fp, q)
    rep = reconcile(ex2, db, om2, pm2, br2)
    assert rep.ok, rep.issues
    assert any(o.kind == "stop" for o in ex2.get_open_orders())
    assert "BTC" in ex2.get_positions()


def test_missing_stop_unrestorable_closes_and_halts(cfg, db, infos, fp):
    ex, br, n, om, pm, q = build(cfg, db, infos, fp)
    om.open_position(decision(), 1, SIG_TS)
    ex.cancel("BTC", next(o for o in ex.get_open_orders() if o.kind == "stop").cloid)
    ex2, br2, n2, om2, pm2, _ = build(cfg, db, infos, fp, q)
    ex2.silent_stop_failure = True
    rep = reconcile(ex2, db, om2, pm2, br2)
    assert not rep.ok and br2.is_halted()
    assert ex2.get_positions() == {}


def test_unexpected_position_halts(cfg, db, infos, fp):
    ex, br, n, om, pm, q = build(cfg, db, infos, fp)
    ex.place_entry("ETH", True, 0.01, 3_010, "0x" + "ab" * 16)   # opened outside the bot
    rep = reconcile(ex, db, om, pm, br)
    assert not rep.ok and br.is_halted()
    assert any("unexpected position" in i for i in rep.issues)


def test_unexpected_order_halts(cfg, db, infos, fp):
    ex, br, n, om, pm, q = build(cfg, db, infos, fp)
    om.open_position(decision(), 1, SIG_TS)
    ex.place_take_profit("BTC", False, 0.0001, 110_000, "0x" + "cd" * 16)   # placed outside the bot
    ex2, br2, n2, om2, pm2, _ = build(cfg, db, infos, fp, q)
    rep = reconcile(ex2, db, om2, pm2, br2)
    assert not rep.ok and any("unexpected open order" in i for i in rep.issues)


def test_size_mismatch_on_startup_halts(cfg, db, infos, fp):
    ex, br, n, om, pm, q = build(cfg, db, infos, fp)
    om.open_position(decision(), 1, SIG_TS)
    ex.st["positions"]["BTC"]["size"] = 0.001
    ex._save()
    ex2, br2, n2, om2, pm2, _ = build(cfg, db, infos, fp, q)
    rep = reconcile(ex2, db, om2, pm2, br2)
    assert not rep.ok and br2.is_halted()


def test_halt_survives_restart_and_blocks_entries(cfg, db, infos, fp):
    ex, br, n, om, pm, q = build(cfg, db, infos, fp)
    br.trip("operator test")
    ex2, br2, n2, om2, pm2, _ = build(cfg, db, infos, fp, q)
    reconcile(ex2, db, om2, pm2, br2)
    assert br2.is_halted()
    with pytest.raises(Exception, match="halted"):
        om2.open_position(decision(), 1, SIG_TS)
