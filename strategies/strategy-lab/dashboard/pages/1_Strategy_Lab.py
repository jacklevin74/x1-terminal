"""Firefly Lab: market synchrony, forward paper-trading race, historical backtests."""
from __future__ import annotations

import sys
from pathlib import Path

import altair as alt
import numpy as np
import pandas as pd
import streamlit as st

sys.path.insert(0, str(Path(__file__).resolve().parent.parent.parent))

from app.backtest.performance import summarize  # noqa: E402
from app.config import load_config  # noqa: E402
from app.montecarlo import sign_flip_pvalue  # noqa: E402
from app.risk.circuit_breaker import CircuitBreaker  # noqa: E402
from app.storage.database import Database, now_ms  # noqa: E402
from app.strategy_info import FAMILIES, INFO  # noqa: E402
from app.timeutil import iso  # noqa: E402
from dashboard.auth import require_password  # noqa: E402

st.set_page_config(page_title="Strategy Lab", layout="wide")
cfg = load_config()
require_password()
db = Database(cfg.db_path)

# Validated categorical palette, fixed order (slot 1..6). Color follows the strategy, never its rank.
PALETTE = ["#2a78d6", "#eb6834", "#1baf7a", "#eda100", "#e87ba4", "#008300", "#7c5cd6", "#c94f4f", "#5f8f9e",
           "#a0782c", "#6b6b66", "#3b9c9c", "#b36bd1", "#d4a017", "#4c6ef5", "#e8590c"]
VARIANT_ORDER = ["F1", "F0", "F2"]
MUTED = "#8a8a85"
SHORT = {"F1": "Firefly", "F0": "Control", "F2": "Placebo",
         "firefly": "Firefly", "control": "Control", "placebo": "Placebo",
         "momentum": "Momentum L/S", "M1": "Momentum L/S", "M2": "Reversal", "M3": "Momentum long-only"}
EQ_AXIS = alt.Axis(format="$,.2f")
SYNC_FILL = "#2a78d6"


def ts(ms) -> pd.Series:
    return pd.to_datetime(pd.Series(ms), unit="ms", utc=True)


def fmt_r(x):
    return "–" if x is None else f"{x:+.2f} R"


st.title("Strategy Lab")
st.markdown(
    "Every strategy here trades its **own simulated $100 account** on live Hyperliquid prices. "
    "No real money and no real orders. Each one follows fixed rules; nothing is picked by hand.")
with st.expander("How to read this page", expanded=False):
    st.markdown(
        "- **Scoreboard**: one row per strategy, best return first. *Balance* includes open positions at current "
        "prices (updated every 5 minutes). *Realized P&L* counts closed trades only.\n"
        "- **Luck check**: could random long/short picks on the same trades have done as well? Shown from 10 "
        "closed trades. *p* below 0.05 means the result is unlikely to be luck.\n"
        "- **Look at one strategy**: pick a row to see what it does, its balance over time and its open positions.\n"
        "- **Research** (further down): the market-synchrony signal and the historical "
        "backtests behind each strategy.\n"
        "- Orders are simulated as IOC limit orders 3 price ticks through the best price, filled against the "
        "real order book (newer accounts) or with a 0.1% slippage allowance (older accounts). "
        "Fees: 0.045% taker, 0.015% maker, plus hourly funding.")


@st.cache_data(ttl=60)
def live_mids() -> dict[str, float]:
    import requests
    try:
        r = requests.post("https://api.hyperliquid.xyz/info", json={"type": "allMids"}, timeout=10).json()
        return {k: float(v) for k, v in r.items()}
    except Exception:  # noqa: BLE001
        return {}


def luck_text(p):
    if p is None:
        return "too few trades"
    return f"unlikely luck (p={p:.2f})" if p < 0.05 else f"could be luck (p={p:.2f})"


