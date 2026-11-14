"""Combine trend, pullback and confirmation into a Signal.

`PreparedMarket` computes indicators once over full completed-candle series.
`evaluate(i)` then looks only at rows whose candle closed at or before the close
of 1H bar i, so the same code path serves backtests (any i) and live trading
(the last i) with no look-ahead.
"""
from __future__ import annotations

import numpy as np
import pandas as pd

from app.config import StrategyCfg
from app.storage.models import Direction, Signal
from app.strategy.confirmation import add_confirmation_indicators, detect_confirmation
from app.strategy.pullback import add_setup_indicators, detect_pullback
from app.strategy.trend_filter import add_daily_indicators, classify_trend

H = 3_600_000


class PreparedMarket:
    def __init__(self, market: str, d1: pd.DataFrame, h4: pd.DataFrame, h1: pd.DataFrame, cfg: StrategyCfg):
        self.market = market
        self.cfg = cfg
        self.d1 = add_daily_indicators(d1, cfg)
        self.h4 = add_setup_indicators(h4, cfg)
        self.h1 = add_confirmation_indicators(h1, cfg)
        self._d1_close = self.d1["close_t"].to_numpy()
        self._h4_close = self.h4["close_t"].to_numpy()

    def __len__(self) -> int:
        return len(self.h1)

    def _idx_at(self, closes: np.ndarray, t: int) -> int:
        return int(np.searchsorted(closes, t, side="right")) - 1

    def evaluate(self, i: int | None = None) -> Signal:
        cfg = self.cfg
        i = len(self.h1) - 1 if i is None else i
        bar = self.h1.iloc[i]
        t = int(bar["close_t"])
        sig = Signal(market=self.market, direction=None, timestamp_ms=t,
                     expires_ms=t + cfg.signal_ttl_minutes * 60_000, trend="neutral",
                     pullback=False, confirmation=False)

        di = self._idx_at(self._d1_close, t)
        hi = self._idx_at(self._h4_close, t)
        if di < cfg.daily_ema_slow or hi < cfg.setup_ema_slow * 2 or i < cfg.volume_period + cfg.swing_lookback:
            sig.notes.append("insufficient history for indicators")
            sig.checks["data_sufficient"] = False
            return sig
        d_row, h_row = self.d1.iloc[di], self.h4.iloc[hi]
        # A gap in higher-timeframe data means we would be judging on an old candle.
        if t - int(d_row["close_t"]) > 25 * H or t - int(h_row["close_t"]) > 5 * H:
            sig.notes.append("higher-timeframe candle is missing (data gap)")
            sig.checks["data_sufficient"] = False
            return sig
        sig.checks["data_sufficient"] = True

        trend = classify_trend(d_row)
        sig.trend = trend
        sig.checks["daily_trend_defined"] = trend != "neutral"
        sig.snapshot = self._snapshot(d_row, h_row, bar, trend)
        if trend == "neutral":
            sig.notes.append("daily trend is neutral: no trade")
            return sig
        direction = "long" if trend == "bullish" else "short"
        sig.direction = Direction(direction)

        window = self.h4.iloc[hi - cfg.pullback_lookback_bars + 1: hi + 1]
        pb, pb_checks, extreme = detect_pullback(window, direction, cfg)
        sig.pullback = pb
        sig.checks.update(pb_checks)

        conf, conf_checks = detect_confirmation(bar, direction, cfg)
        sig.confirmation = conf
        sig.checks.update(conf_checks)
        sig.snapshot["timeframes"]["4h"]["pullback"] = pb
        sig.snapshot["timeframes"]["1h"]["confirmation"] = conf
        sig.snapshot["timeframes"]["1h"]["volume_confirmation"] = conf_checks["1h_volume"]
        if not (pb and conf):
            return sig

        atr4 = float(h_row["atr"])
        entry = float(bar["c"])
        if direction == "long":
            stop = min(extreme, float(bar["l"])) - cfg.stop_atr_buffer * atr4
            dist = entry - stop
            target = entry + cfg.target_r * dist
        else:
            stop = max(extreme, float(bar["h"])) + cfg.stop_atr_buffer * atr4
            dist = stop - entry
            target = entry - cfg.target_r * dist
        sig.atr_4h = atr4
        stop_ok = dist > 0 and dist <= cfg.max_stop_atr * atr4
        sig.checks["stop_within_max_atr"] = stop_ok
        if not stop_ok:
            sig.notes.append(f"stop distance {dist:.2f} exceeds {cfg.max_stop_atr} x 4H ATR {atr4:.2f}")
            sig.confirmation = False
            return sig
        sig.entry, sig.stop, sig.target = entry, stop, target
        sig.reward_risk = abs(target - entry) / dist
        sig.snapshot["proposal"] = {"direction": direction, "entry": entry, "stop": round(stop, 6),
                                    "target": round(target, 6), "reward_risk": round(sig.reward_risk, 3),
                                    "stop_distance_pct": round(dist / entry * 100, 3)}
        return sig

    def _snapshot(self, d: pd.Series, h: pd.Series, b: pd.Series, trend: str) -> dict:
        r = lambda x: round(float(x), 6)  # noqa: E731
        return {
            "symbol": self.market,
            "as_of_ms": int(b["close_t"]),
            "timeframes": {
                "1d": {"close": r(d["c"]), "ema50": r(d["ema_fast"]), "ema200": r(d["ema_slow"]), "trend": trend},
                "4h": {"close": r(h["c"]), "ema20": r(h["ema_fast"]), "ema50": r(h["ema_slow"]),
                       "atr14": r(h["atr"]), "pullback": False},
                "1h": {"open": r(b["o"]), "high": r(b["h"]), "low": r(b["l"]), "close": r(b["c"]),
                       "volume": r(b["v"]), "volume_avg20": r(b["vol_mean"]),
                       "prior_high": r(b["prior_high"]), "prior_low": r(b["prior_low"]),
                       "confirmation": False, "volume_confirmation": False},
            },
        }


def anchor_target(stop: float, exec_px: float, direction: str, target_r: float) -> float:
    """Re-measure the target from the price we would actually pay, so the planned
    reward/risk holds after spread and price drift. The stop never moves."""
    dist = abs(exec_px - stop)
    return exec_px + target_r * dist if direction == "long" else exec_px - target_r * dist
