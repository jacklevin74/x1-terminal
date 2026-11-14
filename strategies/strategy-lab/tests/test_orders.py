import pytest

from app.execution.order_manager import OrderError, OrderManager
from app.execution.position_manager import PositionManager
from app.risk.circuit_breaker import CircuitBreaker
from app.storage.models import RiskDecision
from tests.fakes import FaultyExchange, Quotes, RecordingNotifier

SIG_TS = 1_800_000_000_000


@pytest.fixture
def env(cfg, db, infos, fp):
    q = Quotes(BTC=100_000.0, ETH=3_000.0)
    ex = FaultyExchange(db, fp, 100.0, q)
    br = CircuitBreaker(db, "paper")
    n = RecordingNotifier(db)
    om = OrderManager(ex, db, br, infos, n, cfg.execution.max_slippage_bps)
    pm = PositionManager(ex, db, om, br, n, cfg.strategy.max_hold_hours)
    return {"q": q, "ex": ex, "br": br, "n": n, "om": om, "pm": pm, "db": db}


def decision(direction="long", size=0.0002, entry=100_000.0, stop=98_000.0, target=104_000.0, approved=True):
    return RiskDecision(approved=approved, reasons=[] if approved else ["x"], market="BTC", direction=direction,
                        entry=entry, stop=stop, target=target, size=size, notional=size * entry,
                        planned_risk=0.45, risk_budget=0.5)


def test_happy_path_entry_is_protected(env):
    tid = env["om"].open_position(decision(), 1, SIG_TS)
    assert tid is not None
    orders = {o.kind: o for o in env["ex"].get_open_orders()}
    assert orders["stop"].reduce_only and orders["stop"].trigger_px == 98_000
    assert orders["take_profit"].reduce_only and orders["take_profit"].limit_px == 104_000
    assert orders["stop"].size == pytest.approx(0.0002)
    assert not env["br"].is_halted()


def test_refuses_unapproved_decision(env):
    with pytest.raises(OrderError):
        env["om"].open_position(decision(approved=False), 1, SIG_TS)


def test_duplicate_signal_refused(env):
    env["om"].open_position(decision(), 1, SIG_TS)
    with pytest.raises(OrderError, match="duplicate|position"):
        env["om"].open_position(decision(), 1, SIG_TS)


def test_refuses_when_position_exists(env):
    env["om"].open_position(decision(), 1, SIG_TS)
    with pytest.raises(OrderError, match="open .*position"):
        env["om"].open_position(decision(), 2, SIG_TS + 3_600_000)


def test_refuses_when_halted(env):
    env["br"].trip("test")
    with pytest.raises(OrderError, match="halted"):
        env["om"].open_position(decision(), 1, SIG_TS)


def test_ack_alone_is_not_a_fill(env):
    env["ex"].entry_ack_lies = True
    assert env["om"].open_position(decision(), 1, SIG_TS) is None
    assert env["db"].trades("paper") == []
    assert env["db"].orders("paper")[0]["status"] == "unfilled"


def test_partial_fill_protected_at_filled_size(env):
    env["ex"].partial_fraction = 0.5
    tid = env["om"].open_position(decision(size=0.0004), 1, SIG_TS)
    t = env["db"].query("SELECT * FROM trades WHERE id=?", (tid,))[0]
    assert t["size"] == pytest.approx(0.0002)
    assert t["planned_risk"] == pytest.approx(0.45 * 0.5)
    stop = next(o for o in env["ex"].get_open_orders() if o.kind == "stop")
    assert stop.size == pytest.approx(0.0002)
    assert env["db"].orders("paper")[0]["status"] == "partial"


def test_unverified_stop_triggers_emergency_close_and_halt(env):
    env["ex"].silent_stop_failure = True
    env["om"].open_position(decision(), 1, SIG_TS)
    assert env["ex"].get_positions() == {}              # position was closed
    assert env["br"].is_halted()
    assert "unprotected_position" in env["n"].kinds()
    assert "emergency_closed" in env["n"].kinds()


def test_stop_exception_triggers_emergency(env):
    env["ex"].stop_raises = True
    env["om"].open_position(decision(), 1, SIG_TS)
    assert env["ex"].get_positions() == {} and env["br"].is_halted()


def test_failed_emergency_close_raises_critical_alert(env):
    env["ex"].silent_stop_failure = True
    env["ex"].close_fails = True
    env["om"].open_position(decision(), 1, SIG_TS)
    assert "BTC" in env["ex"].get_positions()
    assert "emergency_failed" in env["n"].kinds()
    assert env["br"].is_halted()


def test_entry_exception_marks_unknown_and_alerts(env):
    env["ex"].entry_raises = True
    with pytest.raises(ConnectionError):
        env["om"].open_position(decision(), 1, SIG_TS)
    assert env["db"].orders("paper")[0]["status"] == "unknown"
    assert "order_error" in env["n"].kinds()


def test_entry_respects_slippage_limit(env):
    env["q"].set("BTC", 100_500, 100_500)   # 50 bps away from the decision's entry, limit allows 10
    assert env["om"].open_position(decision(), 1, SIG_TS) is None


def test_stop_out_books_trade_and_cancels_target(env):
    env["om"].open_position(decision(), 1, SIG_TS)
    env["q"].set("BTC", 97_900)
    env["ex"].on_quote("BTC", 97_900, 97_900)
    closed = env["pm"].sync()
    assert len(closed) == 1 and closed[0]["exit_reason"] == "stop"
    assert closed[0]["net_pnl"] < 0
    assert env["ex"].get_open_orders() == []            # take-profit cancelled (OCO)


