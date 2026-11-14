from __future__ import annotations

from datetime import datetime, timezone

HOUR_MS = 3_600_000
WEEK_MS = 7 * 24 * HOUR_MS
# 1970-01-05 was a Monday; offsetting by 4 days aligns week buckets to Monday 00:00 UTC.
_MONDAY_OFFSET = 4 * 24 * HOUR_MS


def week_start_ms(ts_ms: int) -> int:
    return ((ts_ms - _MONDAY_OFFSET) // WEEK_MS) * WEEK_MS + _MONDAY_OFFSET


def hour_floor(ts_ms: int) -> int:
    return (ts_ms // HOUR_MS) * HOUR_MS


def iso(ts_ms: int | None) -> str:
    if ts_ms is None:
        return "-"
    return datetime.fromtimestamp(ts_ms / 1000, tz=timezone.utc).strftime("%Y-%m-%d %H:%M")
