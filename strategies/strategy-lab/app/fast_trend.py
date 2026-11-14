"""EXP-024 "Fast trend": a 4H trend filter with 1H breakout entries (see docs/experiments.md).

The slow books (pullback, firefly) wait for daily EMA50/200 alignment or a fresh 4H EMA cross,
so a sharp move inside an established 4H trend never triggers them. This strategy reacts within hours:

  trend   (last completed 4H bar)  bearish: EMA20 < EMA50 and close < EMA50   (bullish: mirror)
  entry   (last completed 1H bar)  close breaks the low (high) of the previous 24 1H bars, in trend direction
  stop    2.5 x ATR14(4H) beyond the entry
  trail   once the trade is +1R, the stop trails 3 x ATR behind the best price seen (only tightens)
  exits   stop / trailing stop, the 4H trend no longer aligned, or 7 days
  re-entry none on that market for 4 hours after an exit
  size    1% of equity at risk, notional capped at 1x equity per position

Signal maths lives here so the backtest and the paper book run the same code. Paper only.
"""
from __future__ import annotations

from dataclasses import dataclass

import numpy as np

# Chosen from a 16-variant grid (docs/experiments.md EXP-024); the registered 12/1.5/1.5 version lost after costs.
H4_FAST, H4_SLOW, ATR_N, BREAKOUT_BARS = 20, 50, 14, 24
STOP_ATR, TRAIL_ATR, TRAIL_ACTIVATE_R = 2.5, 3.0, 1.0
HOLD_DAYS, COOLDOWN_HOURS, RISK, MAX_NOTIONAL_X = 7, 4, 0.01, 1.0
H4_WARMUP = 3 * H4_SLOW
HOUR = 3_600_000


def ema(x: np.ndarray, n: int) -> np.ndarray:
    a, out = 2 / (n + 1), np.empty(len(x))
    out[0] = x[0]
    for i in range(1, len(x)):
        out[i] = a * x[i] + (1 - a) * out[i - 1]
    return out


def atr_series(h: np.ndarray, lo: np.ndarray, c: np.ndarray, n: int = ATR_N) -> np.ndarray:
    """Simple-mean ATR; out[i] uses bars up to and including i (nan until n bars of TR exist)."""
    tr = np.empty(len(c))
    tr[0] = h[0] - lo[0]
    tr[1:] = np.maximum(h[1:] - lo[1:], np.maximum(abs(h[1:] - c[:-1]), abs(lo[1:] - c[:-1])))
    out = np.full(len(c), np.nan)
    cs = np.cumsum(tr)
    out[n:] = (cs[n:] - cs[:-n]) / n
    return out


def trend_4h(c4: np.ndarray) -> tuple[np.ndarray, np.ndarray]:
    """Per 4H bar: +1 bullish, -1 bearish, 0 neutral; and EMA-cross side (+1 fast above slow, -1 below)."""
    f, s = ema(c4, H4_FAST), ema(c4, H4_SLOW)
    trend = np.where((f > s) & (c4 > s), 1, np.where((f < s) & (c4 < s), -1, 0))
    trend[:H4_WARMUP] = 0
    return trend, np.sign(f - s)


def breakout(h1: np.ndarray, l1: np.ndarray, c1: np.ndarray, i: int) -> int:
    """+1 if 1H close i breaks the previous BREAKOUT_BARS bars' high, -1 if it breaks their low, else 0."""
    if i < BREAKOUT_BARS:
        return 0
    if c1[i] > h1[i - BREAKOUT_BARS:i].max():
        return 1
    if c1[i] < l1[i - BREAKOUT_BARS:i].min():
        return -1
    return 0


@dataclass
class Signal:
    long: bool
    ref: float            # 1H close that triggered
    atr: float            # 4H ATR at the signal
    stop_dist: float


def signal(h1, l1, c1, h4, l4, c4) -> Signal | None:
    """Decide on the last completed 1H bar (arrays) and the last completed 4H bar (arrays)."""
    if len(c4) < H4_WARMUP + 1 or len(c1) < BREAKOUT_BARS + 1:
        return None
    trend, _ = trend_4h(c4)
    a = atr_series(h4, l4, c4)[-1]
    side = breakout(h1, l1, c1, len(c1) - 1)
    if not side or side != trend[-1] or not np.isfinite(a) or a <= 0:
        return None
    return Signal(long=side > 0, ref=float(c1[-1]), atr=float(a), stop_dist=STOP_ATR * float(a))


