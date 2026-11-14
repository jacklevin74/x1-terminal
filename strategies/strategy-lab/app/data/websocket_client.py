"""Hyperliquid WebSocket price feed with reconnect and staleness tracking.

Subscribes to l2Book for each market and keeps the latest best bid/ask. If the
connection drops it reconnects with backoff and refreshes from REST so no
decision is made from a pre-disconnect price. Consumers call `quote()`, which
returns None when the data is stale.
"""
from __future__ import annotations

import json
import logging
import threading
import time
from dataclasses import dataclass

import websocket

from app.data.market_data import HyperliquidInfo

log = logging.getLogger(__name__)


@dataclass
class Quote:
    bid: float
    ask: float
    received_at: float   # local monotonic-ish wall time (time.time())

    @property
    def age(self) -> float:
        return time.time() - self.received_at


class PriceFeed:
    def __init__(self, ws_url: str, info: HyperliquidInfo, coins: tuple[str, ...],
                 stale_after: float = 120.0):
        self.ws_url = ws_url
        self.info = info
        self.coins = coins
        self.stale_after = stale_after
        self._quotes: dict[str, Quote] = {}
        self._lock = threading.Lock()
        self._stop = threading.Event()
        self._ws: websocket.WebSocketApp | None = None
        self._thread: threading.Thread | None = None
        self.connected = False
        self.reconnects = 0
        self.last_error: str | None = None

    # -- public -----------------------------------------------------------
    def start(self) -> None:
        self.refresh_from_rest()
        self._thread = threading.Thread(target=self._run, name="hl-ws", daemon=True)
        self._thread.start()

    def stop(self) -> None:
        self._stop.set()
        if self._ws:
            self._ws.close()

    def quote(self, coin: str) -> Quote | None:
        with self._lock:
            q = self._quotes.get(coin)
        if q is None or q.age > self.stale_after:
            return None
        return q

    def raw_quote(self, coin: str) -> Quote | None:
        with self._lock:
            return self._quotes.get(coin)

    def refresh_from_rest(self) -> None:
        for c in self.coins:
            try:
                book = self.info.l2_book(c)
                self._set(c, book["bids"][0][0], book["asks"][0][0])
            except Exception as e:  # noqa: BLE001 - feed stays stale, consumers will reject
                self.last_error = f"REST refresh {c}: {e}"
                log.warning(self.last_error)

    def health(self) -> dict[str, object]:
        return {
            "connected": self.connected,
            "reconnects": self.reconnects,
            "last_error": self.last_error,
            "ages": {c: (round(q.age, 1) if (q := self.raw_quote(c)) else None) for c in self.coins},
        }

    # -- internals --------------------------------------------------------
    def _set(self, coin: str, bid: float, ask: float) -> None:
        if bid <= 0 or ask <= 0 or bid > ask:
            log.warning("ignoring crossed/invalid quote %s %s/%s", coin, bid, ask)
            return
        with self._lock:
            self._quotes[coin] = Quote(bid=bid, ask=ask, received_at=time.time())

    def _on_open(self, ws: websocket.WebSocketApp) -> None:
        self.connected = True
        for c in self.coins:
            ws.send(json.dumps({"method": "subscribe", "subscription": {"type": "l2Book", "coin": c}}))
        log.info("websocket connected, subscribed to %s", self.coins)

    def _on_message(self, ws: websocket.WebSocketApp, msg: str) -> None:
        try:
            data = json.loads(msg)
        except ValueError:
            return
        if data.get("channel") == "l2Book":
            d = data["data"]
            bids, asks = d["levels"]
            if bids and asks:
                self._set(d["coin"], float(bids[0]["px"]), float(asks[0]["px"]))

    def _on_close(self, ws: websocket.WebSocketApp, code: object, reason: object) -> None:
        self.connected = False

    def _on_error(self, ws: websocket.WebSocketApp, err: object) -> None:
        self.last_error = str(err)
        log.warning("websocket error: %s", err)

    def _pinger(self, ws: websocket.WebSocketApp) -> None:
        while not self._stop.is_set() and self.connected:
            try:
                ws.send(json.dumps({"method": "ping"}))
            except Exception:  # noqa: BLE001
                return
            self._stop.wait(30)

    def _run(self) -> None:
        backoff = 1.0
        while not self._stop.is_set():
            self._ws = websocket.WebSocketApp(
                self.ws_url, on_open=self._on_open, on_message=self._on_message,
                on_close=self._on_close, on_error=self._on_error)
            opened = time.time()
            threading.Thread(target=lambda: (time.sleep(2), self._pinger(self._ws)), daemon=True).start()
            self._ws.run_forever(ping_interval=0)
            self.connected = False
            if self._stop.is_set():
                break
            self.reconnects += 1
            if time.time() - opened > 60:
                backoff = 1.0
            log.warning("websocket disconnected; reconnecting in %.0fs", backoff)
            self._stop.wait(backoff)
            backoff = min(backoff * 2, 60)
            # Missed messages: re-snapshot from REST before trusting the feed again.
            self.refresh_from_rest()
