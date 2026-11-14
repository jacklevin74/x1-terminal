"""Candle normalization, validation and completeness checks."""
from __future__ import annotations

import logging
from typing import Any

import pandas as pd

log = logging.getLogger(__name__)

INTERVAL_MS = {"1h": 3_600_000, "4h": 14_400_000, "1d": 86_400_000}


class CandleError(ValueError):
    pass


def normalize_hl(raw: list[dict[str, Any]], interval: str) -> list[dict[str, Any]]:
    """Hyperliquid candleSnapshot rows -> canonical dicts. close_t is exclusive."""
    step = INTERVAL_MS[interval]
    out = []
    for r in raw:
        t = int(r["t"])
        out.append({"t": t, "close_t": t + step, "o": float(r["o"]), "h": float(r["h"]),
                    "l": float(r["l"]), "c": float(r["c"]), "v": float(r["v"])})
    return out


def normalize_binance(raw: list[list[Any]], interval: str) -> list[dict[str, Any]]:
    step = INTERVAL_MS[interval]
    return [{"t": int(k[0]), "close_t": int(k[0]) + step, "o": float(k[1]), "h": float(k[2]),
             "l": float(k[3]), "c": float(k[4]), "v": float(k[5])} for k in raw]


def validate_rows(rows: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """Drop malformed candles (bad OHLC relationships, non-positive prices)."""
    good = []
    for r in rows:
        o, h, l, c = r["o"], r["h"], r["l"], r["c"]
        if min(o, h, l, c) <= 0 or r["v"] < 0 or h < max(o, c) or l > min(o, c) or h < l:
            log.warning("dropping malformed candle t=%s %s", r["t"], r)
            continue
        good.append(r)
    return good


def completed_only(rows: list[dict[str, Any]], now_ms: int) -> list[dict[str, Any]]:
    """Strategy logic must never see a candle that is still forming."""
    return [r for r in rows if r["close_t"] <= now_ms]


def dedupe_sorted(rows: list[dict[str, Any]]) -> list[dict[str, Any]]:
    by_t = {r["t"]: r for r in rows}
    return [by_t[t] for t in sorted(by_t)]


def find_gaps(rows: list[dict[str, Any]], interval: str) -> list[tuple[int, int]]:
    """Return (from_t, to_t) pairs where consecutive candles are not adjacent."""
    step = INTERVAL_MS[interval]
    gaps = []
    for a, b in zip(rows, rows[1:]):
        if b["t"] - a["t"] != step:
            gaps.append((a["t"], b["t"]))
    return gaps


def to_frame(rows: list[dict[str, Any]]) -> pd.DataFrame:
    if not rows:
        return pd.DataFrame(columns=["t", "close_t", "o", "h", "l", "c", "v"])
    df = pd.DataFrame(rows)[["t", "close_t", "o", "h", "l", "c", "v"]].astype(
        {"t": "int64", "close_t": "int64", "o": "float64", "h": "float64", "l": "float64",
         "c": "float64", "v": "float64"})
    return df.reset_index(drop=True)


def require_fresh_history(rows: list[dict[str, Any]], interval: str, now_ms: int,
                          min_bars: int) -> None:
    """Raise if the series is too short, has gaps near the end, or the last completed
    candle is not the most recent one that should exist."""
    if len(rows) < min_bars:
        raise CandleError(f"{interval}: only {len(rows)} candles, need {min_bars}")
    step = INTERVAL_MS[interval]
    expected_last_close = (now_ms // step) * step
    if rows[-1]["close_t"] < expected_last_close:
        raise CandleError(
            f"{interval}: last completed candle closes at {rows[-1]['close_t']}, expected {expected_last_close}")
    tail = rows[-min_bars:]
    gaps = find_gaps(tail, interval)
    if gaps:
        raise CandleError(f"{interval}: {len(gaps)} gap(s) in the last {min_bars} candles, first at {gaps[0]}")
