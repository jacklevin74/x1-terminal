"""Kuramoto order parameter for a universe of coins (EXP-003 "Firefly").

Every quantity at bar t uses only bars <= t:
- band-pass oscillation x = EMA_fast(log p) - EMA_slow(log p)
- phase theta = atan2(x / trailing std(x), dx / trailing std(dx))
  (for a sine wave x = A sin(wt), dx ~ Aw cos(wt), so atan2 recovers wt;
   the usual Hilbert-transform phase is NOT used because it needs future bars)
- R(t) = | mean_j exp(i theta_j(t)) |   over coins with data at t
"""
from __future__ import annotations

import numpy as np
import pandas as pd

FAST, SLOW, NORM, SMOOTH, BASELINE, MIN_COINS = 6, 30, 180, 6, 1080, 10


def phases(close: pd.DataFrame) -> pd.DataFrame:
    """close: index = bar open time (ms), columns = coins. Returns phases (radians)."""
    lp = np.log(close)
    x = lp.ewm(span=FAST, adjust=False, ignore_na=True).mean() - lp.ewm(span=SLOW, adjust=False,
                                                                         ignore_na=True).mean()
    dx = x.diff()
    sx = x.rolling(NORM, min_periods=NORM // 2).std()
    sdx = dx.rolling(NORM, min_periods=NORM // 2).std()
    th = np.arctan2(x / sx, dx / sdx)
    return th.where(close.notna())


def order_parameter(close: pd.DataFrame) -> pd.DataFrame:
    """Returns a frame indexed like `close` with columns:
    R (raw), R_s (smoothed), baseline (trailing median of R_s), synced (bool), psi (mean phase), n (coins)."""
    th = phases(close)
    n = th.notna().sum(axis=1)
    z = np.exp(1j * th.to_numpy())
    z = np.where(np.isnan(th.to_numpy()), 0, z)
    mean = z.sum(axis=1) / np.maximum(n.to_numpy(), 1)
    out = pd.DataFrame(index=close.index)
    out["n"] = n
    out["R"] = np.where(n >= MIN_COINS, np.abs(mean), np.nan)
    out["psi"] = np.where(n >= MIN_COINS, np.angle(mean), np.nan)
    out["R_s"] = out["R"].ewm(span=SMOOTH, adjust=False, ignore_na=True).mean()
    out["baseline"] = out["R_s"].rolling(BASELINE, min_periods=BASELINE // 2).median()
    out["synced"] = (out["R_s"] >= out["baseline"]) & out["baseline"].notna()
    return out


def close_matrix(db, source: str, coins, interval: str = "4h") -> pd.DataFrame:
    cols = {}
    for c in coins:
        rows = db.load_candles(source, c, interval)
        if rows:
            s = pd.Series({r["close_t"]: r["c"] for r in rows})
            cols[c] = s
    df = pd.DataFrame(cols).sort_index()
    df.index.name = "close_t"
    return df
