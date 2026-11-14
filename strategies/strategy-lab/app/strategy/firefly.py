"""Firefly: trend entries gated by market synchrony (EXP-003).

Entries are the 4H EMA20/50 crossover with the daily EMA200 filter. The Kuramoto
synchrony index decides whether an entry is taken:
    F0 control: always      F1 firefly: only when synchronized      F2 placebo: only when not
"""
from __future__ import annotations

import numpy as np
import pandas as pd

from app.storage.models import Signal
from app.strategy.ema_cross import CrossStrategy
from app.strategy.signals import PreparedMarket

VARIANTS = {"F0": None, "F1": True, "F2": False}
NAMES = {"F0": "Control (no filter)", "F1": "Firefly (synced only)", "F2": "Placebo (unsynced only)"}


class FireflyStrategy:
    def __init__(self, pm: PreparedMarket, sync: pd.DataFrame, variant: str = "F1"):
        """sync: output of synchrony.order_parameter, indexed by candle close time (ms)."""
        self.cross = CrossStrategy(pm, "ema_cross_4h")
        self.want = VARIANTS[variant]
        self.variant = variant
        self._t = sync.index.to_numpy(dtype="int64")
        self._synced = sync["synced"].to_numpy(dtype=bool)
        self._rs = sync["R_s"].to_numpy(dtype=float)
        self._base = sync["baseline"].to_numpy(dtype=float)

    def sync_at(self, T: int) -> tuple[bool | None, float | None, float | None]:
        """Latest synchrony reading known at time T (index row closing at or before T)."""
        k = int(np.searchsorted(self._t, T, side="right")) - 1
        if k < 0 or np.isnan(self._base[k]):
            return None, None, None
        # Stale index (data gap of more than one day) counts as unknown.
        if T - self._t[k] > 24 * 3_600_000:
            return None, None, None
        return bool(self._synced[k]), float(self._rs[k]), float(self._base[k])

    def opposite_cross_at(self, T: int, direction: str) -> bool:
        return self.cross.opposite_cross_at(T, direction)

    def evaluate(self, i: int | None = None) -> Signal:
        sig = self.cross.evaluate(i)
        if not sig.is_candidate or self.want is None:
            return sig
        synced, rs, base = self.sync_at(sig.timestamp_ms)
        sig.snapshot = {**sig.snapshot, "sync_R": rs, "sync_baseline": base, "synced": synced}
        ok = synced is not None and synced == self.want
        sig.checks["synchrony_filter"] = ok
        if not ok:
            sig.confirmation = False
            sig.notes.append(f"synchrony filter: synced={synced} (R={rs}, baseline={base})")
        return sig