GAIN, LOSS = "#2a78d6", "#e34948"          # diverging pair: blue = up, red = down (validated reference pair)
start_bal = cfg.account.starting_balance
books = db.get_state("lab:books") or {}
order = [b for b in INFO if b in books] + [b for b in books if b not in INFO]
rows, curves = [], []
for b in order:
    mode = f"paper-{b}"
    info_b = INFO.get(b, {"name": books[b], "family": "signal"})
    closed = db.trades(mode, "closed")
    opened = db.trades(mode, "open")
    s = summarize(closed, start_bal)
    eq = db.query("SELECT ts, equity FROM equity WHERE mode=? ORDER BY ts", (mode,))
    equity_now = eq[-1]["equity"] if eq else start_bal
    n_open = len(opened)
    p = sign_flip_pvalue([t["gross_pnl"] for t in closed],
                                                [(t["fees"] or 0) + (t["funding"] or 0) for t in closed])
    halt = CircuitBreaker(db, mode).reason() or (db.get_state(f"{b}:kill") or {}).get("killed")
    status = ("Stopped" if halt else "In trades" if n_open else
              "Waiting for first signal" if not s.get("trades") else "Flat, waiting for a signal")
    since = eq[0]["ts"] if eq else now_ms()
    spark = [round((r["equity"] / start_bal - 1) * 100, 3) for r in eq[:: max(1, len(eq) // 60)]]
    rows.append({
        "key": b, "strategy": info_b["name"], "type": FAMILIES.get(info_b["family"], ""), "status": status,
        "days running": (now_ms() - since) / 86_400_000,
        "balance": equity_now, "return": (equity_now / start_bal - 1) * 100, "trend": spark,
        "open positions": n_open,
        "closed trades": s.get("trades", 0),
        "win rate": (s["win_rate"] * 100) if s.get("trades") else None,
        "realized P&L": s.get("net_pnl", 0.0),
        "luck check": luck_text(p),
    })
    for r in eq:
        curves.append({"time": r["ts"], "return": r["equity"] / start_bal - 1, "key": b, "strategy": info_b["name"]})

st.subheader("Scoreboard")
if not rows:
    st.info("The lab has not started yet (`scripts/start.sh`).")
    st.stop()
board = pd.DataFrame(rows).sort_values("return", ascending=False)
best, worst = board.iloc[0], board.iloc[-1]
m = st.columns(4)
m[0].metric("Strategies running", len(board))
m[1].metric("In profit", int((board["return"] > 0).sum()), help="balance above the $100 start")
m[2].metric("Best", best["strategy"], f"{best['return']:+.2f}%")
m[3].metric("Worst", worst["strategy"], f"{worst['return']:+.2f}%")
st.dataframe(
    board.drop(columns=["key"]), hide_index=True, width="stretch",
    column_config={
        "strategy": st.column_config.TextColumn(width="medium"),
        "type": st.column_config.TextColumn(width="small"),
        "status": st.column_config.TextColumn(width="medium"),
        "days running": st.column_config.NumberColumn(format="%.1f"),
        "balance": st.column_config.NumberColumn(format="$%.2f", help="cash + open positions at current prices"),
        "return": st.column_config.NumberColumn("return %", format="%+.2f%%", help="since the account started"),
        "trend": st.column_config.LineChartColumn("return over time", width="small",
                                                  help="each chart is scaled to its own range"),
        "closed trades": st.column_config.NumberColumn(format="%d"),
        "win rate": st.column_config.NumberColumn(format="%.0f%%"),
        "realized P&L": st.column_config.NumberColumn(format="$%+.2f", help="closed trades only, after costs"),
        "luck check": st.column_config.TextColumn(width="medium"),
    })

bars = board.assign(sign=np.where(board["return"] >= 0, "up", "down"), ret=board["return"] / 100)
st.altair_chart(alt.Chart(bars).mark_bar(cornerRadiusEnd=4, height={"band": 0.7}).encode(
    y=alt.Y("strategy:N", sort="-x", title=None),
    x=alt.X("ret:Q", title="Return since start", axis=alt.Axis(format="+.1%", grid=True)),
    color=alt.Color("sign:N", scale=alt.Scale(domain=["up", "down"], range=[GAIN, LOSS]), legend=None),
    tooltip=["strategy:N", alt.Tooltip("ret:Q", title="return", format="+.2%"),
             alt.Tooltip("balance:Q", format="$.2f"), "status:N"],
).properties(height=22 * len(bars) + 30, title="Return since each account started (blue = up, red = down)"),
    width="stretch")
st.caption("Accounts started on different dates (see 'days running'), so a young account has had less time "
           "to win or lose. Compare like with like: a strategy and its control, or accounts started the same day.")

# -- one strategy in detail -------------------------------------------------------
st.subheader("Look at one strategy")
names = {r["key"]: r["strategy"] for r in rows}
pick = st.selectbox("Strategy", list(board["key"]), format_func=lambda k: names[k], key="pick")
info_p = INFO.get(pick, {})
row = board[board["key"] == pick].iloc[0]
c = st.columns([3, 2])
with c[0]:
    st.markdown(f"**{info_p.get('name', pick)}** · {FAMILIES.get(info_p.get('family'), '')} · "
                f"{info_p.get('exp', '')}")
    for label, key in (("What it does", "what"), ("When it trades", "when"), ("How it exits", "exits"),
                       ("Position size", "sizing"), ("Evidence so far", "evidence")):
        if info_p.get(key):
            st.markdown(f"**{label}:** {info_p[key]}")
with c[1]:
    st.metric("Balance", f"${row['balance']:.2f}", f"{row['return']:+.2f}%")
    st.metric("Status", row["status"])
    st.metric("Luck check", row["luck check"])

if curves:
    cdf = pd.DataFrame(curves)
    cdf["time"] = ts(cdf["time"])
    focus = cdf[cdf["key"] == pick]
    others = cdf[cdf["key"] != pick]
    ctx = alt.Chart(others).mark_line(color=MUTED, strokeWidth=1, opacity=0.35).encode(
        x=alt.X("time:T", title=None), y=alt.Y("return:Q", title="Return", axis=alt.Axis(format="+.0%")),
        detail="strategy:N",
        tooltip=["strategy:N", alt.Tooltip("time:T", format="%b %d %H:%M"), alt.Tooltip("return:Q", format="+.2%")])
    fl = alt.Chart(focus).mark_line(color=GAIN, strokeWidth=2.5).encode(
        x="time:T", y="return:Q",
        tooltip=["strategy:N", alt.Tooltip("time:T", format="%b %d %H:%M"), alt.Tooltip("return:Q", format="+.2%")])
    zero = alt.Chart(pd.DataFrame({"y": [0]})).mark_rule(color=MUTED, strokeDash=[4, 3]).encode(y="y:Q")
    st.altair_chart((ctx + zero + fl).properties(height=260, title=f"{names[pick]} (blue) against every other "
                                                                      "strategy (gray)"), width="stretch")

mids = live_mids()
opened = db.trades(f"paper-{pick}", "open")
if opened:
    pos_rows = []
    for t in opened:
        px = mids.get(t["market"])
        sgn = 1 if t["direction"] == "long" else -1
        pos_rows.append({"coin": t["market"], "side": t["direction"], "size $": t["size"] * t["entry"],
                         "entry": t["entry"], "now": px,
                         "unrealized $": None if px is None else sgn * (px - t["entry"]) * t["size"],
                         "stop": t["stop"], "opened": iso(t["opened_ms"])[:16]})
    pdf = pd.DataFrame(pos_rows)
    st.markdown("**Open positions**")
    st.dataframe(pdf, hide_index=True, width="stretch", column_config={
        "size $": st.column_config.NumberColumn(format="$%.2f"),
        "unrealized $": st.column_config.NumberColumn(format="$%+.2f", help="at the current mid price, before exit costs"),
        "entry": st.column_config.NumberColumn(format="%.6g"), "now": st.column_config.NumberColumn(format="%.6g"),
        "stop": st.column_config.NumberColumn(format="%.6g")})
else:
    st.markdown("**Open positions:** none right now.")

closed = db.trades(f"paper-{pick}", "closed")
if closed:
    st.markdown("**Last closed trades**")
    st.dataframe(pd.DataFrame([{"closed": iso(t["closed_ms"])[:16], "coin": t["market"], "side": t["direction"],
                                "net $": t["net_pnl"], "exit": t["exit_reason"]} for t in closed[-10:][::-1]]),
                 hide_index=True, column_config={"net $": st.column_config.NumberColumn(format="$%+.3f")})

with st.expander("Strategy guide: every strategy in one place"):
    for fam, label in FAMILIES.items():
        members = [k for k in order if INFO.get(k, {}).get("family") == fam]
        if not members:
            continue
        st.markdown(f"#### {label}")
        for k in members:
            i = INFO[k]
            st.markdown(f"**{i['name']}** ({i['exp']}): {i['what']} *Evidence:* {i['evidence']}")

st.divider()
st.header("Research")
st.caption("The signals and tests behind the strategies above.")

# -- live synchrony -----------------------------------------------------------
st.subheader("Market synchrony now")
st.caption("The Kuramoto index behind Firefly: are ~31 large coins moving in "
           "step (herding) or each on their own?")
live = db.get_state("sync:live")
if live and live.get("series"):
    df = pd.DataFrame(live["series"], columns=["t", "R", "baseline", "synced"])
    df["time"] = ts(df["t"])
    last = df.iloc[-1]
    c = st.columns(4)
    c[0].metric("Synchrony R (smoothed)", f"{last.R:.3f}")
    c[1].metric("180-day median", "–" if pd.isna(last.baseline) else f"{last.baseline:.3f}")
    c[2].metric("State", "SYNCED" if last.synced else "NOT SYNCED",
                help="Firefly takes new entries only while the market is synced")
    c[3].metric("Coins in index", live.get("coins", 0), help=f"updated {iso(live['ts'])} UTC")
    band = df.assign(next_time=df["time"].shift(-1).fillna(df["time"].iloc[-1]))
    shade = alt.Chart(band[band["synced"]]).mark_rect(color=SYNC_FILL, opacity=0.12).encode(
        x="time:T", x2="next_time:T")
    line = alt.Chart(df).mark_line(color=PALETTE[0], strokeWidth=2).encode(
        x=alt.X("time:T", title=None), y=alt.Y("R:Q", title="R", scale=alt.Scale(zero=False)),
        tooltip=[alt.Tooltip("time:T", format="%Y-%m-%d %H:%M"), alt.Tooltip("R:Q", format=".3f"),
                 alt.Tooltip("baseline:Q", format=".3f"), "synced:N"])
    base = alt.Chart(df).mark_line(color=MUTED, strokeDash=[4, 3], strokeWidth=1.5).encode(x="time:T", y="baseline:Q")
    st.altair_chart((shade + base + line).properties(height=240), width="stretch")
    st.caption("Blue line: synchrony R across the coin universe (0 = every coin on its own cycle, 1 = all in step). "
               "Dashed: its 180-day median. Shaded: synced periods, the only times Firefly takes entries.")
else:
    st.info("The lab has not computed the live index yet. Start it with `python -m app.main lab`.")

# -- Relative Strength (EXP-005) ------------------------------------------------
xs = db.get_state("research:xs")
if xs:
    st.subheader("Relative Strength: weekly momentum across 30 coins")
    st.caption("Every Monday: long the 3 coins with the best 28-day return, short the 3 worst, equal size "
               "(about $17 each on $100), 3 x daily-ATR stops. High risk: drawdowns reached 65% in testing.")
    last = db.get_state("momentum:last_rebalance")
    if last:
        st.markdown(f"**Current paper portfolio** (rebalanced {iso(last['ts'])} UTC): long {', '.join(last['longs'])} · "
                    f"short {', '.join(last['shorts'])}")
    xsrc = st.radio("Backtest data", list(xs["sources"]), horizontal=True, key="xs_src",
                    format_func=lambda s: {"binance": "Binance 2020–2026", "hyperliquid": "Hyperliquid 2024–2026"}[s])
    XV, XO = "validation (next 20%)", "out-of-sample (last 20%)"
    pct = lambda x: "–" if x is None else f"{x:+.0%}"  # noqa: E731
    rows, curves = [], []
    for k in ("M1", "M2", "M3"):
        r = xs["sources"][xsrc].get(k)
        if not r:
            continue
        sp = r.get("splits", {})
        rows.append({"strategy": r["label"], "trades": r["summary"].get("trades", 0),
                     "total return": pct(r.get("total_return")), "per year": pct(r.get("cagr")),
                     "max drawdown": f"{(r.get('max_drawdown_pct') or 0):.0%}",
                     "winning months": f"{(r.get('positive_months') or 0):.0%}",
                     "worst month": pct(r.get("worst_month")), "best month": pct(r.get("best_month")),
                     "validation": pct((sp.get(XV) or {}).get("equity_return")),
                     "out-of-sample": pct((sp.get(XO) or {}).get("equity_return"))})
        for t, e in r.get("curve", []):
            curves.append({"time": t, "equity": e, "strategy": SHORT[k]})
    st.dataframe(pd.DataFrame(rows), hide_index=True, width="stretch")
    st.caption("Profit is concentrated: on Binance data the 5 best trades (coin manias such as ZEC, AXS, SAND) "
               "made +$518 while the other 1,012 trades lost $355. Validation / out-of-sample show the equity "
               "return within each period.")
    if curves:
        cdf = pd.DataFrame(curves)
        cdf["time"] = ts(cdf["time"])
        names = [SHORT[k] for k in ("M1", "M2", "M3")]
        st.altair_chart(alt.Chart(cdf).mark_line(strokeWidth=2).encode(
            x=alt.X("time:T", title=None, axis=alt.Axis(format="%b %Y")),
            y=alt.Y("equity:Q", title="Equity", scale=alt.Scale(type="log"), axis=EQ_AXIS),
            color=alt.Color("strategy:N", scale=alt.Scale(domain=names, range=PALETTE[:3]),
                            legend=alt.Legend(orient="top", title=None)),
            tooltip=["strategy:N", alt.Tooltip("time:T", format="%Y-%m-%d"), alt.Tooltip("equity:Q", format=".2f")]
        ).properties(height=300, title="Backtest equity, $100 start (log scale)"), width="stretch")

# -- historical results -------------------------------------------------------
res = db.get_state("research:results")
st.subheader("Historical backtests")
if not res:
    st.info("Run `python -m app.main research` to compute historical results.")
    st.stop()
src = st.radio("Data", list(res["sources"]), horizontal=True,
               format_func=lambda s: {"binance": "Binance 2021–2026 (long proxy history)",
                                      "hyperliquid": "Hyperliquid 2026 (venue data, short)"}.get(s, s))
d = res["sources"][src]
labels = res["variants"]
VAL, OOS = "validation (next 20%)", "out-of-sample (last 20%)"
table = []
for k in [v for v in VARIANT_ORDER if v in d["results"]]:
    r = d["results"][k]
    s, sp = r["summary"], r["splits"]  # noqa: F841
    val = (sp.get(VAL) or {}).get("expectancy_r")
    oos = (sp.get(OOS) or {}).get("expectancy_r")
    passed = val is not None and oos is not None and val > 0 and oos > 0
    table.append({"strategy": labels[k], "trades": s.get("trades", 0),
                  "avg per trade": fmt_r(s.get("expectancy_r")),
                  "profit factor": "–" if s.get("profit_factor") is None else f"{s['profit_factor']:.2f}",
                  "win rate": f"{s['win_rate']:.0%}" if s.get("trades") else "–",
                  "max drawdown": f"{s.get('max_drawdown_pct', 0):.1%}" if s.get("trades") else "–",
                  "validation": fmt_r(val), "out-of-sample": fmt_r(oos),
                  "passes": "yes" if passed else "no"})
st.dataframe(pd.DataFrame(table), hide_index=True, width="stretch")
st.caption("1 R = the planned loss on one trade (about $0.50). Results are after fees, funding and slippage. "
           "'Passes' = positive in both the validation and out-of-sample periods (the criterion set before testing).")

curves = []
for k in [v for v in VARIANT_ORDER if v in d["results"]]:
    for t, e in d["results"][k]["curve"]:
        curves.append({"time": t, "equity": e, "strategy": SHORT.get(k, k)})
if curves:
    cdf = pd.DataFrame(curves)
    cdf["time"] = ts(cdf["time"])
    names = [SHORT.get(k, k) for k in VARIANT_ORDER if k in d["results"]]
    ch = alt.Chart(cdf).mark_line(strokeWidth=2).encode(
        x=alt.X("time:T", title=None),
        y=alt.Y("equity:Q", title="Equity", scale=alt.Scale(zero=False), axis=EQ_AXIS),
        color=alt.Color("strategy:N", scale=alt.Scale(domain=names, range=PALETTE[:len(names)]),
                        legend=alt.Legend(orient="top", title=None)),
        tooltip=["strategy:N", alt.Tooltip("time:T", format="%Y-%m-%d"), alt.Tooltip("equity:Q", format=".2f")])
    st.altair_chart(ch.properties(height=320, title="Backtest equity, $100 start"), width="stretch")

# synchrony history + BTC (two charts sharing time, never a dual axis)
sd = pd.DataFrame(d["sync_daily"], columns=["t", "R", "baseline", "synced", "n"])
if len(sd):
    sd["time"] = ts(sd["t"])
    st.markdown(f"**Synchrony history** · synced {d.get('synced_share') or 0:.0%} of the time · "
                f"{d.get('coins')} coins")
    sm = sd.assign(R=sd["R"].rolling(30, min_periods=10).mean(),
                   baseline=sd["baseline"].rolling(30, min_periods=10).mean())
    line = alt.Chart(sm).mark_line(color=PALETTE[0], strokeWidth=2).encode(
        x=alt.X("time:T", title=None), y=alt.Y("R:Q", title="Synchrony R (30-day avg)", scale=alt.Scale(zero=False)),
        tooltip=[alt.Tooltip("time:T", format="%Y-%m-%d"), alt.Tooltip("R:Q", format=".3f"),
                 alt.Tooltip("baseline:Q", format=".3f")])
    base = alt.Chart(sm).mark_line(color=MUTED, strokeDash=[4, 3], strokeWidth=1.5).encode(x="time:T", y="baseline:Q")
    st.altair_chart((base + line).properties(height=200), width="stretch")
    btc = pd.DataFrame(d["btc_daily"], columns=["t", "price"])
    btc = btc[btc["t"] >= sd["t"].min()]
    btc["time"] = ts(btc["t"])
    st.altair_chart(alt.Chart(btc).mark_line(color=MUTED, strokeWidth=1.5).encode(
        x=alt.X("time:T", title=None),
        y=alt.Y("price:Q", title="BTC", scale=alt.Scale(zero=False), axis=alt.Axis(format="$,.0f")),
        tooltip=[alt.Tooltip("time:T", format="%Y-%m-%d"), alt.Tooltip("price:Q", format=",.0f")]
    ).properties(height=160), width="stretch")

b = d["results"].get("F0", {}).get("sync_buckets")
if b:
    st.markdown("**Exploratory: control-strategy trades grouped by synchrony at entry** "
                "(R relative to its 180-day median; above 1.0 = synced)")
    bd = pd.DataFrame(b)
    bd["synchrony range"] = bd.apply(lambda r: f"{r['lo']:.2f}–{r['hi']:.2f}", axis=1)
    bd["avg per trade"] = bd["avg_R"].map(lambda x: f"{x:+.2f} R")
    bd["win rate"] = bd["win_rate"].map(lambda x: f"{x:.0%}")
    st.dataframe(bd[["synchrony range", "trades", "avg per trade", "win rate"]], hide_index=True)

st.caption(f"Historical results computed {iso(res['ts'])} UTC; refreshed daily at 00:20 UTC by the lab.")
