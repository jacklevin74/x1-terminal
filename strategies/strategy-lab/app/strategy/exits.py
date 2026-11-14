"""Exit rules beyond the initial stop (EXP-001 in docs/experiments.md).

All functions use only completed-bar data supplied by the caller. The stop they
return applies from the NEXT bar onward.
"""
from __future__ import annotations


def trailing_stop(direction: str, entry: float, initial_stop: float, current_stop: float, extreme: float,
                  atr4: float, atr_mult: float, activate_r: float) -> float:
    """Chandelier stop: extreme since entry -/+ atr_mult * 4H ATR, active once price has
    moved `activate_r` R in favor. Never loosens, never looser than the initial stop."""
    risk = abs(entry - initial_stop)
    if direction == "long":
        if extreme - entry < activate_r * risk:
            return current_stop
        return max(current_stop, initial_stop, extreme - atr_mult * atr4)
    if entry - extreme < activate_r * risk:
        return current_stop
    return min(current_stop, initial_stop, extreme + atr_mult * atr4)


def trend_broken(direction: str, daily_close: float, daily_ema_fast: float) -> bool:
    """Daily close on the wrong side of the daily EMA50."""
    return daily_close < daily_ema_fast if direction == "long" else daily_close > daily_ema_fast
