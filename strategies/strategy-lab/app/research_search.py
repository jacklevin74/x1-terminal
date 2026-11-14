"""EXP-013 strategy search: six pre-registered candidates on Binance history (see docs/experiments.md).

    python -m app.research_search            # prints one verdict block per candidate
"""
from __future__ import annotations

import math

import numpy as np
import pandas as pd

from app.config import load_config
from app.montecarlo import fit_ou, sign_flip_pvalue
from app.storage.database import Database

TAKER, MAKER, SLIP = 0.00045, 0.00015, 0.0005
COST_T = TAKER + SLIP                 # one taker side
DAY = 86_400_000
HL_START = pd.Timestamp("2026-04-01", tz="UTC").value // 1_000_000


# -- data -------------------------------------------------------------------------
def panel(db: Database, interval: str, field: str = "c") -> pd.DataFrame:
    rows = db.query("SELECT market, t, o, h, l, c FROM candles WHERE source='binance' AND interval=?", (interval,))
    df = pd.DataFrame(rows)
    return df.pivot(index="t", columns="market", values=field).sort_index()


def funding_per_bar(db: Database, index: pd.Index, step_ms: int) -> pd.DataFrame:
    """Sum of 8h funding rates falling inside each bar [t, t + step)."""
    f = pd.DataFrame(db.query("SELECT market, time, rate FROM binance_funding"))
    f["bar"] = (f["time"] // step_ms) * step_ms
    out = f.groupby(["bar", "market"])["rate"].sum().unstack().reindex(index).fillna(0.0)
    return out


def segments(ts: pd.Series) -> np.ndarray:
    t0, t1 = ts.min(), ts.max()
    c1, c2 = t0 + (t1 - t0) * 0.6, t0 + (t1 - t0) * 0.8
    return np.where(ts < c1, "dev", np.where(ts < c2, "val", "oos"))


# -- portfolio strategies (daily weights -> daily returns) ------------------------
def run_weights(w: pd.DataFrame, close: pd.DataFrame, fund: pd.DataFrame) -> pd.Series:
    """w set at the close of day t, held over day t+1. Return on equity, net of costs and funding."""
    ret = close.pct_change().shift(-1)                       # next day's move
    gross = (w * ret).sum(1)
    turnover = w.diff().abs().sum(1).fillna(w.abs().sum(1))
    fund_next = fund.shift(-1)
    funding = (w * fund_next).sum(1)                         # long pays positive funding
    return (gross - turnover * COST_T - funding).iloc[:-1]


def c1_tsmom(close, fund):
    r30, r90 = close.pct_change(30), close.pct_change(90)
    sig = np.sign(r30).where(np.sign(r30) == np.sign(r90), 0.0).fillna(0.0)
    vol = close.pct_change().rolling(20).std()
    n = close.notna().sum(1).clip(lower=1)
    w = sig * np.minimum(1.0, 0.03 / vol).fillna(0.0)
    w = w.div(n, axis=0)
    gross = w.abs().sum(1)
    w = w.mul(np.minimum(1.0, 1.5 / gross.replace(0, np.nan)).fillna(1.0), axis=0)
    w = w.where(close.pct_change(90).notna(), 0.0)
    return run_weights(w, close, fund)


def _rank_weights(score: pd.DataFrame, k: int, hold: int, long_low: bool) -> pd.DataFrame:
    w = pd.DataFrame(0.0, index=score.index, columns=score.columns)
    cur = None
    for i, t in enumerate(score.index):
        if i % hold == 0:
            s = score.loc[t].dropna()
            cur = pd.Series(0.0, index=score.columns)
            if len(s) >= 2 * k:
                lo, hi = s.nsmallest(k).index, s.nlargest(k).index
                cur[lo] = 0.1 if long_low else -0.1
                cur[hi] = -0.1 if long_low else 0.1
        w.loc[t] = cur
    return w


def c3_funding(close, fund):
    score = fund.rolling(3).mean().where(close.notna())
    return run_weights(_rank_weights(score, 5, 3, long_low=True), close, fund)


def c4_reversal(close, fund):
    score = close.pct_change().where(close.notna())
    return run_weights(_rank_weights(score, 5, 1, long_low=True), close, fund)


# -- trade strategies ----------------------------------------------------------------
def walk(h, lo, c, fsum, i, long, entry, stop, target, max_bars, exit_fn=None):
    """From bar i+1 on: stop first, then target (trade-through, maker), then exit_fn(k) at close.
    Returns (gross return, costs incl. funding)."""
    sgn = 1 if long else -1
    end = min(len(c) - 1, i + max_bars)
    for k in range(i + 1, end + 1):
        if (lo[k] <= stop) if long else (h[k] >= stop):
            px = stop * (1 - SLIP if long else 1 + SLIP)
            return sgn * (px / entry - 1), COST_T + TAKER + sgn * fsum[i + 1:k + 1].sum()
        if target is not None and ((h[k] > target) if long else (lo[k] < target)):
            return sgn * (target / entry - 1), COST_T + MAKER + sgn * fsum[i + 1:k + 1].sum()
        if exit_fn is not None and exit_fn(k):
            return sgn * (c[k] / entry - 1), 2 * COST_T + sgn * fsum[i + 1:k + 1].sum()
    return sgn * (c[end] / entry - 1), 2 * COST_T + sgn * fsum[i + 1:end + 1].sum()


def atr(h, lo, c, n):
    tr = np.maximum(h[1:] - lo[1:], np.maximum(abs(h[1:] - c[:-1]), abs(lo[1:] - c[:-1])))
    return np.concatenate([[np.nan], pd.Series(tr).rolling(n).mean().values])


def c2_donchian(db, fund_d):
    trades = []
    O = {f: panel(db, "1d", f) for f in "hlc"}
    for m in O["c"].columns:
        h, lo, c = (O[f][m].values for f in "hlc")
        ok = ~np.isnan(c)
        if ok.sum() < 200:
            continue
        hi55 = pd.Series(h).rolling(55).max().shift(1).values
        lo55 = pd.Series(lo).rolling(55).min().shift(1).values
        hi20 = pd.Series(h).rolling(20).max().shift(1).values
        lo20 = pd.Series(lo).rolling(20).min().shift(1).values
        a = atr(h, lo, c, 20)
        fs = fund_d[m].values if m in fund_d else np.zeros(len(c))
        i = 60
        while i < len(c) - 1:
            if np.isnan(c[i]) or np.isnan(hi55[i]) or np.isnan(a[i]):
                i += 1
                continue
            long = c[i] > hi55[i]
            short = c[i] < lo55[i]
            if not (long or short):
                i += 1
                continue
            entry = c[i] * (1 + SLIP if long else 1 - SLIP)
            stop = c[i] - 2 * a[i] if long else c[i] + 2 * a[i]
            ex = (lambda k: c[k] < lo20[k]) if long else (lambda k: c[k] > hi20[k])
            g, cost = walk(h, lo, c, fs, i, long, entry, stop, None, 365, ex)
            trades.append({"t": O["c"].index[i], "gross": g, "cost": cost})
            # skip ahead to the exit bar
            j = i + 1
            while j < len(c) - 1 and not ((lo[j] <= stop) if long else (h[j] >= stop)) and not ex(j):
                j += 1
            i = j + 1
    return pd.DataFrame(trades)


def c5_pairs(db, fund_h):
    close = panel(db, "1h")
    btc = np.log(close["BTC"])
    fb = fund_h["BTC"].values if "BTC" in fund_h else np.zeros(len(close))
    trades = []
    for m in close.columns:
        if m == "BTC":
            continue
        x = (np.log(close[m]) - btc).values
        fm = fund_h[m].values if m in fund_h else np.zeros(len(close))
        i = 720
        while i < len(x) - 1:
            win = x[i - 719:i + 1]
            if np.isnan(win).any():
                i += 4
                continue
            ou = fit_ou(win)
            if ou is None or not 6 <= ou.half_life <= 72:
                i += 4
                continue
            z0 = (x[i] - ou.mu) / ou.sigma_eq
            if abs(z0) < 2:
                i += 4
                continue
            side = -1 if z0 > 0 else 1                       # +1 = long coin / short BTC
            horizon = int(3 * ou.half_life)
            end = min(len(x) - 1, i + horizon)
            k = i + 1
            while k < end:
                z = (x[k] - ou.mu) / ou.sigma_eq
                if np.isnan(z) or z * np.sign(z0) <= 0.5 or abs(z) >= 4:
                    break
                k += 1
            if np.isnan(x[k]):
                i = k + 1
                continue
            gross = side * (x[k] - x[i]) / 2                  # two legs of half notional each
            fund_cost = side * (fm[i + 1:k + 1].sum() - fb[i + 1:k + 1].sum()) / 2
            trades.append({"t": close.index[i], "gross": gross, "cost": 2 * COST_T + fund_cost})
            i = k + 1
    return pd.DataFrame(trades)


def c6_squeeze(db, fund_4h):
    O = {f: panel(db, "4h", f) for f in "hlc"}
    trades = []
    for m in O["c"].columns:
        h, lo, c = (O[f][m].values for f in "hlc")
        s = pd.Series(c)
        mid, sd = s.rolling(20).mean(), s.rolling(20).std()
        up, dn = (mid + 2 * sd).values, (mid - 2 * sd).values
        width = (4 * sd / mid)
        low10 = width.rolling(180).quantile(0.10)
        squeeze = (width <= low10).values
        a = atr(h, lo, c, 14)
        fs = fund_4h[m].values if m in fund_4h else np.zeros(len(c))
        i = 200
        while i < len(c) - 1:
            if not squeeze[i - 1] or np.isnan(a[i]):
                i += 1
                continue
            long, short = c[i] > up[i], c[i] < dn[i]
            if not (long or short):
                i += 1
                continue
            entry = c[i] * (1 + SLIP if long else 1 - SLIP)
            stop = c[i] - 1.5 * a[i] if long else c[i] + 1.5 * a[i]
            target = c[i] + 3 * a[i] if long else c[i] - 3 * a[i]
            g, cost = walk(h, lo, c, fs, i, long, entry, stop, target, 30)
            trades.append({"t": O["c"].index[i], "gross": g, "cost": cost})
            i += 1
            while i < len(c) - 1 and i < len(c) and not squeeze[i - 1]:
                i += 1
    return pd.DataFrame(trades)


# -- verdicts ------------------------------------------------------------------------
ROWS: list[dict] = []


def verdict_portfolio(name: str, r: pd.Series) -> bool:
    r = r.dropna()
    seg = segments(pd.Series(r.index, index=r.index))
    t = r.mean() / (r.std() / math.sqrt(len(r))) if r.std() > 0 else 0
    parts = {s: (1 + r[seg == s]).prod() - 1 for s in ("dev", "val", "oos")}
    hl = (1 + r[r.index >= HL_START]).prod() - 1
    ok = all(v > 0 for v in parts.values()) and t > 2
    ann = r.mean() * 365
    ROWS.append({"candidate": name, "verdict": "PASS" if ok else "fail", "dev": parts["dev"] * 100,
                 "val": parts["val"] * 100, "oos": parts["oos"] * 100, "unit": "% return",
                 "whole sample": f"{ann:+.1%}/yr, t {t:.2f}"})
    print(f"{name}: {'PASS' if ok else 'fail'}  | days {len(r)}, ann. return {ann:+.1%}, t-stat {t:.2f}, "
          f"max DD {((1 + r).cumprod() / (1 + r).cumprod().cummax() - 1).min():.0%}")
    print("   dev {dev:+.1%}   val {val:+.1%}   oos {oos:+.1%}".format(**parts), f"  HL period {hl:+.1%}")
    return ok


def verdict_trades(name: str, tr: pd.DataFrame) -> bool:
    if tr.empty:
        print(f"{name}: fail (no trades)")
        return False
    tr = tr.sort_values("t")
    tr["net"] = tr["gross"] - tr["cost"]
    seg = segments(tr["t"])
    parts = {s: tr.net[seg == s].mean() for s in ("dev", "val", "oos")}
    cnt = {s: int((seg == s).sum()) for s in ("dev", "val", "oos")}
    p = sign_flip_pvalue(list(tr["gross"]), list(tr["cost"]))
    hl = tr.net[tr["t"] >= HL_START]
    ok = all(v > 0 for v in parts.values()) and p is not None and p < 0.05
    ROWS.append({"candidate": name, "verdict": "PASS" if ok else "fail", "dev": parts["dev"] * 100,
                 "val": parts["val"] * 100, "oos": parts["oos"] * 100, "unit": "% per trade",
                 "whole sample": f"{len(tr)} trades, luck p {p:.3f}"})
    print(f"{name}: {'PASS' if ok else 'fail'}  | {len(tr)} trades, avg {tr.net.mean():+.3%}/trade, "
          f"win {(tr.net > 0).mean():.0%}, luck p={p:.3f}")
    print("   " + "   ".join(f"{s} {parts[s]:+.3%} ({cnt[s]})" for s in parts),
          f"  HL period {hl.mean() if len(hl) else float('nan'):+.3%} ({len(hl)})")
    return ok


def main() -> None:
    db = Database(load_config().db_path)
    close_d = panel(db, "1d")
    fund_d = funding_per_bar(db, close_d.index, DAY)
    res = {}
    res["C1"] = verdict_portfolio("C1 time-series momentum", c1_tsmom(close_d, fund_d))
    res["C3"] = verdict_portfolio("C3 funding contrarian", c3_funding(close_d, fund_d))
    res["C4"] = verdict_portfolio("C4 short-term reversal", c4_reversal(close_d, fund_d))
    res["C2"] = verdict_trades("C2 Donchian breakout", c2_donchian(db, fund_d))
    idx4 = panel(db, "4h").index
    res["C6"] = verdict_trades("C6 squeeze breakout", c6_squeeze(db, funding_per_bar(db, idx4, 4 * 3_600_000)))
    idx1 = panel(db, "1h").index
    res["C5"] = verdict_trades("C5 hedged pairs", c5_pairs(db, funding_per_bar(db, idx1, 3_600_000)))
    print("\nPASSED:", [k for k, v in res.items() if v] or "none")
    import time as _t
    db.set_state("research:search", {"ts": int(_t.time() * 1000), "rows": ROWS})


if __name__ == "__main__":
    main()


# -- EXP-023: C3 with a per-leg take-profit ----------------------------------------------
TP23 = 0.05


def c3_with_tp(db: Database, tp: float = TP23) -> pd.Series:
    """Daily returns of C3 where each leg exits at +tp (maker) and stays flat until the next rebalance."""
    close, high, low = (panel(db, "1d", f) for f in "chl")
    fund = funding_per_bar(db, close.index, DAY)
    score = fund.rolling(3).mean().where(close.notna())
    w_all = _rank_weights(score, 5, 3, long_low=True)
    idx = close.index
    out = pd.Series(0.0, index=idx)
    prev_w = pd.Series(0.0, index=close.columns)
    for i in range(0, len(idx) - 1, 3):
        w = w_all.iloc[i]
        cost = (w - prev_w).abs().sum() * COST_T                 # rebalance cost vs what we held
        alive = {c: w[c] for c in w.index if w[c] != 0}
        held_at_end = pd.Series(0.0, index=close.columns)
        entry = {c: close.iloc[i][c] for c in alive}
        for d in range(1, 4):
            j = i + d
            if j >= len(idx):
                break
            day = 0.0
            for c in list(alive):
                wc, side = alive[c], np.sign(alive[c])
                p0, p1 = close.iloc[j - 1][c], close.iloc[j][c]
                hi, lo = high.iloc[j][c], low.iloc[j][c]
                if any(pd.isna(x) for x in (p0, p1, hi, lo)):
                    continue
                target = entry[c] * (1 + tp) if side > 0 else entry[c] * (1 - tp)
                touched = hi >= target if side > 0 else lo <= target
                day -= wc * fund.iloc[j][c]
                if touched:
                    day += abs(wc) * side * (target / p0 - 1) * side * side - abs(wc) * (MAKER + 0)
                    del alive[c]
                    continue
                day += wc * (p1 / p0 - 1)
            out.iloc[j] += day - (cost if d == 1 else 0.0)
        for c, wc in alive.items():
            held_at_end[c] = wc
        prev_w = held_at_end
    return out.iloc[3:-1]


def main_tp() -> None:
    db = Database(load_config().db_path)
    close_d = panel(db, "1d")
    fund_d = funding_per_bar(db, close_d.index, DAY)
    base = c3_funding(close_d, fund_d)
    tp = c3_with_tp(db)
    ok_base = verdict_portfolio("C3 funding contrarian", base)
    ok_tp = verdict_portfolio("EXP-023 C3 + 5% take-profit", tp)
    seg_b = segments(pd.Series(base.index, index=base.index))
    seg_t = segments(pd.Series(tp.index, index=tp.index))
    better = sum(((1 + tp[seg_t == s]).prod() > (1 + base[seg_b == s]).prod()) for s in ("dev", "val", "oos"))
    print(f"EXP-023 beats C3 in {better} of 3 periods ->", "PASS" if ok_tp and better >= 2 else "fail")
