"""Find copyable Hyperliquid traders: profitable, directional, not market makers, not scalpers.

Stage 1 filters the public leaderboard (no extra requests). Stage 2 pulls each
candidate's profit history, last 2,000 fills and live positions, and computes:
  - max drawdown of cumulative perp P&L, relative to account value
  - track-record length and share of profitable periods
  - maker share of fills (market makers rest orders and earn rebates)
  - trades per day and median position holding time (copyability with a delay)
  - net vs gross exposure (hedged books net out and are not worth copying)

Survivorship warning: today's leaderboard only shows wallets that are still here
and did well. Past profit does not prove skill; the forward copy test decides.
"""
from __future__ import annotations

import logging
import statistics
import time
from typing import Any

import requests

log = logging.getLogger(__name__)
INFO = "https://api.hyperliquid.xyz/info"
LEADERBOARD = "https://stats-data.hyperliquid.xyz/Mainnet/leaderboard"
DAY = 86_400_000


def _post(s: requests.Session, body: dict, tries: int = 4) -> Any:
    for k in range(tries):
        r = s.post(INFO, json=body, timeout=30)
        if r.status_code == 429:
            time.sleep(5 * (k + 1))
            continue
        r.raise_for_status()
        return r.json()
    raise RuntimeError("rate limited")


def _window(row: dict, name: str) -> tuple[float, float, float]:
    for k, v in row["windowPerformances"]:
        if k == name:
            return float(v["pnl"]), float(v["roi"]), float(v["vlm"])
    return 0.0, 0.0, 0.0


def stage1(rows: list[dict], min_account=25_000, min_pnl=50_000, max_turnover=200, limit=300,
           skip: set | None = None) -> list[dict]:
    out = []
    for r in rows:
        av = float(r["accountValue"])
        pnl, roi, vlm = _window(r, "allTime")
        mpnl, _, _ = _window(r, "month")
        if av < min_account or pnl < min_pnl or mpnl <= 0 or roi <= 0:
            continue
        if vlm / av > max_turnover:          # trades its account far more than a swing trader would
            continue
        if skip and r["ethAddress"] in skip:
            continue
        out.append({"address": r["ethAddress"], "name": r.get("displayName"), "account": av, "pnl_all": pnl,
                    "roi_all": roi, "pnl_month": mpnl, "pnl_week": _window(r, "week")[0], "turnover": vlm / av})
    return sorted(out, key=lambda x: -x["pnl_all"])[:limit]


def _holding_times(fills: list[dict]) -> list[float]:
    """Hours from a position opening (from flat) to returning to flat, per coin."""
    by_coin: dict[str, list[dict]] = {}
    for f in sorted(fills, key=lambda f: f["time"]):
        by_coin.setdefault(f["coin"], []).append(f)
    holds = []
    for fs in by_coin.values():
        opened = None
        for f in fs:
            start = float(f["startPosition"])
            sz = float(f["sz"]) * (1 if f["side"] == "B" else -1)
            end = start + sz
            if abs(start) < 1e-12 and abs(end) > 1e-12:
                opened = f["time"]
            elif opened is not None and abs(end) < 1e-9 or (start * end < 0 and opened is not None):
                holds.append((f["time"] - opened) / 3_600_000)
                opened = f["time"] if start * end < 0 else None
    return holds


def stage2(s: requests.Session, cand: dict) -> dict:
    a = cand["address"]
    port = dict(_post(s, {"type": "portfolio", "user": a}))
    hist = port.get("perpAllTime") or port.get("allTime") or {}
    pnl = [(int(t), float(v)) for t, v in hist.get("pnlHistory", [])]
    acct = [(int(t), float(v)) for t, v in hist.get("accountValueHistory", [])]
    # Cheap early exit: no perp edge -> skip the expensive fill download.
    if (pnl[-1][1] if pnl else 0.0) < 50_000:
        out = dict(cand, perp_pnl_all=pnl[-1][1] if pnl else 0.0, perp_pnl_month=0.0, perp_fills=0,
                   perp_fill_share=0.0, last_perp_fill_days=None, fingerprint=(), max_dd=0.0, track_days=0,
                   pos_periods=0.0, fills_per_day=0, maker_share=0, rebate_share=0, median_hold_h=None,
                   top_coins=[], fills_window_days=0, open_positions=[], gross_lev=0, net_share=None,
                   early_exit=True)
        return out
    fills_all = _post(s, {"type": "userFills", "user": a})
    fills = [f for f in fills_all if not f["coin"].startswith("@")]       # "@N" coins are spot markets
    state = _post(s, {"type": "clearinghouseState", "user": a})
    out = dict(cand)
    out["perp_pnl_all"] = pnl[-1][1] if pnl else 0.0
    pm = (port.get("perpMonth") or {}).get("pnlHistory", [])
    out["perp_pnl_month"] = float(pm[-1][1]) - float(pm[0][1]) if len(pm) > 1 else 0.0
    out["perp_fills"] = len(fills)
    out["perp_fill_share"] = len(fills) / len(fills_all) if fills_all else 0.0
    out["last_perp_fill_days"] = (time.time() * 1000 - fills[0]["time"]) / DAY if fills else None
    out["fingerprint"] = tuple(round(v) for _, v in pnl[-5:])
    # drawdown of cumulative P&L relative to the account value at the time of the peak
    mdd, peak, peak_av = 0.0, float("-inf"), 1.0
    av_by_t = dict(acct)
    for t, v in pnl:
        if v > peak:
            peak, peak_av = v, max(av_by_t.get(t, cand["account"]), 1.0)
        mdd = max(mdd, (peak - v) / peak_av)
    steps = [b[1] - a_[1] for a_, b in zip(pnl, pnl[1:])]
    out["max_dd"] = mdd
    out["track_days"] = (pnl[-1][0] - pnl[0][0]) / DAY if len(pnl) > 1 else 0
    out["pos_periods"] = sum(1 for x in steps if x > 0) / len(steps) if steps else 0
    # fills: maker share, trading frequency, holding time
    if fills:
        span_days = max((fills[0]["time"] - fills[-1]["time"]) / DAY, 1 / 24)
        out["fills_per_day"] = len(fills) / span_days
        out["maker_share"] = sum(1 for f in fills if not f.get("crossed", True)) / len(fills)
        out["rebate_share"] = sum(1 for f in fills if float(f.get("fee", 0)) < 0) / len(fills)
        holds = _holding_times(fills)
        out["median_hold_h"] = statistics.median(holds) if holds else None
        out["fills_window_days"] = span_days
        coins = {}
        for f in fills:
            coins[f["coin"]] = coins.get(f["coin"], 0) + float(f["sz"]) * float(f["px"])
        out["top_coins"] = [c for c, _ in sorted(coins.items(), key=lambda x: -x[1])[:4]]
    else:
        out.update(fills_per_day=0, maker_share=0, rebate_share=0, median_hold_h=None, top_coins=[],
                   fills_window_days=0)
    pos = [p["position"] for p in state.get("assetPositions", [])]
    gross = sum(abs(float(p["positionValue"])) for p in pos)
    net = sum(float(p["positionValue"]) * (1 if float(p["szi"]) > 0 else -1) for p in pos)
    av = float(state.get("marginSummary", {}).get("accountValue", cand["account"]) or cand["account"])
    out["open_positions"] = [(p["coin"], "long" if float(p["szi"]) > 0 else "short", float(p["positionValue"]))
                             for p in pos]
    out["gross_lev"] = gross / av if av else 0
    out["net_share"] = abs(net) / gross if gross else None     # 1 = fully directional, 0 = hedged
    return out


