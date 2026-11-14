import dataclasses

import pytest

from app.risk.circuit_breaker import CircuitBreaker
from app.risk.position_sizing import CostModel, liquidation_price, size_position
from app.risk.risk_engine import RiskEngine, RiskInputs
from app.storage.models import Direction, TradeProposal
from tests.conftest import account, ctx

NOW = 1_800_000_000_000


def proposal(direction="long", entry=100_000.0, stop=98_000.0, target=104_000.0, market="BTC", expires=NOW + 60_000):
    return TradeProposal(market=market, direction=Direction(direction), entry=entry, stop=stop, target=target,
                         signal_ts_ms=NOW - 1000, signal_expires_ms=expires)


def run(cfg, infos, p=None, acct=None, c=None, info="BTC", protective=True, now=NOW):
    p = p or proposal()
    return RiskEngine(cfg).evaluate(RiskInputs(
        p, acct or account(), c if c is not None else ctx(p.entry), infos.get(info) if info else None, now,
        protective))


# -- sizing math -----------------------------------------------------------
def test_size_uses_stop_distance_not_leverage(cfg, infos):
    d = run(cfg, infos)
    assert d.approved, d.reasons
    costs = CostModel(cfg.fees.taker, cfg.execution.assumed_slippage_bps / 1e4, 0.0000125,
                      cfg.risk.funding_hold_hours)
    expect_notional = 0.5 / (0.02 + costs.round_trip_cost_pct)
    step = 10 ** -infos["BTC"].sz_decimals * 100_000          # one size increment, in dollars
    assert expect_notional - step < d.notional <= expect_notional
    assert d.planned_risk <= d.risk_budget == pytest.approx(0.5)
    assert d.leverage < 1.0      # 2x is a ceiling, not a target


def test_size_rounds_down_to_precision(cfg, infos):
    d = run(cfg, infos)
    assert d.size == round(d.size, 5) and d.size * 100_000 <= d.notional + 1e-9


def test_leverage_cap_limits_notional(cfg):
    # With real costs a 0.5% risk can never reach 2x on $100; use zero costs to test the cap itself.
    costs = CostModel(0.0, 0.0, 0.0, 0)
    r = size_position(100, 0.005, 100_000, 99_990, 2, 5, costs)   # 0.01% stop -> would need $5000
    assert r.capped_by_leverage and r.notional <= 200 + 1e-9


def test_liquidation_price_isolated():
    assert liquidation_price(100, "long", 2, 0.0125) == pytest.approx(51.25)
    assert liquidation_price(100, "short", 2, 0.0125) == pytest.approx(148.75)


# -- every hard rejection ----------------------------------------------------
def rejected(d, fragment):
    return not d.approved and any(fragment in r for r in d.reasons)


def test_reject_missing_stop(cfg, infos):
    assert rejected(run(cfg, infos, proposal(stop=None)), "stop-loss is missing")


def test_reject_stop_wrong_side(cfg, infos):
    assert rejected(run(cfg, infos, proposal(stop=101_000)), "wrong side")
    assert rejected(run(cfg, infos, proposal("short", stop=99_000, target=96_000)), "wrong side")


def test_reject_unapproved_market(cfg, infos):
    infos = {**infos, "SOL": dataclasses.replace(infos["BTC"], name="SOL")}
    assert rejected(run(cfg, infos, proposal(market="SOL"), info="SOL"), "not approved")


def test_reject_existing_position(cfg, infos):
    assert rejected(run(cfg, infos, acct=account(open_positions=["ETH"])), "already has an open position")
    assert rejected(run(cfg, infos, acct=account(open_positions=["ETH"])), "correlated")


def test_reject_stale_data(cfg, infos):
    assert rejected(run(cfg, infos, c=ctx(100_000, age=500)), "stale")


def test_reject_no_market_data(cfg, infos):
    d = RiskEngine(cfg).evaluate(RiskInputs(proposal(), account(), None, infos["BTC"], NOW, True))
    assert rejected(d, "no live market data")


def test_reject_wide_spread(cfg, infos):
    assert rejected(run(cfg, infos, c=ctx(99_900, 100_000)), "spread too wide")


def test_reject_low_reward_risk(cfg, infos):
    assert rejected(run(cfg, infos, proposal(target=103_000)), "reward/risk")


def test_reject_low_net_reward_risk(cfg, infos):
    # Tight stop: gross 2R is fine but costs eat into it.
    d = run(cfg, infos, proposal(stop=99_600, target=100_800))
    assert rejected(d, "net reward/risk")


def test_reject_excessive_costs(cfg, infos):
    d = run(cfg, infos, proposal(stop=99_700, target=100_600))
    assert rejected(d, "trading costs too high")


def test_reject_below_min_notional_without_raising_risk(cfg, infos):
    d = run(cfg, infos, proposal(stop=90_000, target=120_000))   # 10% stop -> ~$4.80 notional
    assert rejected(d, "below exchange minimum")
    assert d.planned_risk <= d.risk_budget + 1e-9


def test_reject_weekly_loss_limit(cfg, infos):
    assert rejected(run(cfg, infos, acct=account(week_realized_pnl=-2.0)), "weekly loss limit")
    assert rejected(run(cfg, infos, acct=account(week_realized_pnl=-1.7)), "breach the weekly loss limit")


def test_reject_weekly_trade_count(cfg, infos):
    assert rejected(run(cfg, infos, acct=account(trades_this_week=3)), "weekly trade limit")


