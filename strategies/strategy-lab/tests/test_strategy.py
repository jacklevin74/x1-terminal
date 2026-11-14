import numpy as np
import pandas as pd
import pytest

from app.data.candles import CandleError, completed_only, find_gaps, require_fresh_history, validate_rows
from app.strategy.confirmation import detect_confirmation
from app.strategy.indicators import atr, ema, prior_high, swing_points
from app.strategy.pullback import detect_pullback
from app.strategy.signals import PreparedMarket, anchor_target
from app.strategy.trend_filter import classify_trend
from tests.conftest import H, aggregate, random_walk_hourly


# -- indicators -------------------------------------------------------------
def test_ema_matches_recursive_definition():
    s = pd.Series([1.0, 2.0, 3.0, 4.0, 5.0])
    e = ema(s, 3)
    a = 2 / (3 + 1)
    expect = [1.0]
    for x in s[1:]:
        expect.append(a * x + (1 - a) * expect[-1])
    assert np.allclose(e, expect)


def test_atr_is_wilder_smoothed_true_range():
    df = pd.DataFrame({"h": [10, 12, 11.0], "l": [9, 10, 9.5], "c": [9.5, 11, 10.0]})
    tr = [1.0, max(2, 2.5, 0.5), max(1.5, 0, 1.5)]
    expect = [tr[0]]
    for x in tr[1:]:
        expect.append(expect[-1] + (x - expect[-1]) / 14)
    assert np.allclose(atr(df, 14), expect)


def test_prior_high_excludes_current_bar():
    df = pd.DataFrame({"h": [1.0, 2.0, 3.0, 10.0]})
    ph = prior_high(df, 2)
    assert ph.iloc[3] == 3.0   # bar 3's own high (10) is not included


def test_swing_points_have_no_lookahead():
    h1 = random_walk_hourly(300)
    full_hi, _ = swing_points(h1, 3)
    cut_hi, _ = swing_points(h1.iloc[:200], 3)
    assert np.allclose(full_hi.iloc[:200].fillna(-1), cut_hi.fillna(-1))


# -- trend / pullback / confirmation units ----------------------------------
def test_classify_trend():
    assert classify_trend(pd.Series({"c": 110, "ema_fast": 105, "ema_slow": 100})) == "bullish"
    assert classify_trend(pd.Series({"c": 90, "ema_fast": 95, "ema_slow": 100})) == "bearish"
    assert classify_trend(pd.Series({"c": 101, "ema_fast": 99, "ema_slow": 100})) == "neutral"


def _window(lows, closes, highs=None, ema_f=100.0, ema_s=95.0, atr_=2.0):
    n = len(lows)
    return pd.DataFrame({"l": lows, "c": closes, "h": highs or [c + 1 for c in closes],
                         "ema_fast": [ema_f] * n, "ema_slow": [ema_s] * n, "atr": [atr_] * n})


def test_long_pullback_detected(cfg):
    w = _window(lows=[104, 102, 100.2, 101, 102, 103], closes=[105, 103, 101, 102, 103, 104])
    ok, checks, extreme = detect_pullback(w, "long", cfg.strategy)
    assert ok and extreme == 100.2 and all(checks.values())


def test_long_pullback_rejected_when_ema50_broken(cfg):
    w = _window(lows=[104, 100, 92, 101, 102, 103], closes=[105, 101, 93, 102, 103, 104])
    ok, checks, _ = detect_pullback(w, "long", cfg.strategy)
    assert not ok and not checks["4h_held_ema50"]


def test_long_pullback_rejected_without_touch(cfg):
    w = _window(lows=[106, 107, 108, 107, 108, 109], closes=[107, 108, 109, 108, 109, 110])
    ok, checks, _ = detect_pullback(w, "long", cfg.strategy)
    assert not ok and not checks["4h_touched_ema20_zone"]


def test_short_pullback_mirror(cfg):
    w = _window(lows=[90, 92, 95, 94, 93, 92], closes=[91, 93, 99.8, 95, 94, 93], highs=[92, 94, 99.9, 96, 95, 94],
                ema_f=100.0, ema_s=105.0)
    ok, _, extreme = detect_pullback(w, "short", cfg.strategy)
    assert ok and extreme == 99.9


