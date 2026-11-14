"""4H pullback detection: price retraces into the EMA20 zone without breaking EMA50."""
from __future__ import annotations

import pandas as pd

from app.config import StrategyCfg
from app.strategy.indicators import atr, ema


def add_setup_indicators(df: pd.DataFrame, cfg: StrategyCfg) -> pd.DataFrame:
    df = df.copy()
    df["ema_fast"] = ema(df["c"], cfg.setup_ema_fast)
    df["ema_slow"] = ema(df["c"], cfg.setup_ema_slow)
    df["atr"] = atr(df, cfg.atr_period)
    return df


def detect_pullback(window: pd.DataFrame, direction: str, cfg: StrategyCfg) -> tuple[bool, dict[str, bool], float]:
    """`window` = the last N completed 4H rows (with indicators), oldest first.

    Returns (is_pullback, checks, extreme) where extreme is the lowest low (long)
    or highest high (short) of the window, used for stop placement.
    """
    last = window.iloc[-1]
    tol = cfg.pullback_atr_tolerance * last["atr"]
    if direction == "long":
        aligned = bool(last["ema_fast"] > last["ema_slow"])
        touched = bool((window["l"] <= window["ema_fast"] + tol).any())
        held = bool((window["c"] > window["ema_slow"] - tol).all())
        extreme = float(window["l"].min())
    else:
        aligned = bool(last["ema_fast"] < last["ema_slow"])
        touched = bool((window["h"] >= window["ema_fast"] - tol).any())
        held = bool((window["c"] < window["ema_slow"] + tol).all())
        extreme = float(window["h"].max())
    checks = {"4h_emas_aligned": aligned, "4h_touched_ema20_zone": touched, "4h_held_ema50": held}
    return aligned and touched and held, checks, extreme
