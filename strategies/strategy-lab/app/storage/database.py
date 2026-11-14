"""SQLite persistence: market data cache, audit log, trades, alerts, system state.

Every signal, AI decision, risk decision, order and fill is written here. The
`events` table is an append-only audit trail; other tables are queryable views
of the same facts.
"""
from __future__ import annotations

import json
import sqlite3
import threading
import time
from pathlib import Path
from typing import Any, Iterable

SCHEMA = """
CREATE TABLE IF NOT EXISTS candles (
    source TEXT NOT NULL, market TEXT NOT NULL, interval TEXT NOT NULL,
    t INTEGER NOT NULL, close_t INTEGER NOT NULL,
    o REAL NOT NULL, h REAL NOT NULL, l REAL NOT NULL, c REAL NOT NULL, v REAL NOT NULL,
    PRIMARY KEY (source, market, interval, t)
);
CREATE TABLE IF NOT EXISTS funding (
    market TEXT NOT NULL, time INTEGER NOT NULL, rate REAL NOT NULL,
    PRIMARY KEY (market, time)
);
CREATE TABLE IF NOT EXISTS events (
    id INTEGER PRIMARY KEY AUTOINCREMENT, ts INTEGER NOT NULL, mode TEXT,
    kind TEXT NOT NULL, payload TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS signals (
    id INTEGER PRIMARY KEY AUTOINCREMENT, ts INTEGER NOT NULL, mode TEXT,
    market TEXT NOT NULL, direction TEXT, candidate INTEGER NOT NULL, payload TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS ai_decisions (
    id INTEGER PRIMARY KEY AUTOINCREMENT, ts INTEGER NOT NULL, mode TEXT,
    signal_id INTEGER, market TEXT NOT NULL, decision TEXT NOT NULL, payload TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS risk_decisions (
    id INTEGER PRIMARY KEY AUTOINCREMENT, ts INTEGER NOT NULL, mode TEXT,
    signal_id INTEGER, market TEXT NOT NULL, approved INTEGER NOT NULL,
    reasons TEXT NOT NULL, payload TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS orders (
    cloid TEXT PRIMARY KEY, ts INTEGER NOT NULL, mode TEXT NOT NULL, trade_id INTEGER,
    market TEXT NOT NULL, side TEXT NOT NULL, kind TEXT NOT NULL,
    size REAL NOT NULL, limit_px REAL, trigger_px REAL, reduce_only INTEGER NOT NULL,
    status TEXT NOT NULL, exchange_oid INTEGER, filled_size REAL DEFAULT 0, avg_px REAL,
    updated_ts INTEGER
);
CREATE TABLE IF NOT EXISTS trades (
    id INTEGER PRIMARY KEY AUTOINCREMENT, mode TEXT NOT NULL, market TEXT NOT NULL,
    direction TEXT NOT NULL, status TEXT NOT NULL, signal_id INTEGER,
    opened_ms INTEGER, closed_ms INTEGER, entry REAL, exit REAL, size REAL,
    stop REAL, target REAL, planned_risk REAL,
    gross_pnl REAL, fees REAL, funding REAL, net_pnl REAL, r_multiple REAL,
    exit_reason TEXT, payload TEXT
);
CREATE TABLE IF NOT EXISTS equity (
    ts INTEGER NOT NULL, mode TEXT NOT NULL, equity REAL NOT NULL
);
CREATE TABLE IF NOT EXISTS alerts (
    id INTEGER PRIMARY KEY AUTOINCREMENT, ts INTEGER NOT NULL, level TEXT NOT NULL,
    kind TEXT NOT NULL, message TEXT NOT NULL, delivered INTEGER NOT NULL DEFAULT 0,
    attempts INTEGER NOT NULL DEFAULT 0, last_error TEXT
);
CREATE TABLE IF NOT EXISTS system_state (
    key TEXT PRIMARY KEY, value TEXT NOT NULL, updated_ts INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_events_ts ON events(ts);
CREATE INDEX IF NOT EXISTS idx_trades_mode ON trades(mode, status);
"""


def now_ms() -> int:
    return int(time.time() * 1000)