def test_confirmation_requires_break_body_and_volume(cfg):
    row = pd.Series({"o": 100, "c": 103, "h": 103.5, "l": 99.5, "v": 50, "vol_mean": 30, "prior_high": 102,
                     "prior_low": 98})
    assert detect_confirmation(row, "long", cfg.strategy)[0]
    assert not detect_confirmation(row.copy().replace({50: 10}), "long", cfg.strategy)[0]     # low volume
    weak = row.copy()
    weak["c"] = 101.5
    assert not detect_confirmation(weak, "long", cfg.strategy)[0]                               # no break
    bear = row.copy()
    bear["o"] = 104
    assert not detect_confirmation(bear, "long", cfg.strategy)[0]                               # red candle


# -- full signal engine -----------------------------------------------------
def _prepared(cfg, n_days=400, seed=7, drift=0.00005):
    h1 = random_walk_hourly(n_days * 24, seed=seed, drift=drift)
    return PreparedMarket("BTC", aggregate(h1, 24), aggregate(h1, 4), h1, cfg.strategy)


def test_insufficient_history_produces_no_signal(cfg):
    pm = _prepared(cfg, n_days=100)
    sig = pm.evaluate()
    assert not sig.is_candidate and sig.checks["data_sufficient"] is False


def test_signal_engine_has_no_lookahead(cfg):
    """Evaluating bar i on the full history must equal evaluating it on history cut at i."""
    h1 = random_walk_hourly(330 * 24, seed=11)
    full = PreparedMarket("BTC", aggregate(h1, 24), aggregate(h1, 4), h1, cfg.strategy)
    for i in range(len(h1) - 400, len(h1) - 1, 37):
        cut = h1.iloc[: i + 1]
        part = PreparedMarket("BTC", aggregate(cut, 24), aggregate(cut, 4), cut, cfg.strategy)
        a, b = full.evaluate(i), part.evaluate()
        assert a.checks == b.checks and a.entry == b.entry and a.stop == b.stop and a.trend == b.trend


def test_candidates_have_valid_geometry(cfg):
    found = 0
    for seed in range(1, 6):
        pm = _prepared(cfg, n_days=330, seed=seed, drift=0.0002)
        for i in range(len(pm) - 2000, len(pm)):
            s = pm.evaluate(i)
            if not s.is_candidate:
                continue
            found += 1
            if s.direction.value == "long":
                assert s.stop < s.entry < s.target
            else:
                assert s.target < s.entry < s.stop
            assert s.reward_risk == pytest.approx(cfg.strategy.target_r)
            assert s.expires_ms == s.timestamp_ms + cfg.strategy.signal_ttl_minutes * 60_000
    assert found > 0, "synthetic data should yield at least one candidate"


def test_anchor_target_keeps_r_multiple():
    assert anchor_target(95, 101, "long", 2.0) == pytest.approx(113)
    assert anchor_target(105, 99, "short", 2.0) == pytest.approx(87)


# -- candle validation ------------------------------------------------------
def test_incomplete_candles_are_excluded():
    rows = [{"t": 0, "close_t": H}, {"t": H, "close_t": 2 * H}]
    assert len(completed_only(rows, now_ms=2 * H - 1)) == 1


def test_malformed_candles_dropped():
    bad = {"t": 0, "close_t": H, "o": 10, "h": 9, "l": 8, "c": 9.5, "v": 1}
    good = {"t": H, "close_t": 2 * H, "o": 10, "h": 11, "l": 9, "c": 10.5, "v": 1}
    assert validate_rows([bad, good]) == [good]


def test_gap_detection_and_freshness():
    rows = [{"t": i * H, "close_t": (i + 1) * H} for i in range(10) if i != 5]
    assert find_gaps(rows, "1h") == [(4 * H, 6 * H)]
    with pytest.raises(CandleError):
        require_fresh_history(rows, "1h", now_ms=10 * H + 5, min_bars=8)
    full = [{"t": i * H, "close_t": (i + 1) * H} for i in range(10)]
    require_fresh_history(full, "1h", now_ms=10 * H + 5, min_bars=8)
    with pytest.raises(CandleError):   # last candle is stale (one bar missing at the end)
        require_fresh_history(full, "1h", now_ms=11 * H + 5, min_bars=8)