def test_target_books_trade(env):
    env["om"].open_position(decision(), 1, SIG_TS)
    env["ex"].on_quote("BTC", 104_100, 104_100)
    closed = env["pm"].sync()
    assert closed[0]["exit_reason"] == "target" and closed[0]["net_pnl"] > 0
    assert closed[0]["exit"] == pytest.approx(104_000)


def test_short_lifecycle(env):
    env["om"].open_position(decision("short", stop=102_000, target=96_000), 1, SIG_TS)
    assert env["ex"].get_positions()["BTC"].size < 0
    env["ex"].on_quote("BTC", 102_100, 102_100)
    closed = env["pm"].sync()
    assert closed[0]["exit_reason"] == "stop"


def test_time_stop(env, cfg):
    tid = env["om"].open_position(decision(), 1, SIG_TS)
    t = env["db"].query("SELECT opened_ms FROM trades WHERE id=?", (tid,))[0]
    closed = env["pm"].sync(now=t["opened_ms"] + cfg.strategy.max_hold_hours * 3_600_000 + 1)
    assert closed and closed[0]["exit_reason"] == "time"
    assert env["ex"].get_positions() == {}


def test_size_mismatch_halts(env):
    env["om"].open_position(decision(), 1, SIG_TS)
    env["ex"].st["positions"]["BTC"]["size"] = 0.0005      # someone added to the position
    env["pm"].sync()
    assert env["br"].is_halted() and "position_mismatch" in env["n"].kinds()


def test_missing_stop_detected_during_sync(env):
    env["om"].open_position(decision(), 1, SIG_TS)
    stop = next(o for o in env["ex"].get_open_orders() if o.kind == "stop")
    env["ex"].cancel("BTC", stop.cloid)                    # stop disappears
    env["pm"].sync()
    assert env["ex"].get_positions() == {} and env["br"].is_halted()


# -- trailing stop moves ---------------------------------------------------
def test_move_stop_replaces_after_new_one_is_verified(env):
    tid = env["om"].open_position(decision(), 1, SIG_TS, place_tp=False)
    assert [o.kind for o in env["ex"].get_open_orders()] == ["stop"]          # no take-profit
    assert env["om"].move_stop(tid, "BTC", True, 0.0002, 99_000)
    stops = [o for o in env["ex"].get_open_orders() if o.kind == "stop"]
    assert len(stops) == 1 and stops[0].trigger_px == 99_000
    assert env["db"].query("SELECT stop FROM trades WHERE id=?", (tid,))[0]["stop"] == 99_000
    assert not env["br"].is_halted()


def test_failed_stop_move_keeps_old_stop(env):
    tid = env["om"].open_position(decision(), 1, SIG_TS, place_tp=False)
    env["ex"].silent_stop_failure = True
    assert not env["om"].move_stop(tid, "BTC", True, 0.0002, 99_000)
    stops = [o for o in env["ex"].get_open_orders() if o.kind == "stop"]
    assert len(stops) == 1 and stops[0].trigger_px == 98_000                  # still protected
    assert "trail_failed" in env["n"].kinds() and not env["br"].is_halted()
    env["pm"].sync()                                                           # sync sees a valid stop
    assert "BTC" in env["ex"].get_positions()


def test_books_are_independent(cfg, db, infos, fp):
    from app.execution.paper_exchange import PaperExchange
    q = Quotes(BTC=100_000.0)
    a = PaperExchange(db, fp, 100.0, q, book="a")
    b = PaperExchange(db, fp, 100.0, q, book="b")
    a.place_entry("BTC", True, 0.0002, 100_100, "0x" + "01" * 16)
    assert "BTC" in a.get_positions() and b.get_positions() == {}
    assert a.mode == "paper-a" and b.mode == "paper-b"


def test_multi_position_limits(cfg, db, infos, fp):
    from app.storage.models import MarketInfo
    q = Quotes(BTC=100_000.0, ETH=3_000.0, SOL=150.0, XRP=2.0)
    ex = FaultyExchange(db, fp, 100.0, q)
    br = CircuitBreaker(db, "paper")
    inf = {**infos, "SOL": MarketInfo("SOL", 2, 20, 10.0, 0.0, True), "XRP": MarketInfo("XRP", 0, 20, 10.0, 0.0, True)}
    om = OrderManager(ex, db, br, inf, RecordingNotifier(db), cfg.execution.max_slippage_bps, max_open_positions=3)

    def d(m, px, size):
        return RiskDecision(approved=True, reasons=[], market=m, direction="long", entry=px, stop=px * 0.97,
                            target=px * 1.06, size=size, notional=size * px, planned_risk=0.45, risk_budget=0.5)
    assert om.open_position(d("BTC", 100_000.0, 0.0002), 1, SIG_TS)
    assert om.open_position(d("ETH", 3_000.0, 0.007), 2, SIG_TS)
    assert om.open_position(d("SOL", 150.0, 0.14), 3, SIG_TS)
    with pytest.raises(OrderError, match="3 open"):
        om.open_position(d("XRP", 2.0, 10), 4, SIG_TS)
    with pytest.raises(OrderError, match="SOL"):
        om.open_position(d("SOL", 150.0, 0.14), 5, SIG_TS + 3_600_000)
    assert all(any(o.market == m and o.kind == "stop" for o in ex.get_open_orders()) for m in ("BTC", "ETH", "SOL"))
