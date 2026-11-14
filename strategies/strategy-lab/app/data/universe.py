"""Multi-asset universe for the market synchrony (Kuramoto) index.

A fixed list of large coins that traded throughout 2021-2026, chosen by listing
date and size, not by performance. (It is still today's survivors, a mild
survivorship bias for an index that measures co-movement, not returns.)
"""
from __future__ import annotations

import logging
import time

import requests

from app.data.candles import completed_only
from app.data.market_data import BINANCE_URL, HyperliquidInfo, MarketDataError
from app.data.candles import normalize_binance, validate_rows, dedupe_sorted, INTERVAL_MS
from app.storage.database import Database

log = logging.getLogger(__name__)

UNIVERSE = ("BTC ETH SOL BNB XRP ADA DOGE AVAX DOT LINK LTC BCH ATOM UNI ETC FIL NEAR AAVE ALGO XLM TRX "
            "SAND MANA AXS CRV SUSHI COMP MKR SNX YFI EGLD THETA ICP RUNE ZEC DASH XTZ 1INCH").split()

SYNC_INTERVAL = "4h"


def _binance(coin: str, interval: str, start_ms: int, end_ms: int, s: requests.Session) -> list[dict]:
    step = INTERVAL_MS[interval]
    out, cursor = [], start_ms
    while cursor < end_ms:
        r = s.get(BINANCE_URL, params={"symbol": coin + "USDT", "interval": interval, "startTime": cursor,
                                       "endTime": end_ms, "limit": 1000}, timeout=20)
        if r.status_code == 400:
            return []          # symbol not listed
        r.raise_for_status()
        raw = r.json()
        if not raw:
            break
        out.extend(normalize_binance(raw, interval))
        cursor = int(raw[-1][0]) + step
        if len(raw) < 1000:
            break
        time.sleep(0.15)
    return dedupe_sorted(validate_rows(out))


def fetch_universe(db: Database, source: str, days: int, coins: tuple[str, ...] | list[str] = UNIVERSE,
                   info: HyperliquidInfo | None = None) -> dict[str, int]:
    now = int(time.time() * 1000)
    start = now - days * 86_400_000
    report: dict[str, int] = {}
    s = requests.Session()
    for c in coins:
        try:
            if source == "binance":
                rows = _binance(c, SYNC_INTERVAL, start, now, s)
            else:
                rows = (info or HyperliquidInfo("https://api.hyperliquid.xyz")).candles(c, SYNC_INTERVAL, start, now)
                time.sleep(0.3)
        except (requests.RequestException, MarketDataError) as e:
            log.warning("%s %s: %s", source, c, e)
            report[c] = -1
            continue
        rows = completed_only(rows, now)
        if rows:
            db.upsert_candles(source, c, SYNC_INTERVAL, rows)
        report[c] = len(rows)
    return report
