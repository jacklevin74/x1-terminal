"""Vault track records from Hyperliquid's public vaultDetails endpoint.

Returns are computed from P&L changes divided by the account value at the start of each
interval, so deposits and withdrawals do not count as performance. The result is a
compounded return index (what $1 left in the vault would have become).
"""
from __future__ import annotations

from typing import Any

import pandas as pd
import requests

INFO = "https://api.hyperliquid.xyz/info"
DAY = 86_400_000


def details(address: str) -> dict:
    return requests.post(INFO, json={"type": "vaultDetails", "vaultAddress": address}, timeout=30).json()


def track_record(d: dict) -> dict[str, Any]:
    port = dict(d["portfolio"])
    # Each window's pnlHistory is cumulative from that window's own start, so windows must never be
    # mixed. Use allTime for the full record.
    av = dict((int(t), float(v)) for t, v in port["allTime"]["accountValueHistory"])
    pts = {int(t): (float(p), av[int(t)]) for t, p in port["allTime"]["pnlHistory"] if int(t) in av}
    ts = sorted(pts)
    idx, rows = 1.0, []
    for a, b in zip(ts, ts[1:]):
        pnl_a, av_a = pts[a]
        pnl_b, _ = pts[b]
        r = (pnl_b - pnl_a) / av_a if av_a > 1000 else 0.0
        idx *= 1 + r
        rows.append((b, idx))
    s = pd.Series(dict(rows)).sort_index()
    if len(s) < 3:
        return {"name": d.get("name"), "points": len(s)}
    peak, mdd = s.cummax(), 0.0
    mdd = float((1 - s / peak).max())
    years = (s.index[-1] - ts[0]) / (365 * DAY)
    dt = pd.to_datetime(s.index, unit="ms", utc=True)
    monthly = s.groupby([dt.year, dt.month]).last()
    mret = monthly.pct_change().dropna()
    return {
        "name": d.get("name"), "leader_commission": d.get("leaderCommission"), "followers": len(d.get("followers") or []),
        "tvl": pts[ts[-1]][1], "since": ts[0], "years": years, "total_return": float(s.iloc[-1] - 1),
        "cagr": float(s.iloc[-1] ** (1 / years) - 1) if years > 0.1 and s.iloc[-1] > 0 else None,
        "max_dd": mdd, "positive_months": float((mret > 0).mean()) if len(mret) else None,
        "worst_month": float(mret.min()) if len(mret) else None, "best_month": float(mret.max()) if len(mret) else None,
        "last_12m": float(s.iloc[-1] / s[s.index <= s.index[-1] - 365 * DAY].iloc[-1] - 1)
        if (s.index <= s.index[-1] - 365 * DAY).any() else None,
        "monthly": {f"{y}-{m:02d}": float(v) for (y, m), v in mret.items()},
        "curve": [[int(t), float(v)] for t, v in s.items()], "points": len(s),
        "apr_reported": d.get("apr"), "allow_deposits": d.get("allowDeposits"),
    }


WATCH = {"HLP": "0xdfc24b077bc1425ad1dea75bcb6f8158e10df303",
         "Growi HF": "0x1e37a337ed460039d1b15bd3bc489de789768d5e",
         "Systemic L/S Grids": "0x07fd993f0fa3a185f7207adccd29f7a87404689d",
         "Systemic HyperGrowth": "0xd6e56265890b76413d1d527eb9b75e334c0c5b42",
         "DOUBLETOP": "0x53f8f390fd4f70941c5d160a964f6893c8dbceff",
         "drkmttr": "0xc179e03922afe8fa9533d3f896338b9fb87ce0c8"}


def refresh(db) -> dict:
    out = {}
    for k, a in WATCH.items():
        try:
            out[k] = track_record(details(a)) | {"address": a}
        except Exception:  # noqa: BLE001
            continue
    db.set_state("vaults:analysis", out)
    return out
