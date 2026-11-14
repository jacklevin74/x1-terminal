"""Streamlit dashboard (read-only, plus an emergency HALT button).

    streamlit run dashboard/app.py

The dashboard can halt trading but can never clear a halt, change risk
settings or place orders. Clearing a halt is a CLI action by an operator.
"""
from __future__ import annotations

import json
import sys
from pathlib import Path

import pandas as pd
import streamlit as st

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app.backtest.performance import summarize  # noqa: E402
from app.config import load_config  # noqa: E402
from app.monitoring.health import read_health  # noqa: E402
from app.monitoring.reports import evaluate_gates  # noqa: E402
from app.risk.circuit_breaker import CircuitBreaker  # noqa: E402
from app.storage.database import Database, now_ms  # noqa: E402
from app.timeutil import iso  # noqa: E402

SERIES = "#2a78d6"   # single-series line color (validated palette, slot 1)

st.set_page_config(page_title="Hyperliquid AI Trader", layout="wide")
cfg = load_config()
from dashboard.auth import require_password  # noqa: E402
require_password()
db = Database(cfg.db_path)
books = db.get_state("lab:books") or {}
mode = st.sidebar.radio("Account", ["paper", "testnet"] + [f"paper-{b}" for b in books], index=0,
                        format_func=lambda m: books.get(m.removeprefix("paper-"), m) if m.startswith("paper-") else m)
st.sidebar.caption(f"Database: {cfg.db_path}")
if st.sidebar.button("Refresh"):
    st.rerun()

br = CircuitBreaker(db, mode)
health = read_health(db, mode) or {}
closed = db.trades(mode, "closed")
open_trades = db.trades(mode, "open")
stats = summarize(closed, cfg.account.starting_balance)

# -- header ------------------------------------------------------------------
st.title("Hyperliquid AI Trader")
c1, c2, c3 = st.columns([1, 1, 2])
c1.markdown(f"### Mode: **{mode.upper()}**")
c2.markdown("### Live execution: **DISABLED**")
if br.is_halted():
    c3.error(f"EMERGENCY HALT ACTIVE: {br.reason()}  \nClear with `python -m app.main clear-halt` after review.")
else:
    c3.success("No halt active")

# -- headline tiles ---------------------------------------------------------
equity = health.get("equity", cfg.account.starting_balance)
t = st.columns(6)
t[0].metric("Equity", f"${equity:.2f}", f"{equity - cfg.account.starting_balance:+.2f}")
t[1].metric("Realized P&L", f"${stats.get('net_pnl', 0):+.2f}")
t[2].metric("Open positions", len(open_trades))
t[3].metric("Risk per trade", f"${equity * cfg.risk.risk_per_trade:.2f}")
t[4].metric("Closed trades", stats.get("trades", 0))
t[5].metric("Max drawdown", f"{stats.get('max_drawdown_pct', 0):.2%}")

# -- system health ------------------------------------------------------------
st.subheader("System health")
feed = health.get("feed") or {}
age = (now_ms() - health["ts"]) / 1000 if health.get("ts") else None
h = st.columns(5)
h[0].metric("Trader heartbeat", f"{age:.0f}s ago" if age is not None else "never",
            help="Time since the trader last wrote a health record")
h[1].metric("Market data", "connected" if feed.get("connected") else "disconnected")
h[2].metric("Quote age (s)", ", ".join(f"{k} {v}" for k, v in (feed.get("ages") or {}).items()) or "-")
h[3].metric("Entries enabled", "yes" if health.get("entries_enabled") else "no",
            help="False until startup reconciliation succeeds")
h[4].metric("Metadata verified", "yes" if health.get("metadata_verified") else "no")
if age is not None and age > 120:
    st.warning("The trader has not reported for over 2 minutes. Is it running?")

with st.expander("Emergency halt"):
    st.write("Stops new entries immediately. Existing stops and targets stay in place. "
             "Only an operator can clear it, from the command line.")
    reason = st.text_input("Reason")
    if st.button("HALT TRADING", type="primary", disabled=not reason):
        br.trip(f"dashboard halt: {reason}")
        st.rerun()

# -- equity curve ---------------------------------------------------------------
st.subheader("Equity")
eq = pd.DataFrame(db.query("SELECT ts, equity FROM equity WHERE mode=? ORDER BY ts", (mode,)))
if len(eq) > 1:
    eq["time"] = pd.to_datetime(eq["ts"], unit="ms", utc=True)
    st.line_chart(eq.set_index("time")["equity"], color=SERIES, height=260, y_label="Equity (USDC)")
else:
    st.caption("No equity history yet.")

# -- performance ------------------------------------------------------------
st.subheader("Performance (closed trades)")
if stats.get("trades"):
    p = st.columns(6)
    p[0].metric("Win rate", f"{stats['win_rate']:.1%}")
    p[1].metric("Expectancy", f"${stats['expectancy_usd']:+.4f}", f"{(stats['expectancy_r'] or 0):+.2f} R")
    pf = stats["profit_factor"]
    p[2].metric("Profit factor", "∞" if pf == float("inf") else f"{pf:.2f}")
    p[3].metric("Fees paid", f"${stats['total_fees']:.2f}")
    p[4].metric("Funding paid", f"${stats['total_funding']:+.2f}")
    p[5].metric("Max losing streak", stats["max_consecutive_losses"])
