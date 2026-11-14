"""EMA crossover strategy (EXP-002 in docs/experiments.md).

Signals fire only on the 1H bar whose close coincides with the close of a completed
candle on the crossover timeframe, so nothing uses a still-forming candle.
"""
from __future__ import annotations

import numpy as np
import pandas as pd

from app.storage.models import Direction, Signal
from app.strategy.indicators import atr, ema
from app.strategy.signals import PreparedMarket

FAST, SLOW, ATR_N, STOP_ATR, NOMINAL_R = 20, 50, 14, 2.0, 2.0
VARIANTS = {"ema_cross_4h": ("4h", True), "ema_cross_1d": ("1d", False)}


def _cross_frame(df: pd.DataFrame) -> pd.DataFrame:
    f = df[["t", "close_t", "o", "h", "l", "c", "v"]].copy()
    f["x_fast"] = ema(f["c"], FAST)
    f["x_slow"] = ema(f["c"], SLOW)
    f["x_atr"] = atr(f, ATR_N)
    above = (f["x_fast"] > f["x_slow"]).astype(int)
    f["cross"] = above.diff().fillna(0).astype(int)     # +1 up-cross, -1 down-cross
    return f


class CrossStrategy:
    def __init__(self, pm: PreparedMarket, variant: str):
        self.pm = pm
        self.variant = variant
        tf, self.use_filter = VARIANTS[variant]
        self.frame = _cross_frame(pm.h4 if tf == "4h" else pm.d1)
        self._close_idx = {int(t): k for k, t in enumerate(self.frame["close_t"].to_numpy())}
        self._d1_close = pm.d1["close_t"].to_numpy()
        self._h1_close = pm.h1["close_t"].to_numpy()
        self._cross = self.frame["cross"].to_numpy()

    def _row_closing_at(self, T: int) -> int | None:
        return self._close_idx.get(T)

    def opposite_cross_at(self, T: int, direction: str) -> bool:
        k = self._row_closing_at(T)
        if k is None:
            return False
        c = int(self.frame["cross"].iloc[k])
        return c == (-1 if direction == "long" else 1)

    def evaluate(self, i: int | None = None) -> Signal:
        i = len(self.pm.h1) - 1 if i is None else i
        T = int(self._h1_close[i])
        sig = Signal(market=self.pm.market, direction=None, timestamp_ms=T, expires_ms=T + 3_600_000,
                     trend="neutral", pullback=False, confirmation=False)
        k = self._row_closing_at(T)
        if k is None or k < 2 * SLOW:
            return sig
        cross = int(self._cross[k])
        if cross == 0:
            # No entry event. "trend" stays "neutral" (it only means "no signal" for this strategy),
            # so say what the strategy is actually waiting for.
            sig.checks = {"ema_cross": False}
            sig.notes.append("no 4H EMA20/50 crossover on the last completed 4H bar")
            return sig
        bar = self.pm.h1.iloc[i]
        direction = "long" if cross > 0 else "short"
        sig.checks = {"ema_cross": True}
        if self.use_filter:
            di = int(np.searchsorted(self._d1_close, T, side="right")) - 1
            if di < 200:
                sig.checks["trend_filter"] = False
                return sig
            d = self.pm.d1.iloc[di]
            ok = d["c"] > d["ema_slow"] if direction == "long" else d["c"] < d["ema_slow"]
            sig.checks["trend_filter"] = bool(ok)
            if not ok:
                return sig
        sig.trend = "bullish" if direction == "long" else "bearish"
        entry = float(bar["c"])
        dist = STOP_ATR * float(self.frame["x_atr"].iloc[k])
        sig.direction = Direction(direction)
        sig.pullback = sig.confirmation = True
        sig.entry = entry
        sig.stop = entry - dist if direction == "long" else entry + dist
        sig.target = entry + NOMINAL_R * dist if direction == "long" else entry - NOMINAL_R * dist
        sig.reward_risk = NOMINAL_R
        return sig
