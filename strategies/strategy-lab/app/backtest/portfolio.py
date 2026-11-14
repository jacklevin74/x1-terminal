"""Weekly-rebalanced cross-sectional portfolio backtest (EXP-005 "Relative Strength").

Daily bars. At Monday 00:00 UTC the ranking uses closes through Sunday (row i-1);
fills happen at Monday's open (row i). Stops are checked on every day's range,
including the entry day. Everything at row i uses only rows <= i.
"""
from __future__ import annotations

import math
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Any

import numpy as np
import pandas as pd

from app.backtest.performance import max_drawdown, summarize
from app.data.market_metadata import round_size_down
from app.storage.models import MarketInfo

DAY = 86_400_000
BASE_FUNDING = {"BTC": 0.0000125, "ETH": 0.0000125}
ALT_FUNDING = 0.000025


@dataclass
class XsConfig:
    lookback_days: int = 28
    n_long: int = 3
    n_short: int = 3
    reversal: bool = False
    sizing: str = "equal"            # "equal": gross_target split evenly | "risk": risk_per_position to the stop
    gross_target: float = 1.0
    risk_per_position: float = 0.005
    stop_atr: float = 3.0
    gross_cap: float = 1.5
    min_notional: float = 10.0
    min_coins: int = 15
    taker_fee: float = 0.00045
    starting_equity: float = 100.0


@dataclass
class Pos:
    coin: str
    side: int            # +1 long, -1 short
    size: float
    entry: float
    stop: float
    opened: int
    planned_risk: float
    fees: float
    funding: float = 0.0


@dataclass
class XsResult:
    trades: list[dict[str, Any]]
    equity: pd.Series                     # daily mark-to-market equity, indexed by day open time
    rebalances: int
    skipped_small: int
    scaled_for_gross_cap: int
    extra: dict[str, Any] = field(default_factory=dict)


def _costs(coin: str) -> tuple[float, float]:
    """(slippage, half-spread) as fractions."""
    return (0.0005, 0.0001) if coin in ("BTC", "ETH") else (0.0010, 0.0003)


def load_daily(db, source: str, coins: list[str]) -> dict[str, pd.DataFrame]:
    out = {}
    for c in coins:
        rows = db.load_candles(source, c, "1d")
        if rows:
            out[c] = pd.DataFrame(rows).set_index("t")[["o", "h", "l", "c"]]
    return out


