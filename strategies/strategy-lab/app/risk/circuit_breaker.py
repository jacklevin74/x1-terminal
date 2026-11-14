"""Persistent emergency halt.

A trip is stored in the database. Restarting the application never clears it;
only an operator running `python -m app.main clear-halt --operator NAME --reason ...`
does. While halted, no new positions are opened (existing protective orders and
exits keep working).
"""
from __future__ import annotations

import logging
import time
from typing import Callable

from app.storage.database import Database, now_ms

log = logging.getLogger(__name__)

HALT_KEY = "halt"


class CircuitBreaker:
    def __init__(self, db: Database, mode: str, on_trip: Callable[[str], None] | None = None,
                 max_api_errors: int = 5, max_reconnects_per_hour: int = 6):
        self.db = db
        self.mode = mode
        self.on_trip = on_trip
        self.max_api_errors = max_api_errors
        self.max_reconnects_per_hour = max_reconnects_per_hour
        self._api_errors = 0
        self._reconnects: list[float] = []

    @property
    def key(self) -> str:
        return f"{HALT_KEY}:{self.mode}"

    def status(self) -> dict | None:
        return self.db.get_state(self.key)

    def is_halted(self) -> bool:
        s = self.status()
        return bool(s and s.get("active"))

    def reason(self) -> str | None:
        s = self.status()
        return s.get("reason") if s and s.get("active") else None

    def trip(self, reason: str, details: dict | None = None) -> None:
        if self.is_halted():
            log.error("halt already active; additional reason: %s", reason)
            self.db.log_event("halt_additional_reason", {"reason": reason, "details": details}, self.mode)
            return
        self.db.set_state(self.key, {"active": True, "reason": reason, "details": details, "ts": now_ms()})
        self.db.log_event("halt_tripped", {"reason": reason, "details": details}, self.mode)
        log.critical("TRADING HALTED: %s", reason)
        if self.on_trip:
            self.on_trip(reason)

    def clear(self, operator: str, note: str) -> None:
        if not operator or not note:
            raise ValueError("clearing a halt requires an operator name and a review note")
        prev = self.status()
        self.db.set_state(self.key, {"active": False, "cleared_by": operator, "note": note,
                                     "previous": prev, "ts": now_ms()})
        self.db.log_event("halt_cleared", {"operator": operator, "note": note, "previous": prev}, self.mode)

    # -- automatic trip conditions ---------------------------------------
    def record_api_success(self) -> None:
        self._api_errors = 0

    def record_api_error(self, err: str) -> None:
        self._api_errors += 1
        if self._api_errors >= self.max_api_errors:
            self.trip("repeated API errors", {"count": self._api_errors, "last": err})

    def record_reconnect(self) -> None:
        now = time.time()
        self._reconnects = [t for t in self._reconnects if now - t < 3600] + [now]
        if len(self._reconnects) > self.max_reconnects_per_hour:
            self.trip("websocket connection unstable", {"reconnects_last_hour": len(self._reconnects)})

    def check_account(self, equity: float, peak: float, week_start: float, week_pnl: float,
                      max_drawdown: float, max_weekly_loss: float) -> None:
        if peak > 0 and equity <= peak * (1 - max_drawdown):
            self.trip("max drawdown reached", {"equity": equity, "peak": peak})
        elif week_start > 0 and week_pnl <= -max_weekly_loss * week_start:
            self.trip("weekly loss limit reached", {"week_pnl": week_pnl, "week_start_equity": week_start})
