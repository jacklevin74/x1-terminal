"""1H entry confirmation: a candle that breaks the recent micro-structure with volume."""
from __future__ import annotations

import pandas as pd

from app.config import StrategyCfg
from app.strategy.indicators import prior_high, prior_low, prior_volume_mean


def add_confirmation_indicators(df: pd.DataFrame, cfg: StrategyCfg) -> pd.DataFrame:
    df = df.copy()
    df["prior_high"] = prior_high(df, cfg.swing_lookback)
    df["prior_low"] = prior_low(df, cfg.swing_lookback)
    df["vol_mean"] = prior_volume_mean(df, cfg.volume_period)
    return df


def detect_confirmation(row: pd.Series, direction: str, cfg: StrategyCfg) -> tuple[bool, dict[str, bool]]:
    vol_ok = bool(row["v"] > cfg.volume_multiplier * row["vol_mean"])
    if direction == "long":
        breakout = bool(row["c"] > row["prior_high"])
        body = bool(row["c"] > row["o"])
    else:
        breakout = bool(row["c"] < row["prior_low"])
        body = bool(row["c"] < row["o"])
    checks = {"1h_structure_break": breakout, "1h_candle_direction": body, "1h_volume": vol_ok}
    return breakout and body and vol_ok, checks