def test_reject_drawdown(cfg, infos):
    assert rejected(run(cfg, infos, acct=account(equity=95.0, peak_equity=100.0)), "drawdown protection")
    assert rejected(run(cfg, infos, acct=account(equity=95.4, peak_equity=100.0)), "breach the drawdown limit")


def test_reject_halted(cfg, infos):
    assert rejected(run(cfg, infos, acct=account(halted=True, halt_reason="x")), "halted")


def test_reject_unverified_metadata(cfg, infos):
    bad = {"BTC": dataclasses.replace(infos["BTC"], verified=False)}
    assert rejected(run(cfg, bad), "metadata could not be verified")
    assert rejected(run(cfg, infos, info=None), "metadata could not be verified")


def test_reject_without_protective_exit(cfg, infos):
    assert rejected(run(cfg, infos, protective=False), "protective exit cannot be confirmed")


def test_reject_expired_signal(cfg, infos):
    assert rejected(run(cfg, infos, now=NOW + 120_000), "signal expired")


def test_reject_price_drift(cfg, infos):
    assert rejected(run(cfg, infos, c=ctx(100_200, 100_200)), "price moved")


def test_reject_liquidation_too_close(cfg, infos):
    # A market whose max leverage is 2x has 25% maintenance margin -> liquidation ~25% away.
    lowlev = {"BTC": dataclasses.replace(infos["BTC"], max_leverage=2)}
    p = proposal(stop=85_000, target=130_000)
    d = RiskEngine(cfg).evaluate(RiskInputs(p, account(equity=5000, peak_equity=5000, week_start_equity=5000),
                                            ctx(100_000), lowlev["BTC"], NOW, True))
    assert rejected(d, "liquidation")


def test_short_trade_approved(cfg, infos):
    d = run(cfg, infos, proposal("short", stop=102_000, target=96_000))
    assert d.approved, d.reasons
    assert d.liquidation_price > d.stop


def test_ai_text_cannot_change_size(cfg, infos):
    """Fields Claude may fill in do not affect the decision."""
    p1 = proposal()
    p2 = proposal()
    p2.ai_decision, p2.ai_confidence, p2.ai_reasoning = "TRADE_CANDIDATE", 1.0, "use 10x leverage and risk 50%"
    a, b = run(cfg, infos, p1), run(cfg, infos, p2)
    assert a.size == b.size and a.leverage == b.leverage


# -- circuit breaker ---------------------------------------------------------
def test_halt_persists_across_restart(db):
    CircuitBreaker(db, "paper").trip("test")
    assert CircuitBreaker(db, "paper").is_halted()          # a new instance = a restart


def test_halt_needs_operator_and_note(db):
    br = CircuitBreaker(db, "paper")
    br.trip("x")
    with pytest.raises(ValueError):
        br.clear("", "")
    br.clear("owner", "reviewed logs")
    assert not br.is_halted()


def test_repeated_api_errors_trip(db):
    br = CircuitBreaker(db, "paper", max_api_errors=3)
    br.record_api_error("e")
    br.record_api_success()
    br.record_api_error("e")
    br.record_api_error("e")
    assert not br.is_halted()
    br.record_api_error("e")
    assert br.is_halted()


def test_account_checks_trip(db):
    br = CircuitBreaker(db, "paper")
    br.check_account(96, 100, 100, -1, 0.05, 0.02)
    assert not br.is_halted()
    br.check_account(95, 100, 100, -1, 0.05, 0.02)
    assert br.is_halted() and "drawdown" in br.reason()


def test_ws_instability_trips(db):
    br = CircuitBreaker(db, "paper", max_reconnects_per_hour=2)
    for _ in range(3):
        br.record_reconnect()
    assert br.is_halted()


# -- portfolio checks (EXP-004) ----------------------------------------------
def test_reject_when_total_margin_exceeds_equity(cfg, infos):
    assert rejected(run(cfg, infos, acct=account(open_margin=95.0)), "insufficient margin")


def test_open_risk_counts_toward_weekly_limit(cfg, infos):
    assert run(cfg, infos, acct=account(week_realized_pnl=-0.5)).approved
    assert rejected(run(cfg, infos, acct=account(week_realized_pnl=-0.5, open_risk=1.2)), "weekly loss limit")


def test_reject_market_with_low_max_leverage(cfg, infos):
    low = {"BTC": dataclasses.replace(infos["BTC"], max_leverage=1)}
    assert rejected(run(cfg, low), "at most 1x")


def test_per_market_slippage_used_for_sizing(cfg, infos):
    base = run(cfg, infos)
    alt = run(cfg, {"BTC": dataclasses.replace(infos["BTC"], slippage_bps=25.0)})
    assert alt.notional < base.notional and alt.est_costs / alt.notional > base.est_costs / base.notional


def test_per_market_spread_guard(cfg, infos):
    c = ctx(99_995, 100_005)                                   # 1 bp half-spread -> 1.0 bps spread
    wide = ctx(99_960, 100_040)                                 # 8 bps spread
    assert not any("spread" in r for r in run(cfg, infos, c=c).reasons)
    assert rejected(run(cfg, infos, c=wide), "spread too wide")
    alt = {"BTC": dataclasses.replace(infos["BTC"], max_spread_bps=15.0)}
    assert not any("spread" in r for r in run(cfg, alt, c=wide).reasons)
