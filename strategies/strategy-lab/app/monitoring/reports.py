"""Performance reports and the live-trading authorization checklist."""
from __future__ import annotations

from typing import Any

from app.backtest.performance import format_summary, summarize
from app.config import Config
from app.storage.database import Database, now_ms
from app.timeutil import week_start_ms

DAY_MS = 86_400_000

GATES = [
    ("historical_100", "Historical test completed with at least 100 valid trades", "auto"),
    ("oos_positive", "Out-of-sample results show positive expectancy after costs", "auto"),
    ("paper_30", "At least 30 live-data paper trades completed", "auto"),
    ("no_order_bugs", "No unresolved order-management bugs", "attest"),
    ("no_recon_bugs", "No unresolved position-reconciliation bugs", "attest+auto"),
    ("stop_verified", "Protective stop-loss handling verified (tests + testnet)", "attest+auto"),
    ("risk_tests", "Risk engine rejection tests passed", "auto"),
    ("fees_verified", "Exchange fees and minimum order sizes verified", "attest"),
    ("owner_approved", "Owner has reviewed and approved live-trading activation", "attest"),
]


def period_report(db: Database, mode: str, start_ms: int, title: str, starting: float) -> str:
    trades = [t for t in db.trades(mode, "closed") if (t["closed_ms"] or 0) >= start_ms]
    rejected = db.query("SELECT COUNT(*) n FROM risk_decisions WHERE mode=? AND approved=0 AND ts>=?",
                        (mode, start_ms))[0]["n"]
    candidates = db.query("SELECT COUNT(*) n FROM signals WHERE mode=? AND candidate=1 AND ts>=?",
                          (mode, start_ms))[0]["n"]
    open_t = db.trades(mode, "open")
    lines = [format_summary(title, summarize(trades, starting)),
             f"  candidates {candidates}   risk rejections {rejected}   open positions {len(open_t)}"]
    return "\n".join(lines)


def daily_report(db: Database, mode: str, starting: float) -> str:
    return period_report(db, mode, now_ms() - DAY_MS, f"Daily report ({mode})", starting)


def weekly_report(db: Database, mode: str, starting: float) -> str:
    return period_report(db, mode, week_start_ms(now_ms()), f"Weekly report ({mode})", starting)


def evaluate_gates(db: Database, cfg: Config, test_results: dict[str, bool] | None = None) -> list[dict[str, Any]]:
    bt = db.get_state("last_backtest") or {}
    paper_closed = len(db.trades("paper", "closed"))
    attest = db.get_state("attestations") or {}
    recon = db.query("SELECT payload FROM events WHERE kind='reconciliation' ORDER BY id DESC LIMIT 1")
    import json
    recon_ok = bool(recon) and json.loads(recon[0]["payload"]).get("ok", False)
    tests = test_results or db.get_state("last_test_run") or {}
    out = []
    for key, label, kind in GATES:
        ok, detail = False, ""
        if key == "historical_100":
            n = bt.get("trades", 0)
            ok = n >= 100
            detail = f"{n} trades in last backtest ({bt.get('source', 'none')})"
            if bt.get("source") == "binance":
                detail += " - proxy data, also confirm on Hyperliquid history"
        elif key == "oos_positive":
            e = bt.get("oos_expectancy_usd")
            ok = e is not None and e > 0 and bt.get("oos_trades", 0) > 0
            detail = f"OOS expectancy {e:+.4f}/trade over {bt.get('oos_trades', 0)} trades" if e is not None else "no backtest"
        elif key == "paper_30":
            ok = paper_closed >= 30
            detail = f"{paper_closed} closed paper trades"
        elif key == "risk_tests":
            ok = bool(tests.get("test_risk"))
            detail = "pass" if ok else "run: python -m app.main gates --run-tests"
        if kind.startswith("attest"):
            a = attest.get(key)
            a_ok = bool(a)
            if key == "no_recon_bugs":
                ok = a_ok and recon_ok
                detail = f"last reconciliation {'ok' if recon_ok else 'NOT ok / never run'}"
            elif key == "stop_verified":
                ok = a_ok and bool(tests.get("test_orders")) and bool(tests.get("test_recovery"))
                detail = f"order/recovery tests {'pass' if tests.get('test_orders') and tests.get('test_recovery') else 'not passing'}"
            else:
                ok = a_ok
            detail = (detail + "; " if detail else "") + (
                f"attested by {a['operator']} ({a['note']})" if a_ok else "needs operator attestation")
        out.append({"key": key, "label": label, "ok": ok, "detail": detail})
    return out
