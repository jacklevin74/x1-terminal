"""Hyperliquid public info API (REST) and a Binance history fetcher for research.

Hyperliquid is the authoritative source for anything used in live decisions.
Binance klines are only used to extend backtest history (HL serves ~5000 candles
per interval, i.e. ~7 months of 1H data). Results from Binance data are a proxy
for the Hyperliquid venue, not a substitute.
"""
from __future__ import annotations

import logging
import time
from typing import Any

import requests

from app.data.candles import (INTERVAL_MS, dedupe_sorted, normalize_binance, normalize_hl,
                              validate_rows)

log = logging.getLogger(__name__)


class MarketDataError(RuntimeError):
    pass


class HyperliquidInfo:
    def __init__(self, base_url: str, timeout: float = 15.0, retries: int = 5):
        self.url = base_url.rstrip("/") + "/info"
        self.timeout = timeout
        self.retries = retries
        self.session = requests.Session()

    def _post(self, body: dict[str, Any]) -> Any:
        last: Exception | None = None
        for attempt in range(self.retries):
            try:
                r = self.session.post(self.url, json=body, timeout=self.timeout)
                if r.status_code == 429:
                    last = MarketDataError("rate limited (429)")
                    time.sleep(5 * (attempt + 1))
                    continue
                r.raise_for_status()
                return r.json()
            except (requests.RequestException, ValueError, MarketDataError) as e:
                last = e
                time.sleep(min(2 ** attempt, 8))
        raise MarketDataError(f"info request {body.get('type')} failed: {last}")

    def candles(self, coin: str, interval: str, start_ms: int, end_ms: int) -> list[dict[str, Any]]:
        """Paginate forward until end_ms. HL caps each response at 5000 candles."""
        step = INTERVAL_MS[interval]
        out: list[dict[str, Any]] = []
        cursor = start_ms
        while cursor < end_ms:
            raw = self._post({"type": "candleSnapshot",
                              "req": {"coin": coin, "interval": interval, "startTime": cursor, "endTime": end_ms}})
            if not raw:
                break
            rows = normalize_hl(raw, interval)
            out.extend(rows)
            nxt = rows[-1]["t"] + step
            if nxt <= cursor:
                break
            cursor = nxt
            if len(raw) < 4999:
                break
        return dedupe_sorted(validate_rows(out))

    def all_mids(self) -> dict[str, float]:
        return {k: float(v) for k, v in self._post({"type": "allMids"}).items()}

    def l2_book(self, coin: str) -> dict[str, Any]:
        raw = self._post({"type": "l2Book", "coin": coin})
        bids, asks = raw["levels"]
        if not bids or not asks:
            raise MarketDataError(f"empty book for {coin}")
        return {
            "time": int(raw["time"]),
            "bids": [(float(b["px"]), float(b["sz"])) for b in bids],
            "asks": [(float(a["px"]), float(a["sz"])) for a in asks],
        }

    def meta_and_ctxs(self) -> tuple[dict[str, Any], list[dict[str, Any]]]:
        meta, ctxs = self._post({"type": "metaAndAssetCtxs"})
        return meta, ctxs

    def funding_history(self, coin: str, start_ms: int, end_ms: int | None = None) -> list[tuple[int, float]]:
        out: list[tuple[int, float]] = []
        cursor = start_ms
        end_ms = end_ms or int(time.time() * 1000)
        while cursor < end_ms:
            raw = self._post({"type": "fundingHistory", "coin": coin, "startTime": cursor, "endTime": end_ms})
            if not raw:
                break
            out.extend((int(r["time"]), float(r["fundingRate"])) for r in raw)
            nxt = int(raw[-1]["time"]) + 1
            if nxt <= cursor or len(raw) < 500:
                break
            cursor = nxt
            time.sleep(0.5)  # stay well under the info endpoint's weight limit
        return sorted(set(out))

    # -- account endpoints (read-only, used for testnet reconciliation) ----
    def user_state(self, address: str) -> dict[str, Any]:
        return self._post({"type": "clearinghouseState", "user": address})

    def open_orders(self, address: str) -> list[dict[str, Any]]:
        return self._post({"type": "frontendOpenOrders", "user": address})

    def order_status_by_cloid(self, address: str, cloid: str) -> dict[str, Any]:
        return self._post({"type": "orderStatus", "user": address, "oid": cloid})


BINANCE_URL = "https://data-api.binance.vision/api/v3/klines"
BINANCE_SYMBOL = {"BTC": "BTCUSDT", "ETH": "ETHUSDT"}


def binance_candles(coin: str, interval: str, start_ms: int, end_ms: int) -> list[dict[str, Any]]:
    step = INTERVAL_MS[interval]
    out: list[dict[str, Any]] = []
    cursor = start_ms
    s = requests.Session()
    while cursor < end_ms:
        r = s.get(BINANCE_URL, params={"symbol": BINANCE_SYMBOL.get(coin, coin + "USDT"), "interval": interval,
                                       "startTime": cursor, "endTime": end_ms, "limit": 1000}, timeout=20)
        if r.status_code == 400:
            return []          # symbol not listed on Binance
        r.raise_for_status()
        raw = r.json()
        if not raw:
            break
        out.extend(normalize_binance(raw, interval))
        cursor = int(raw[-1][0]) + step
        if len(raw) < 1000:
            break
    return dedupe_sorted(validate_rows(out))
