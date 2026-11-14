"""Causal technical indicators. Every value at row i depends only on rows <= i."""
from __future__ import annotations

import pandas as pd


def ema(series: pd.Series, period: int) -> pd.Series:
    return series.ewm(span=period, adjust=False).mean()


def true_range(df: pd.DataFrame) -> pd.Series:
    prev_close = df["c"].shift(1)
    return pd.concat([df["h"] - df["l"], (df["h"] - prev_close).abs(), (df["l"] - prev_close).abs()],
                     axis=1).max(axis=1)


def atr(df: pd.DataFrame, period: int = 14) -> pd.Series:
    """Wilder's ATR."""
    return true_range(df).ewm(alpha=1.0 / period, adjust=False).mean()


def prior_high(df: pd.DataFrame, lookback: int) -> pd.Series:
    """Highest high of the `lookback` bars before each bar (excludes the bar itself)."""
    return df["h"].shift(1).rolling(lookback).max()


def prior_low(df: pd.DataFrame, lookback: int) -> pd.Series:
    return df["l"].shift(1).rolling(lookback).min()


def prior_volume_mean(df: pd.DataFrame, period: int) -> pd.Series:
    return df["v"].shift(1).rolling(period).mean()


def swing_points(df: pd.DataFrame, k: int) -> tuple[pd.Series, pd.Series]:
    """Fractal swing highs/lows, reported only once confirmed (k bars later), so the
    series is free of look-ahead: row i can only mark a swing that ended at i-k."""
    h, l = df["h"], df["l"]
    win = 2 * k + 1
    is_high = h.rolling(win, center=True).max() == h
    is_low = l.rolling(win, center=True).min() == l
    swing_high = h.where(is_high).shift(k)
    swing_low = l.where(is_low).shift(k)
    return swing_high.ffill(), swing_low.ffill()
