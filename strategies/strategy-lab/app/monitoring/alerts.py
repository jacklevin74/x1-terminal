"""Alerts with a persistent outbox.

Every alert is written to the database first, then delivery to Telegram is
attempted. Failed deliveries stay in the outbox and are retried on every flush,
so a Telegram outage never loses an event.
"""
from __future__ import annotations

import logging

import requests

from app.storage.database import Database

log = logging.getLogger(__name__)

ICON = {"info": "ℹ️", "warning": "⚠️", "critical": "🚨"}


class Notifier:
    def __init__(self, db: Database, mode: str, bot_token: str | None = None, chat_id: str | None = None,
                 enabled: bool = False):
        self.db = db
        self.mode = mode
        self.token = bot_token
        self.chat_id = chat_id
        self.enabled = bool(enabled and bot_token and chat_id)

    def __call__(self, level: str, kind: str, message: str) -> None:
        self.notify(level, kind, message)

    def notify(self, level: str, kind: str, message: str) -> None:
        text = f"{ICON.get(level, '')} [{self.mode.upper()}] {message}"
        getattr(log, "critical" if level == "critical" else "warning" if level == "warning" else "info")(
            "ALERT %s: %s", kind, message)
        self.db.enqueue_alert(level, kind, text)
        self.flush()

    def flush(self) -> int:
        if not self.enabled:
            return 0
        sent = 0
        for a in self.db.pending_alerts():
            try:
                r = requests.post(f"https://api.telegram.org/bot{self.token}/sendMessage",
                                  json={"chat_id": self.chat_id, "text": a["message"]}, timeout=10)
                if r.status_code == 200:
                    self.db.mark_alert(a["id"], True)
                    sent += 1
                else:
                    self.db.mark_alert(a["id"], False, f"HTTP {r.status_code}")
                    break
            except requests.RequestException as e:
                # Do not log the URL: it contains the bot token.
                self.db.mark_alert(a["id"], False, type(e).__name__)
                break
        return sent