def copyable(w: dict) -> tuple[bool, list[str]]:
    why = []
    if w["perp_pnl_all"] < 50_000:
        why.append(f"perp profit ${w['perp_pnl_all'] / 1e3:.0f}k (profits mostly from spot/vaults)")
    if w["perp_pnl_month"] <= 0:
        why.append("not profitable on perps this month")
    if w["perp_fills"] < 10 or w["last_perp_fill_days"] is None or w["last_perp_fill_days"] > 14:
        why.append("not actively trading perps")
    elif w["perp_fill_share"] < 0.7:
        why.append(f"only {w['perp_fill_share']:.0%} of fills are perps")
    if w["maker_share"] > 0.5:
        why.append(f"{w['maker_share']:.0%} maker fills (market-maker style)")
    if w["fills_per_day"] > 100:
        why.append(f"{w['fills_per_day']:.0f} fills/day (too fast to copy)")
    if w.get("median_hold_h") is not None and w["median_hold_h"] < 1:
        why.append(f"median hold {w['median_hold_h'] * 60:.0f} min (too short to copy)")
    if w["track_days"] < 90:
        why.append(f"track record {w['track_days']:.0f} days (< 90)")
    if w["max_dd"] > 0.6:
        why.append(f"max drawdown {w['max_dd']:.0%} (> 60%)")
    if w.get("net_share") is not None and w["gross_lev"] > 0 and w["net_share"] < 0.3:
        why.append("positions mostly hedged")
    return not why, why


def score(w: dict) -> float:
    """Return on account per unit of drawdown, favouring consistency and long records."""
    ret = w["perp_pnl_all"] / max(w["account"], 1)
    return ret / max(w["max_dd"], 0.05) * (0.5 + w["pos_periods"]) * min(w["track_days"] / 365, 2)


def scan(limit: int = 300, progress=None, previous: dict | None = None, **stage1_kw) -> dict[str, Any]:
    rows = requests.get(LEADERBOARD, timeout=60).json()["leaderboardRows"]
    prev = (previous or {}).get("copyable", []) + (previous or {}).get("rejected", [])
    cands = stage1(rows, limit=limit, skip={w["address"] for w in prev}, **stage1_kw)
    from concurrent.futures import ThreadPoolExecutor

    def one(c):
        sess = requests.Session()
        try:
            w = stage2(sess, c)
            ok, why = copyable(w)
            w["copyable"], w["rejected_because"], w["score"] = ok, why, score(w)
            time.sleep(0.6)
            return w
        except Exception as e:  # noqa: BLE001
            log.warning("%s: %s", c["address"], e)
            return None
    analysed = []
    with ThreadPoolExecutor(max_workers=2) as pool:
        for k, w in enumerate(pool.map(one, cands)):
            if w:
                analysed.append(w)
            if progress and k % 25 == 0:
                progress(k, len(cands))
    analysed = [w for w in prev if not w.get("early_exit")] + analysed
    good, seen = [], set()
    for w in sorted([w for w in analysed if w["copyable"]], key=lambda w: -w["score"]):
        if tuple(w["fingerprint"]) in seen:          # same P&L history = same owner's sub-accounts
            continue
        seen.add(tuple(w["fingerprint"]))
        good.append(w)
    for w in analysed:
        w["fingerprint"] = list(w.get("fingerprint", ()))
    return {"ts": int(time.time() * 1000), "leaderboard_size": len(rows),
            "stage1": len(cands) + len((previous or {}).get("copyable", []) + (previous or {}).get("rejected", [])),
            "analysed": len(analysed), "copyable": good, "rejected": [w for w in analysed if not w["copyable"]]}