class Database:
    def __init__(self, path: str | Path):
        self.path = str(path)
        if self.path != ":memory:":
            Path(self.path).parent.mkdir(parents=True, exist_ok=True)
        self._conn = sqlite3.connect(self.path, check_same_thread=False, isolation_level=None)
        self._conn.row_factory = sqlite3.Row
        self._conn.execute("PRAGMA journal_mode=WAL")
        self._lock = threading.RLock()
        self._conn.executescript(SCHEMA)

    # -- low level --------------------------------------------------------
    def execute(self, sql: str, params: Iterable[Any] = ()) -> sqlite3.Cursor:
        with self._lock:
            return self._conn.execute(sql, tuple(params))

    def query(self, sql: str, params: Iterable[Any] = ()) -> list[dict[str, Any]]:
        with self._lock:
            return [dict(r) for r in self._conn.execute(sql, tuple(params)).fetchall()]

    def close(self) -> None:
        self._conn.close()

    # -- audit ------------------------------------------------------------
    def log_event(self, kind: str, payload: dict[str, Any], mode: str | None = None) -> int:
        cur = self.execute(
            "INSERT INTO events (ts, mode, kind, payload) VALUES (?,?,?,?)",
            (now_ms(), mode, kind, json.dumps(payload, default=str)),
        )
        return cur.lastrowid

    def log_signal(self, mode: str, signal_dict: dict[str, Any], candidate: bool) -> int:
        cur = self.execute(
            "INSERT INTO signals (ts, mode, market, direction, candidate, payload) VALUES (?,?,?,?,?,?)",
            (now_ms(), mode, signal_dict["market"], signal_dict.get("direction"), int(candidate),
             json.dumps(signal_dict, default=str)),
        )
        return cur.lastrowid

    def log_ai_decision(self, mode: str, signal_id: int | None, market: str, decision: str,
                        payload: dict[str, Any]) -> int:
        cur = self.execute(
            "INSERT INTO ai_decisions (ts, mode, signal_id, market, decision, payload) VALUES (?,?,?,?,?,?)",
            (now_ms(), mode, signal_id, market, decision, json.dumps(payload, default=str)),
        )
        return cur.lastrowid

    def log_risk_decision(self, mode: str, signal_id: int | None, decision: dict[str, Any]) -> int:
        cur = self.execute(
            "INSERT INTO risk_decisions (ts, mode, signal_id, market, approved, reasons, payload) "
            "VALUES (?,?,?,?,?,?,?)",
            (now_ms(), mode, signal_id, decision["market"], int(decision["approved"]),
             json.dumps(decision["reasons"]), json.dumps(decision, default=str)),
        )
        return cur.lastrowid

    # -- candles ----------------------------------------------------------
    def upsert_candles(self, source: str, market: str, interval: str, rows: list[dict[str, Any]]) -> int:
        with self._lock:
            self._conn.execute("BEGIN")
            try:
                self._conn.executemany(
                    "INSERT OR REPLACE INTO candles (source, market, interval, t, close_t, o, h, l, c, v) "
                    "VALUES (?,?,?,?,?,?,?,?,?,?)",
                    [(source, market, interval, r["t"], r["close_t"], r["o"], r["h"], r["l"], r["c"], r["v"])
                     for r in rows],
                )
                self._conn.execute("COMMIT")
            except Exception:
                self._conn.execute("ROLLBACK")
                raise
        return len(rows)

    def load_candles(self, source: str, market: str, interval: str,
                     start_ms: int | None = None, end_ms: int | None = None) -> list[dict[str, Any]]:
        sql = "SELECT t, close_t, o, h, l, c, v FROM candles WHERE source=? AND market=? AND interval=?"
        params: list[Any] = [source, market, interval]
        if start_ms is not None:
            sql += " AND t >= ?"
            params.append(start_ms)
        if end_ms is not None:
            sql += " AND t <= ?"
            params.append(end_ms)
        return self.query(sql + " ORDER BY t", params)

    def upsert_funding(self, market: str, rows: list[tuple[int, float]]) -> None:
        with self._lock:
            self._conn.executemany(
                "INSERT OR REPLACE INTO funding (market, time, rate) VALUES (?,?,?)",
                [(market, t, r) for t, r in rows],
            )

    def load_funding(self, market: str) -> list[tuple[int, float]]:
        return [(r["time"], r["rate"]) for r in
                self.query("SELECT time, rate FROM funding WHERE market=? ORDER BY time", (market,))]

    # -- system state (halt, authorization) -------------------------------
    def get_state(self, key: str, default: Any = None) -> Any:
        rows = self.query("SELECT value FROM system_state WHERE key=?", (key,))
        return json.loads(rows[0]["value"]) if rows else default

    def set_state(self, key: str, value: Any) -> None:
        self.execute(
            "INSERT OR REPLACE INTO system_state (key, value, updated_ts) VALUES (?,?,?)",
            (key, json.dumps(value, default=str), now_ms()),
        )

    # -- trades -----------------------------------------------------------
    def open_trade(self, mode: str, market: str, direction: str, signal_id: int | None,
                   opened_ms: int, entry: float, size: float, stop: float, target: float,
                   planned_risk: float, fees: float, payload: dict[str, Any]) -> int:
        cur = self.execute(
            "INSERT INTO trades (mode, market, direction, status, signal_id, opened_ms, entry, size, stop, "
            "target, planned_risk, fees, funding, payload) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,0,?)",
            (mode, market, direction, "open", signal_id, opened_ms, entry, size, stop, target,
             planned_risk, fees, json.dumps(payload, default=str)),
        )
        return cur.lastrowid

    def close_trade(self, trade_id: int, closed_ms: int, exit_px: float, gross_pnl: float,
                    fees: float, funding: float, exit_reason: str) -> dict[str, Any]:
        row = self.query("SELECT planned_risk FROM trades WHERE id=?", (trade_id,))[0]
        net = gross_pnl - fees - funding
        r_mult = net / row["planned_risk"] if row["planned_risk"] else None
        self.execute(
            "UPDATE trades SET status='closed', closed_ms=?, exit=?, gross_pnl=?, fees=?, funding=?, "
            "net_pnl=?, r_multiple=?, exit_reason=? WHERE id=?",
            (closed_ms, exit_px, gross_pnl, fees, funding, net, r_mult, exit_reason, trade_id),
        )
        return self.query("SELECT * FROM trades WHERE id=?", (trade_id,))[0]

    def add_trade_funding(self, trade_id: int, amount: float) -> None:
        self.execute("UPDATE trades SET funding = COALESCE(funding,0) + ? WHERE id=?", (amount, trade_id))

    def trades(self, mode: str, status: str | None = None) -> list[dict[str, Any]]:
        if status:
            return self.query("SELECT * FROM trades WHERE mode=? AND status=? ORDER BY id", (mode, status))
        return self.query("SELECT * FROM trades WHERE mode=? ORDER BY id", (mode,))

    def record_equity(self, mode: str, equity: float, ts: int | None = None) -> None:
        self.execute("INSERT INTO equity (ts, mode, equity) VALUES (?,?,?)", (ts or now_ms(), mode, equity))

    # -- orders -----------------------------------------------------------
    def upsert_order(self, o: dict[str, Any]) -> None:
        self.execute(
            "INSERT OR REPLACE INTO orders (cloid, ts, mode, trade_id, market, side, kind, size, limit_px, "
            "trigger_px, reduce_only, status, exchange_oid, filled_size, avg_px, updated_ts) "
            "VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)",
            (o["cloid"], o.get("ts") or now_ms(), o["mode"], o.get("trade_id"), o["market"], o["side"],
             o["kind"], o["size"], o.get("limit_px"), o.get("trigger_px"), int(o.get("reduce_only", False)),
             o["status"], o.get("exchange_oid"), o.get("filled_size", 0.0), o.get("avg_px"), now_ms()),
        )

    def orders(self, mode: str, statuses: tuple[str, ...] | None = None) -> list[dict[str, Any]]:
        if statuses:
            q = ",".join("?" * len(statuses))
            return self.query(f"SELECT * FROM orders WHERE mode=? AND status IN ({q}) ORDER BY ts",
                              (mode, *statuses))
        return self.query("SELECT * FROM orders WHERE mode=? ORDER BY ts", (mode,))

    # -- alerts outbox ----------------------------------------------------
    def enqueue_alert(self, level: str, kind: str, message: str) -> int:
        cur = self.execute("INSERT INTO alerts (ts, level, kind, message) VALUES (?,?,?,?)",
                           (now_ms(), level, kind, message))
        return cur.lastrowid

    def pending_alerts(self, max_attempts: int = 20) -> list[dict[str, Any]]:
        return self.query("SELECT * FROM alerts WHERE delivered=0 AND attempts<? ORDER BY id", (max_attempts,))

    def mark_alert(self, alert_id: int, delivered: bool, error: str | None = None) -> None:
        self.execute("UPDATE alerts SET delivered=?, attempts=attempts+1, last_error=? WHERE id=?",
                     (int(delivered), error, alert_id))
