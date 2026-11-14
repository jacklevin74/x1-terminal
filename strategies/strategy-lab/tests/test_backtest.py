from app.backtest.engine import Backtester
from app.strategy.signals import PreparedMarket
from tests.conftest import H, aggregate, random_walk_hourly


def market(cfg, seed, drift=0.0002, days=330):
    h1 = random_walk_hourly(days * 24, seed=seed, drift=drift)
    return PreparedMarket("BTC", aggregate(h1, 24), aggregate(h1, 4), h1, cfg.strategy)


def test_backtest_runs_and_respects_rules(cfg, infos):
    pm = market(cfg, seed=3)
    r = Backtester(cfg, {"BTC": pm}, infos).run()
    opens = [t["opened_ms"] for t in r.trades]
    # one position at a time: each trade opens after the previous one closed
    for a, b in zip(r.trades, r.trades[1:]):
        assert b["opened_ms"] >= a["closed_ms"]
    # cooldown after each exit
    for a, b in zip(r.trades, r.trades[1:]):
        assert b["opened_ms"] - a["closed_ms"] >= cfg.strategy.cooldown_hours * H - H
    # entries happen at a bar open that follows the signal bar's close (never on the signal bar)
    closes = set(pm.h1["close_t"])
    assert all(o in closes for o in opens)
    for t in r.trades:
        assert t["planned_risk"] <= 0.005 * 120 + 1e-9        # never more than 0.5% of a plausible equity
        assert t["fees"] > 0


def test_backtest_is_deterministic(cfg, infos):
    pm = market(cfg, seed=5)
    a = Backtester(cfg, {"BTC": pm}, infos).run()
    b = Backtester(cfg, {"BTC": pm}, infos).run()
    assert [t["net_pnl"] for t in a.trades] == [t["net_pnl"] for t in b.trades]


def test_future_bars_do_not_change_past_trades(cfg, infos):
    """Trades closed before the cut must be identical whether or not later data exists."""
    h1 = random_walk_hourly(330 * 24, seed=9, drift=0.0002)
    full = PreparedMarket("BTC", aggregate(h1, 24), aggregate(h1, 4), h1, cfg.strategy)
    cut_at = len(h1) - 1500
    cut = h1.iloc[:cut_at]
    part = PreparedMarket("BTC", aggregate(cut, 24), aggregate(cut, 4), cut, cfg.strategy)
    end = int(cut["close_t"].iloc[-1])
    ta = [t for t in Backtester(cfg, {"BTC": full}, infos).run().trades if t["closed_ms"] < end - 2 * H]
    tb = [t for t in Backtester(cfg, {"BTC": part}, infos).run().trades if t["closed_ms"] < end - 2 * H]
    assert [(t["opened_ms"], round(t["net_pnl"], 9)) for t in ta] == \
           [(t["opened_ms"], round(t["net_pnl"], 9)) for t in tb]


def test_splits_cover_all_trades(cfg, infos):
    r = Backtester(cfg, {"BTC": market(cfg, seed=3)}, infos).run()
    assert sum(s.get("trades", 0) for s in r.splits.values()) == len(r.trades)


# -- EXP-001 trailing exits ------------------------------------------------
import dataclasses  # noqa: E402

import pytest  # noqa: E402

from app.strategy.exits import trailing_stop, trend_broken  # noqa: E402


def with_exit(cfg, mode):
    return dataclasses.replace(cfg, strategy=dataclasses.replace(cfg.strategy, exit_mode=mode))


def test_trailing_inactive_until_one_r():
    # entry 100, stop 98 (1R = 2). Best price 101.9 < 102 -> unchanged.
    assert trailing_stop("long", 100, 98, 98, 101.9, 1.0, 3.0, 1.0) == 98
    # best 110 -> 110 - 3*1 = 107
    assert trailing_stop("long", 100, 98, 98, 110, 1.0, 3.0, 1.0) == 107
    # never loosens: a wider ATR would give 104, keep 107
    assert trailing_stop("long", 100, 98, 107, 110, 2.0, 3.0, 1.0) == 107
    # never looser than the initial stop
    assert trailing_stop("long", 100, 98, 98, 102.5, 5.0, 3.0, 1.0) == 98
    assert trailing_stop("short", 100, 102, 102, 90, 1.0, 3.0, 1.0) == 93


def test_trend_broken():
    assert trend_broken("long", 99, 100) and not trend_broken("long", 101, 100)
    assert trend_broken("short", 101, 100) and not trend_broken("short", 99, 100)