else:
    st.caption("No closed trades yet. Live authorization requires at least 30 paper trades.")

# -- positions and orders -------------------------------------------------------
st.subheader("Open positions and protective orders")
if open_trades:
    st.dataframe(pd.DataFrame(open_trades)[["id", "market", "direction", "size", "entry", "stop", "target",
                                            "planned_risk", "opened_ms"]].assign(
        opened=lambda d: d["opened_ms"].map(iso)).drop(columns="opened_ms"), hide_index=True)
else:
    st.caption("Flat.")
orders = db.orders(mode, ("resting", "submitting", "unknown"))
if orders:
    st.dataframe(pd.DataFrame(orders)[["cloid", "trade_id", "market", "kind", "side", "size", "trigger_px",
                                       "limit_px", "status"]], hide_index=True)

# -- trade journal ------------------------------------------------------------
st.subheader("Trade history")
if closed:
    j = pd.DataFrame(closed)
    j["opened"] = j["opened_ms"].map(iso)
    j["closed"] = j["closed_ms"].map(iso)
    st.dataframe(j[["id", "market", "direction", "opened", "closed", "entry", "exit", "size", "gross_pnl", "fees",
                    "funding", "net_pnl", "r_multiple", "exit_reason"]].iloc[::-1], hide_index=True)

# -- signals, AI, risk -----------------------------------------------------------
left, right = st.columns(2)
with left:
    st.subheader("Latest strategy evaluations")
    sig = db.query("SELECT ts, market, direction, candidate, payload FROM signals WHERE mode=? "
                   "ORDER BY id DESC LIMIT 40", (mode,))
    if sig:
        rows = []
        for s in sig:
            pl = json.loads(s["payload"])
            failed = [k for k, v in pl.get("checks", {}).items() if not v]
            rows.append({"time": iso(s["ts"]), "market": s["market"], "trend": pl.get("trend"),
                         "candidate": bool(s["candidate"]), "failed checks": ", ".join(failed)})
        st.dataframe(pd.DataFrame(rows), hide_index=True)
with right:
    st.subheader("Claude reviews")
    ai = db.query("SELECT ts, market, decision, payload FROM ai_decisions WHERE mode=? ORDER BY id DESC LIMIT 20",
                  (mode,))
    for a in ai:
        pl = json.loads(a["payload"])
        an = pl.get("analysis") or {}
        with st.expander(f"{iso(a['ts'])}  {a['market']}  {a['decision']}"):
            if an:
                st.write(an.get("reasoning"))
                st.write({"passed": an.get("conditions_passed"), "failed": an.get("conditions_failed"),
                          "invalidation": an.get("invalidation_conditions"), "concerns": an.get("concerns"),
                          "confidence": an.get("confidence")})
            else:
                st.write(pl.get("error"))
    if not ai:
        st.caption("No candidates have reached Claude yet.")

st.subheader("Risk engine decisions")
rd = db.query("SELECT ts, market, approved, reasons FROM risk_decisions WHERE mode=? ORDER BY id DESC LIMIT 30",
              (mode,))
if rd:
    st.dataframe(pd.DataFrame([{"time": iso(r["ts"]), "market": r["market"], "approved": bool(r["approved"]),
                                "reasons": "; ".join(json.loads(r["reasons"]))} for r in rd]), hide_index=True)
else:
    st.caption("No risk decisions yet.")

# -- gates ------------------------------------------------------------------
st.subheader("Live trading authorization checklist")
gates = evaluate_gates(db, cfg)
st.progress(sum(g["ok"] for g in gates) / len(gates),
            text=f"{sum(g['ok'] for g in gates)}/{len(gates)} requirements met")
for g in gates:
    st.markdown(f"{'✅' if g['ok'] else '⬜'} **{g['label']}**  \n<small>{g['detail']}</small>",
                unsafe_allow_html=True)
st.caption("v1 contains no mainnet execution adapter. Meeting every gate makes the system eligible for a "
           "separately reviewed mainnet module; it does not enable live trading.")

bt = db.get_state("last_backtest")
if bt:
    st.subheader(f"Last backtest ({bt['source']}, {iso(bt['ts'])})")
    s = bt["summary"]
    st.write(f"{s.get('trades', 0)} trades, expectancy ${s.get('expectancy_usd', 0):+.4f}/trade, "
             f"profit factor {s.get('profit_factor', 0):.2f}, out-of-sample expectancy "
             f"{bt.get('oos_expectancy_usd') or 0:+.4f} over {bt.get('oos_trades')} trades")
    curve = db.get_state("last_backtest_curve") or []
    if len(curve) > 1:
        c = pd.DataFrame(curve, columns=["ts", "equity"])
        c["time"] = pd.to_datetime(c["ts"], unit="ms", utc=True)
        st.line_chart(c.set_index("time")["equity"], color=SERIES, height=220, y_label="Backtest equity (USDC)")