def trend_still_aligned(c4: np.ndarray, long: bool) -> bool:
    """Exit rule: stay in while the 4H EMA20/50 order still points our way."""
    _, side = trend_4h(c4)
    return side[-1] == (1 if long else -1)


def trail_stop(long: bool, entry: float, stop: float, best: float, atr: float, init_dist: float) -> float:
    """New stop after the best price seen; only tightens; active once the trade is +1R."""
    if (best - entry) * (1 if long else -1) < TRAIL_ACTIVATE_R * init_dist:
        return stop
    new = best - TRAIL_ATR * atr if long else best + TRAIL_ATR * atr
    return max(stop, new) if long else min(stop, new)


# -- backtest ------------------------------------------------------------------
def backtest(c1h: dict[str, np.ndarray], c4h: dict[str, np.ndarray], cost_side: float) -> list[dict]:
    """c1h / c4h: arrays t (open ms), o, h, l, c. Signal on 1H close i, fill at bar i+1 open.
    Stops are checked on each later bar's high/low before the trail is updated with that bar
    (conservative ordering). cost_side = taker fee + slippage per side, as a fraction."""
    t1, o1, h1, l1, c1 = (c1h[k] for k in ("t", "o", "h", "l", "c"))
    t4, h4, l4, c4 = (c4h[k] for k in ("t", "h", "l", "c"))
    trend, side4 = trend_4h(c4)
    atr4 = atr_series(h4, l4, c4)
    close4 = t4 + 4 * HOUR
    trades, pos, cool_until = [], None, 0
    for i in range(BREAKOUT_BARS, len(c1) - 1):
        T = int(t1[i]) + HOUR                                   # this 1H bar's close
        k = int(np.searchsorted(close4, T, side="right")) - 1   # last 4H bar closed by T
        if k < H4_WARMUP:
            continue
        if pos:
            # exits evaluated on bar i (the bar after the entry bar onward)
            lng = pos["long"]
            hit = l1[i] <= pos["stop"] if lng else h1[i] >= pos["stop"]
            reason = None
            if hit:
                px, reason = pos["stop"], "stop" if not pos["trailed"] else "trail_stop"
                px = min(px, o1[i]) if lng else max(px, o1[i])     # gap through the stop
            else:
                pos["best"] = max(pos["best"], h1[i]) if lng else min(pos["best"], l1[i])
                new = trail_stop(lng, pos["entry"], pos["stop"], pos["best"], pos["atr"], pos["dist"])
                if new != pos["stop"]:
                    pos["stop"], pos["trailed"] = new, True
                if side4[k] != (1 if lng else -1):
                    px, reason = o1[i + 1], "trend_exit"
                elif T - pos["t"] >= HOLD_DAYS * 86_400_000:
                    px, reason = o1[i + 1], "time"
            if reason:
                g = (px / pos["entry"] - 1) * (1 if lng else -1) - 2 * cost_side
                trades.append({"t": pos["t"], "exit_t": T, "long": lng, "ret": g, "r": g / (pos["dist"] / pos["entry"]),
                               "reason": reason})
                pos, cool_until = None, T + COOLDOWN_HOURS * HOUR
            continue
        if T < cool_until:
            continue
        s = breakout(h1, l1, c1, i)
        a = atr4[k]
        if not s or s != trend[k] or not np.isfinite(a):
            continue
        entry, dist = float(o1[i + 1]), STOP_ATR * float(a)
        lng = s > 0
        pos = {"t": T, "long": lng, "entry": entry, "dist": dist, "atr": float(a), "best": entry, "trailed": False,
               "stop": entry - dist if lng else entry + dist}
    return trades


def summarize(trades: list[dict]) -> dict:
    if not trades:
        return {"trades": 0}
    r = np.array([x["r"] for x in trades])
    ret = np.array([x["ret"] for x in trades])
    # 1% risk per trade compounding: equity multiplier per trade = 1 + 0.01 * R (capped notional ignored)
    eq = np.cumprod(1 + RISK * r)
    peak = np.maximum.accumulate(eq)
    return {"trades": len(r), "win": float((r > 0).mean()), "exp_r": float(r.mean()),
            "t": float(r.mean() / (r.std(ddof=1) / np.sqrt(len(r)))) if len(r) > 2 else None,
            "avg_ret": float(ret.mean()), "growth_at_1pct": float(eq[-1] - 1), "max_dd": float((1 - eq / peak).max())}