@pytest.mark.parametrize("mode", ["trailing", "trailing_trend"])
def test_trailing_modes_have_no_target_and_no_lookahead(cfg, infos, mode):
    c = with_exit(cfg, mode)
    h1 = random_walk_hourly(330 * 24, seed=9, drift=0.0002)
    full = PreparedMarket("BTC", aggregate(h1, 24), aggregate(h1, 4), h1, c.strategy)
    cut = h1.iloc[: len(h1) - 1500]
    part = PreparedMarket("BTC", aggregate(cut, 24), aggregate(cut, 4), cut, c.strategy)
    end = int(cut["close_t"].iloc[-1])
    ra = Backtester(c, {"BTC": full}, infos).run()
    assert ra.trades and all(t["exit_reason"] != "target" for t in ra.trades)
    ta = [t for t in ra.trades if t["closed_ms"] < end - 2 * H]
    tb = [t for t in Backtester(c, {"BTC": part}, infos).run().trades if t["closed_ms"] < end - 2 * H]
    assert [(t["opened_ms"], round(t["net_pnl"], 9)) for t in ta] == \
           [(t["opened_ms"], round(t["net_pnl"], 9)) for t in tb]


def test_trailing_stop_exit_never_worse_than_initial_risk(cfg, infos):
    c = with_exit(cfg, "trailing")
    r = Backtester(c, {"BTC": market(c, seed=3)}, infos).run()
    for t in r.trades:
        assert t["r_multiple"] > -1.6     # gaps/slippage aside, a loss is bounded by the initial stop


# -- EXP-002 EMA crossover -------------------------------------------------
from app.strategy.ema_cross import CrossStrategy  # noqa: E402


@pytest.mark.parametrize("variant", ["ema_cross_4h", "ema_cross_1d"])
def test_cross_signals_only_on_completed_candles_and_no_lookahead(cfg, infos, variant):
    c = with_exit(cfg, "reverse")
    h1 = random_walk_hourly(500 * 24, seed=4, drift=0.0001)
    full = PreparedMarket("BTC", aggregate(h1, 24), aggregate(h1, 4), h1, c.strategy)
    cs = CrossStrategy(full, variant)
    step = 4 if variant == "ema_cross_4h" else 24
    sigs = [cs.evaluate(i) for i in range(len(h1) - 3000, len(h1))]
    cands = [s for s in sigs if s.is_candidate]
    assert cands
    for s in cands:
        assert s.timestamp_ms % (step * H) == 0          # fires exactly at a candle close
        assert (s.stop < s.entry) == (s.direction.value == "long")
    cut = h1.iloc[: len(h1) - 1000]
    part = PreparedMarket("BTC", aggregate(cut, 24), aggregate(cut, 4), cut, c.strategy)
    end = int(cut["close_t"].iloc[-1])
    ta = [t for t in Backtester(c, {"BTC": full}, infos, strategies={"BTC": cs}).run().trades
          if t["closed_ms"] < end - 2 * H]
    tb = [t for t in Backtester(c, {"BTC": part}, infos, strategies={"BTC": CrossStrategy(part, variant)}).run().trades
          if t["closed_ms"] < end - 2 * H]
    assert [(t["opened_ms"], round(t["net_pnl"], 9)) for t in ta] == \
           [(t["opened_ms"], round(t["net_pnl"], 9)) for t in tb]


# -- EXP-004 portfolio (multi-position) ------------------------------------
def test_portfolio_limits_hold(cfg, infos):
    from app.storage.models import MarketInfo
    c = dataclasses.replace(cfg, strategy=dataclasses.replace(cfg.strategy, exit_mode="trailing_reverse"),
                            trading=dataclasses.replace(cfg.trading, max_open_positions=3),
                            risk=dataclasses.replace(cfg.risk, max_trades_per_week=8))
    names = ["BTC", "ETH", "SOL", "XRP", "ADA"]
    pms, strats, inf = {}, {}, {}
    for n, name in enumerate(names):
        h1 = random_walk_hourly(330 * 24, seed=20 + n, drift=0.0002, start_px=100.0 * (n + 1))
        pms[name] = PreparedMarket(name, aggregate(h1, 24), aggregate(h1, 4), h1, c.strategy)
        strats[name] = CrossStrategy(pms[name], "ema_cross_4h")
        inf[name] = infos.get(name) or MarketInfo(name, 2, 10, 10.0, 0.0000125, True, 10.0, 3.0)
    r = Backtester(c, pms, inf, strategies=strats).run()
    assert len(r.trades) > 5
    events = sorted([(t["opened_ms"], 1, t["market"]) for t in r.trades] +
                    [(t["closed_ms"], 0, t["market"]) for t in r.trades])
    open_now: set = set()
    for _, kind, m in events:                       # closes at a timestamp are processed before opens
        if kind:
            assert m not in open_now                # never two positions in one coin
            open_now.add(m)
            assert len(open_now) <= 3
            assert not {"BTC", "ETH"} <= open_now   # BTC and ETH never together
        else:
            open_now.discard(m)
    from collections import Counter
    from app.timeutil import week_start_ms
    assert max(Counter(week_start_ms(t["opened_ms"]) for t in r.trades).values()) <= 8
