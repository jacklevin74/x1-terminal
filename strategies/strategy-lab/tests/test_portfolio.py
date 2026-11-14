import numpy as np
import pandas as pd
import pytest

from app.backtest.portfolio import XsConfig, report, run_xs
from app.storage.models import MarketInfo

DAY = 86_400_000
MON = 1_704_067_200_000          # 2024-01-01 00:00 UTC, a Monday


def coins(n=20, days=300, seed=1, drifts=None):
    rng = np.random.default_rng(seed)
    frames = {}
    t = MON + np.arange(days) * DAY
    for k in range(n):
        d = drifts[k] if drifts is not None else 0.0
        c = 100 * np.exp(np.cumsum(rng.normal(d, 0.03, days)))
        o = np.concatenate([[100], c[:-1]])
        w = np.abs(rng.normal(0, 0.01, days))
        frames[f"C{k}"] = pd.DataFrame({"o": o, "h": np.maximum(o, c) * (1 + w), "l": np.minimum(o, c) * (1 - w),
                                        "c": c}, index=t)
    infos = {c: MarketInfo(c, 3, 20, 10.0, 0.0, True) for c in frames}
    return frames, infos


def test_momentum_goes_long_winners_and_short_losers():
    drifts = np.linspace(-0.004, 0.004, 20)          # C19 rises fastest, C0 falls fastest
    frames, infos = coins(drifts=drifts, seed=3)
    r = run_xs(frames, infos, {}, XsConfig())
    longs = {t["market"] for t in r.trades if t["direction"] == "long"}
    shorts = {t["market"] for t in r.trades if t["direction"] == "short"}
    assert longs & {"C17", "C18", "C19"} and shorts & {"C0", "C1", "C2"}
    assert r.equity.iloc[-1] > 100                       # clean trends -> momentum profits


def test_reversal_takes_the_opposite_side():
    drifts = np.linspace(-0.004, 0.004, 20)
    frames, infos = coins(drifts=drifts, seed=3)
    r = run_xs(frames, infos, {}, XsConfig(reversal=True))
    longs = [t["market"] for t in r.trades if t["direction"] == "long"]
    assert sum(m in ("C0", "C1", "C2", "C3", "C4") for m in longs) > sum(m in ("C15", "C16", "C17", "C18", "C19")
                                                                          for m in longs)


def test_no_lookahead():
    frames, infos = coins(seed=5)
    full = run_xs(frames, infos, {}, XsConfig())
    cut_t = MON + 200 * DAY
    part = run_xs({c: f[f.index < cut_t] for c, f in frames.items()}, infos, {}, XsConfig())
    a = [(t["market"], t["opened_ms"], round(t["net_pnl"], 9)) for t in full.trades if t["closed_ms"] < cut_t - DAY]
    b = [(t["market"], t["opened_ms"], round(t["net_pnl"], 9)) for t in part.trades if t["closed_ms"] < cut_t - DAY]
    assert a == b and len(a) > 10


def test_trades_only_open_on_mondays_and_respect_limits():
    frames, infos = coins(seed=7)
    cfg = XsConfig()
    r = run_xs(frames, infos, {}, cfg)
    for t in r.trades:
        assert pd.Timestamp(t["opened_ms"], unit="ms", tz="UTC").weekday() == 0
        assert t["entry"] * t["size"] <= cfg.gross_target * 200 / 6 + 1e-6   # equal weight, ~1/6 of equity
        assert t["fees"] > 0


def test_stop_losses_are_bounded():
    frames, infos = coins(seed=9)
    r = run_xs(frames, infos, {}, XsConfig())
    stops = [t for t in r.trades if t["exit_reason"] == "stop"]
    assert stops and all(t["r_multiple"] > -2.0 for t in stops)        # gaps aside, about -1R


def test_funding_sign():
    frames, infos = coins(n=16, seed=11)
    pay = {c: {t: 0.01 for t in f.index} for c, f in frames.items()}   # absurd 1%/day: longs pay, shorts earn
    r = run_xs(frames, infos, pay, XsConfig())
    assert all((t["funding"] > 0) == (t["direction"] == "long") for t in r.trades if abs(t["funding"]) > 1e-12)


def test_report_has_splits_and_months():
    frames, infos = coins(seed=13)
    rep = report(run_xs(frames, infos, {}, XsConfig()), 100)
    assert set(rep["splits"]) == {"development (first 60%)", "validation (next 20%)", "out-of-sample (last 20%)"}
    assert rep["monthly"] and rep["max_drawdown_pct"] >= 0


def test_risk_sizing_on_100_dollars_is_too_small():
    frames, infos = coins(seed=5)
    r = run_xs(frames, infos, {}, XsConfig(sizing="risk"))
    assert r.trades == [] and r.skipped_small > 0          # documents the $10-minimum constraint
