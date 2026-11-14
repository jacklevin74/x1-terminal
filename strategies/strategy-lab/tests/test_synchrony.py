import numpy as np
import pandas as pd
import pytest

from app.strategy.synchrony import order_parameter, phases

H4 = 4 * 3_600_000


def frame(series: dict[str, np.ndarray]) -> pd.DataFrame:
    n = len(next(iter(series.values())))
    return pd.DataFrame(series, index=(np.arange(n) + 1) * H4)


def sine_prices(n, period, phase=0.0, noise=0.0, seed=0):
    rng = np.random.default_rng(seed)
    t = np.arange(n)
    return 100 * np.exp(0.05 * np.sin(2 * np.pi * t / period + phase) + noise * rng.normal(size=n).cumsum())


def test_identical_oscillators_are_fully_synchronized():
    close = frame({f"c{i}": sine_prices(2000, 40) for i in range(12)})
    r = order_parameter(close)["R"].iloc[400:]
    assert r.min() > 0.999


def test_independent_random_walks_are_unsynchronized():
    close = frame({f"c{i}": 100 * np.exp(np.random.default_rng(i).normal(0, 0.01, 3000).cumsum())
                   for i in range(36)})
    r = order_parameter(close)["R"].iloc[400:]
    assert r.mean() < 0.3          # ~1/sqrt(N) for independent phases


def test_antiphase_cancels():
    close = frame({**{f"a{i}": sine_prices(2000, 40) for i in range(6)},
                   **{f"b{i}": sine_prices(2000, 40, phase=np.pi) for i in range(6)}})
    assert order_parameter(close)["R"].iloc[400:].max() < 0.2


def test_phase_advances_like_a_cycle():
    th = phases(frame({"a": sine_prices(3000, 60)}))["a"].iloc[500:]
    steps = np.angle(np.exp(1j * th.diff().dropna().to_numpy()))
    assert np.median(steps) == pytest.approx(2 * np.pi / 60, rel=0.25)   # one cycle per 60 bars


def test_index_is_causal():
    close = frame({f"c{i}": 100 * np.exp(np.random.default_rng(i).normal(0, 0.01, 2500).cumsum())
                   for i in range(15)})
    full = order_parameter(close)
    for cut in (1500, 2000, 2300):
        part = order_parameter(close.iloc[:cut])
        a, b = full.iloc[:cut], part
        for col in ("R", "R_s", "baseline"):
            assert np.allclose(a[col].to_numpy(), b[col].to_numpy(), equal_nan=True), col
        assert (a["synced"] == b["synced"]).all()


def test_too_few_coins_gives_no_reading():
    close = frame({f"c{i}": sine_prices(600, 40) for i in range(5)})
    assert order_parameter(close)["R"].isna().all()
