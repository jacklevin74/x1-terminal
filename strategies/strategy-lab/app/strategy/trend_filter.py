"""Daily trend filter: trade only in the direction of the higher-timeframe trend."""
from __future__ import annotations

import pandas as pd

from app.config import StrategyCfg
from app.strategy.indicators import ema


def add_daily_indicators(df: pd.DataFrame, cfg: StrategyCfg) -> pd.DataFrame:
    df = df.copy()
    df["ema_fast"] = ema(df["c"], cfg.daily_ema_fast)
    df["ema_slow"] = ema(df["c"], cfg.daily_ema_slow)
    return df


def classify_trend(row: pd.Series) -> str:
    """bullish: close > EMA200 and EMA50 > EMA200. bearish: the mirror. Otherwise neutral."""
    c, f, s = row["c"], row["ema_fast"], row["ema_slow"]
    if c > s and f > s:
        return "bullish"
    if c < s and f < s:
        return "bearish"
    return "neutral"
