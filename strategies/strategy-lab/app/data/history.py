"""Fetch historical candles/funding into SQLite and load them for the strategy."""
from __future__ import annotations

import logging
import time

from app.config import Config
from app.data.candles import completed_only, find_gaps, to_frame
from app.data.market_data import HyperliquidInfo, binance_candles
from app.storage.database import Database
from app.strategy.signals import PreparedMarket

log = logging.getLogger(__name__)

INTERVALS = ("1d", "4h", "1h")
DAY_MS = 86_400_000


def fetch_history(db: Database, info: HyperliquidInfo, source: str, markets: tuple[str, ...],
                  days: int) -> dict[str, dict[str, int]]:
    now = int(time.time() * 1000)
    start = now - days * DAY_MS
    report: dict[str, dict[str, int]] = {}
    for m in markets:
        report[m] = {}
        for iv in INTERVALS:
            # Daily candles need ~200 extra days of warm-up for the EMA200.
            s = start - 400 * DAY_MS if iv == "1d" else start - 60 * DAY_MS
            if source == "hyperliquid":
                rows = info.candles(m, iv, s, now)
            elif source == "binance":
                rows = binance_candles(m, iv, s, now)
            else:
                raise ValueError(f"unknown source {source}")
            rows = completed_only(rows, now)
            db.upsert_candles(source, m, iv, rows)
            gaps = find_gaps(rows, iv)
            if gaps:
                log.warning("%s %s %s: %d gap(s) in fetched data", source, m, iv, len(gaps))
            report[m][iv] = len(rows)
        # Funding always comes from Hyperliquid (the venue we would trade on).
        stored = db.load_funding(m)
        f_start = max(start, stored[-1][0] + 1) if stored else start
        f = info.funding_history(m, f_start)
        db.upsert_funding(m, f)
        report[m]["funding"] = len(stored) + len(f)
    return report


def load_prepared(db: Database, cfg: Config, source: str) -> dict[str, PreparedMarket]:
    out = {}
    for m in cfg.trading.allowed_assets:
        frames = {iv: to_frame(db.load_candles(source, m, iv)) for iv in INTERVALS}
        if any(len(f) == 0 for f in frames.values()):
            raise RuntimeError(f"no {source} data for {m}; run: python -m app.main fetch --source {source}")
        out[m] = PreparedMarket(m, frames["1d"], frames["4h"], frames["1h"], cfg.strategy)
    return out


def load_funding(db: Database, markets: tuple[str, ...]) -> dict[str, dict[int, float]]:
    from app.timeutil import hour_floor
    return {m: {hour_floor(t): r for t, r in db.load_funding(m)} for m in markets}
