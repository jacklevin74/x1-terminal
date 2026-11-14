"""System health snapshot, persisted for the dashboard."""
from __future__ import annotations

from typing import Any

from app.storage.database import Database, now_ms


def write_health(db: Database, mode: str, **fields: Any) -> dict[str, Any]:
    h = {"ts": now_ms(), "mode": mode, **fields}
    db.set_state(f"health:{mode}", h)
    return h


def read_health(db: Database, mode: str) -> dict[str, Any] | None:
    return db.get_state(f"health:{mode}")