def daily_funding(db, coins: list[str]) -> dict[str, dict[int, float]]:
    """Sum of hourly funding rates per UTC day."""
    out = {}
    for c in coins:
        rows = db.load_funding(c)
        d: dict[int, float] = {}
        for t, r in rows:
            k = (t // DAY) * DAY
            d[k] = d.get(k, 0.0) + r
        out[c] = d
    return out


def run_xs(frames: dict[str, pd.DataFrame], infos: dict[str, MarketInfo], funding: dict[str, dict[int, float]],
           cfg: XsConfig) -> XsResult:
    coins = [c for c in frames if c in infos]
    idx = sorted(set().union(*[set(frames[c].index) for c in coins]))
    O = pd.DataFrame({c: frames[c]["o"] for c in coins}).reindex(idx)
    H = pd.DataFrame({c: frames[c]["h"] for c in coins}).reindex(idx)
    L = pd.DataFrame({c: frames[c]["l"] for c in coins}).reindex(idx)
    C = pd.DataFrame({c: frames[c]["c"] for c in coins}).reindex(idx)
    prev_c = C.shift(1)
    tr = pd.concat({c: pd.concat([H[c] - L[c], (H[c] - prev_c[c]).abs(), (L[c] - prev_c[c]).abs()], axis=1).max(axis=1)
                    for c in coins}, axis=1)
    ATR = tr.ewm(alpha=1 / 14, adjust=False).mean()
    Ov, Hv, Lv, Cv, Av = (x.to_numpy() for x in (O, H, L, C, ATR))
    col = {c: j for j, c in enumerate(coins)}
    look = 7 if cfg.reversal else cfg.lookback_days

    cash = cfg.starting_equity
    pos: dict[str, Pos] = {}
    trades: list[dict[str, Any]] = []
    eq_curve: dict[int, float] = {}
    rebalances = skipped = scaled = 0

    def mtm(i: int) -> float:
        v = cash
        for p in pos.values():
            px = Cv[i, col[p.coin]]
            if not np.isnan(px):
                v += p.side * (px - p.entry) * p.size - p.funding
        return v

    def close(p: Pos, t: int, px: float, reason: str) -> None:
        nonlocal cash
        fee = px * p.size * cfg.taker_fee
        gross = p.side * (px - p.entry) * p.size
        net = gross - p.fees - fee - p.funding
        cash += gross - fee - p.funding           # entry fee was already taken from cash
        trades.append({"market": p.coin, "direction": "long" if p.side > 0 else "short", "opened_ms": p.opened,
                       "closed_ms": t, "entry": p.entry, "exit": px, "size": p.size, "gross_pnl": gross,
                       "fees": p.fees + fee, "funding": p.funding, "net_pnl": net, "planned_risk": p.planned_risk,
                       "r_multiple": net / p.planned_risk if p.planned_risk else None, "exit_reason": reason})
        del pos[p.coin]

    for i in range(1, len(idx)):
        t = idx[i]
        monday = datetime.fromtimestamp(t / 1000, tz=timezone.utc).weekday() == 0
        if monday and i - 1 - look >= 0:
            prev, base = Cv[i - 1], Cv[i - 1 - look]
            valid = [c for c in coins if not (np.isnan(prev[col[c]]) or np.isnan(base[col[c]])
                                               or np.isnan(Ov[i, col[c]]) or np.isnan(Av[i - 1, col[c]]))]
            if len(valid) >= cfg.min_coins:
                rebalances += 1
                ret = {c: prev[col[c]] / base[col[c]] - 1 for c in valid}
                ranked = sorted(valid, key=lambda c: ret[c], reverse=True)    # strongest first
                top, bottom = ranked[:cfg.n_long], ranked[::-1][:cfg.n_short]
                if cfg.reversal:
                    longs, shorts = bottom[:cfg.n_long], top[:cfg.n_short]
                else:
                    longs, shorts = top[:cfg.n_long], bottom[:cfg.n_short]
                target = {c: 1 for c in longs} | {c: -1 for c in shorts if cfg.n_short > 0}
                # close what is no longer wanted (or flipped)
                for c, p in list(pos.items()):
                    if target.get(c) != p.side:
                        slip, hs = _costs(c)
                        o = Ov[i, col[c]] if not np.isnan(Ov[i, col[c]]) else Cv[i - 1, col[c]]
                        close(p, t, o * (1 - p.side * (slip + hs)), "rebalance")
                equity = mtm(i - 1)
                new = []
                for c, side in target.items():
                    if c in pos:
                        continue
                    slip, hs = _costs(c)
                    entry = Ov[i, col[c]] * (1 + side * (slip + hs))
                    dist = cfg.stop_atr * Av[i - 1, col[c]]
                    loss_pct = dist / entry + 2 * cfg.taker_fee + 2 * (slip + hs)
                    if cfg.sizing == "risk":
                        notional = cfg.risk_per_position * equity / loss_pct
                    else:
                        notional = cfg.gross_target * equity / max(cfg.n_long + cfg.n_short, 1)
                    new.append([c, side, entry, dist, notional, loss_pct])
                gross_kept = sum(p.size * p.entry for p in pos.values())
                room = cfg.gross_cap * equity - gross_kept
                total_new = sum(n[4] for n in new)
                if total_new > room > 0:
                    f = room / total_new
                    for n in new:
                        n[4] *= f
                    scaled += 1
                elif room <= 0:
                    new = []
                for c, side, entry, dist, notional, loss_pct in new:
                    size = round_size_down(notional / entry, infos[c].sz_decimals)
                    if size * entry < cfg.min_notional:
                        skipped += 1
                        continue
                    fee = entry * size * cfg.taker_fee
                    cash -= fee
                    pos[c] = Pos(c, side, size, entry, entry - side * dist, t, size * entry * loss_pct, fee)
        # stops and funding during day i
        for c, p in list(pos.items()):
            j = col[c]
            o, h, l, cl = Ov[i, j], Hv[i, j], Lv[i, j], Cv[i, j]
            if np.isnan(cl):
                continue
            slip, hs = _costs(c)
            if p.side > 0 and l <= p.stop:
                close(p, t, min(p.stop, o) * (1 - slip - hs), "stop")
                continue
            if p.side < 0 and h >= p.stop:
                close(p, t, max(p.stop, o) * (1 + slip + hs), "stop")
                continue
            rate = funding.get(c, {}).get(t, (BASE_FUNDING.get(c, ALT_FUNDING)) * 24)
            p.funding += p.side * p.size * cl * rate
        eq_curve[t] = mtm(i)

    last = len(idx) - 1
    for c, p in list(pos.items()):
        px = Cv[last, col[c]]
        if not np.isnan(px):
            slip, hs = _costs(c)
            close(p, idx[last], px * (1 - p.side * (slip + hs)), "end_of_data")
    eq = pd.Series(eq_curve).sort_index()
    if len(eq):
        eq.iloc[-1] = cash
    return XsResult(trades, eq, rebalances, skipped, scaled)


def report(res: XsResult, starting: float) -> dict[str, Any]:
    eq = res.equity
    out: dict[str, Any] = {"summary": summarize(res.trades, starting), "rebalances": res.rebalances,
                           "skipped_small": res.skipped_small}
    if len(eq) < 2:
        return out
    start, end = int(eq.index[0]), int(eq.index[-1])
    span = end - start
    b1, b2 = start + int(span * 0.6), start + int(span * 0.8)
    segs = {"development (first 60%)": (start, b1), "validation (next 20%)": (b1, b2),
            "out-of-sample (last 20%)": (b2, end + 1)}
    splits = {}
    for name, (lo, hi) in segs.items():
        tr = [t for t in res.trades if lo <= t["opened_ms"] < hi]
        e = eq[(eq.index >= lo) & (eq.index < hi)]
        ret = (e.iloc[-1] / e.iloc[0] - 1) if len(e) > 1 else None
        splits[name] = summarize(tr, starting) | {"from_ms": lo, "to_ms": hi, "equity_return": ret}
    out["splits"] = splits
    dt = pd.to_datetime(eq.index, unit="ms", utc=True)
    monthly = eq.groupby([dt.year, dt.month]).last()
    mret = monthly.pct_change().dropna()
    years = span / (365 * DAY)
    out["total_return"] = eq.iloc[-1] / starting - 1
    out["cagr"] = (eq.iloc[-1] / starting) ** (1 / years) - 1 if years > 0 and eq.iloc[-1] > 0 else None
    out["max_drawdown_pct"] = max_drawdown(list(eq.values))[1]
    out["monthly"] = {f"{y}-{m:02d}": float(v) for (y, m), v in mret.items()}
    out["positive_months"] = float((mret > 0).mean()) if len(mret) else None
    out["best_month"] = float(mret.max()) if len(mret) else None
    out["worst_month"] = float(mret.min()) if len(mret) else None
    out["curve"] = [[int(k), float(v)] for k, v in eq.items()]
    return {k: (None if isinstance(v, float) and (math.isnan(v) or math.isinf(v)) else v) for k, v in out.items()}
