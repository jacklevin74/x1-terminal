from __future__ import annotations

import sys
from pathlib import Path

import numpy as np
import pandas as pd
import pytest

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app.backtest.simulator import FillParams  # noqa: E402
from app.config import load_config  # noqa: E402
from app.storage.database import Database  # noqa: E402
from app.storage.models import AccountState, MarketContext, MarketInfo  # noqa: E402

H = 3_600_000


@pytest.fixture
def cfg():
    return load_config(Path(__file__).resolve().parent.parent / "config.yaml")


@pytest.fixture
def db():
    d = Database(":memory:")
    yield d
    d.close()


@pytest.fixture
def infos():
    return {"BTC": MarketInfo("BTC", 5, 40, 10.0, 0.0000125, True),
            "ETH": MarketInfo("ETH", 4, 25, 10.0, 0.0000125, True)}


@pytest.fixture
def fp(cfg):
    return FillParams(cfg.fees.taker, cfg.fees.maker, cfg.execution.assumed_slippage_bps / 1e4, 0.0)


def account(equity=100.0, **kw):
    base = dict(equity=equity, peak_equity=equity, week_start_equity=equity, week_realized_pnl=0.0,
                trades_this_week=0, open_positions=[])
    base.update(kw)
    return AccountState(**base)


def ctx(bid, ask=None, age=1.0, funding=0.0000125):
    return MarketContext(bid=bid, ask=ask if ask is not None else bid, data_age_seconds=age,
                         funding_rate_hourly=funding)


def random_walk_hourly(n_hours: int, seed: int = 7, start_px: float = 30000.0, drift: float = 0.00005,
                       vol: float = 0.006, start_ms: int = 1_600_000_000_000 // H * H) -> pd.DataFrame:
    rng = np.random.default_rng(seed)
    rets = rng.normal(drift, vol, n_hours)
    close = start_px * np.exp(np.cumsum(rets))
    open_ = np.concatenate([[start_px], close[:-1]])
    wig = np.abs(rng.normal(0, vol / 2, n_hours))
    high = np.maximum(open_, close) * (1 + wig)
    low = np.minimum(open_, close) * (1 - wig)
    vol_ = rng.lognormal(3, 0.5, n_hours)
    t = start_ms + np.arange(n_hours) * H
    return pd.DataFrame({"t": t, "close_t": t + H, "o": open_, "h": high, "l": low, "c": close, "v": vol_})


def aggregate(h1: pd.DataFrame, hours: int) -> pd.DataFrame:
    """Aggregate 1H bars into completed N-hour bars aligned to UTC boundaries."""
    step = hours * H
    g = h1.assign(bucket=(h1["t"] // step) * step).groupby("bucket")
    out = pd.DataFrame({"t": g["t"].first() // step * step, "o": g["o"].first(), "h": g["h"].max(),
                        "l": g["l"].min(), "c": g["c"].last(), "v": g["v"].sum(), "n": g["t"].count()})
    out = out[out["n"] == hours].drop(columns="n").reset_index(drop=True)
    out["close_t"] = out["t"] + step
    return out[["t", "close_t", "o", "h", "l", "c", "v"]]
