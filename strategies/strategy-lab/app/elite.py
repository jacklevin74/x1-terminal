"""EXP-014 Majority-vote ensemble and EXP-015 Weighted multi-trader portfolio (paper only).

Shared trader pool: wallets from the latest leaderboard scan that pass the EXP-007 signal-source rule
(profitable on perps all-time and this month, active, not a market maker or HFT) with a 90+ day record,
re-profiled from their Hyperliquid P&L history:
  dd      = worst fall of cumulative perp P&L from its peak, divided by max(peak P&L, account value)
            (the scan's drawdown divides by the account value at the peak, which explodes for traders
            who withdrew their profits)
  score   = all-time perp P&L / max(dollar drawdown, 5% of peak P&L)   (profit per dollar of drawdown)
  daily   = last 30 days of daily perp P&L changes (for correlation between traders)
"""
from __future__ import annotations

import logging
import math
import time
from typing import Any

import numpy as np
import requests

from app.allocators import ExpertWeights, clusters, hrp_weights
from app.consensus import is_signal_source
from app.lab_books import HOUR, MIN_NOTIONAL, PaperBook
from app.storage.database import now_ms

log = logging.getLogger(__name__)
INFO = "https://api.hyperliquid.xyz/info"
DAY = 86_400_000
YEAR_MS = 365 * DAY


# -- trader pool ---------------------------------------------------------------------
def _post(s: requests.Session, body: dict) -> Any:
    for k in range(4):
        r = s.post(INFO, json=body, timeout=20)
        if r.status_code == 429:
            time.sleep(3 * (k + 1))
            continue
        return r.json()
    raise RuntimeError("rate limited")


def profile(s: requests.Session, addr: str) -> dict | None:
    port = dict(_post(s, {"type": "portfolio", "user": addr}))
    pnl = [(int(t), float(v)) for t, v in (port.get("perpAllTime") or {}).get("pnlHistory", [])]
    acct = [float(v) for _, v in (port.get("perpAllTime") or {}).get("accountValueHistory", [])]
    month = [(int(t), float(v)) for t, v in (port.get("perpMonth") or {}).get("pnlHistory", [])]
    if len(pnl) < 3:
        return None
    peak, dd_usd, dd = float("-inf"), 0.0, 0.0
    for _, v in pnl:
        peak = max(peak, v)
        dd_usd = max(dd_usd, peak - v)
    account = acct[-1] if acct else 0.0
    dd = dd_usd / max(peak, account, 1.0)
    score = pnl[-1][1] / max(dd_usd, 0.05 * max(peak, 1.0))
    daily = []
    if len(month) > 2:
        t0 = month[0][0]
        by_day: dict[int, float] = {}
        for t, v in month:
            by_day[(t - t0) // DAY] = v                    # last cumulative value of each day
        days = sorted(by_day)
        daily = [by_day[b] - by_day[a] for a, b in zip(days, days[1:])]
    return {"address": addr, "pnl": pnl[-1][1], "peak": peak, "dd": dd, "dd_usd": dd_usd, "score": score,
            "account": account, "daily": daily}


def build_pool(scan: dict, max_dd: float = 0.5, progress=None) -> list[dict]:
    s = requests.Session()
    cands = [w for w in scan.get("copyable", []) + scan.get("rejected", [])
             if is_signal_source(w) and w.get("track_days", 0) >= 90
             and (w.get("median_hold_h") is None or w["median_hold_h"] >= 2)]       # slower traders
    pool = []
    for w in cands:
        try:
            p = profile(s, w["address"])
        except Exception:  # noqa: BLE001
            continue
        time.sleep(0.2)
        if p and p["dd"] <= max_dd and p["account"] >= 10_000:
            p["median_hold_h"] = w.get("median_hold_h")
            pool.append(p)
    pool.sort(key=lambda p: -p["score"])
    return pool


def corr(a: list[float], b: list[float]) -> float:
    n = min(len(a), len(b))
    if n < 10:
        return 0.0
    x, y = np.array(a[-n:]), np.array(b[-n:])
    if x.std() == 0 or y.std() == 0:
        return 0.0
    return float(np.corrcoef(x, y)[0, 1])


def pick_diverse(pool: list[dict], n: int, max_corr: float = 0.7) -> list[dict]:
    """Best score first, skipping traders whose daily P&L moves with someone already picked."""
    out: list[dict] = []
    for p in pool:
        if all(corr(p["daily"], q["daily"]) <= max_corr for q in out):
            out.append(p)
        if len(out) >= n:
            break
    return out


_POOL_CACHE: dict = {}
_POS_CACHE: dict[str, tuple[float, tuple[float, dict[str, float]]]] = {}
POS_TTL_S = 30.0          # several books follow overlapping traders: read each wallet once per 30 s


def positions(s: requests.Session, addr: str) -> tuple[float, dict[str, float]] | None:
    """(account value, coin -> signed position value)."""
    hit = _POS_CACHE.get(addr)
    if hit and time.time() - hit[0] < POS_TTL_S:
        return hit[1]
    try:
        st = _post(s, {"type": "clearinghouseState", "user": addr})
    except Exception:  # noqa: BLE001
        return None
    av = float(st["marginSummary"]["accountValue"])
    pos = {}
    for p in st.get("assetPositions", []):
        q = p["position"]
        szi = float(q["szi"])
        if szi:
            pos[q["coin"]] = float(q["positionValue"]) * (1 if szi > 0 else -1)
    _POS_CACHE[addr] = (time.time(), (av, pos))
    return av, pos


class _TraderBook(PaperBook):
    """Shared: refresh the trader list after each new scan; portfolio kill switch."""
    n_traders = 15
    kill_frac = 0.85

    def __init__(self, *a, **kw):
        super().__init__(*a, **kw)
        self.sess = requests.Session()

    def traders(self) -> list[dict]:
        return self._state("traders").get("list", [])

    def refresh_traders(self, force: bool = False) -> list[str]:
        scan = self.db.get_state("wallets:scan") or {}
        st = self._state("traders")
        if not force and st.get("scan_ts") == scan.get("ts") and st.get("list"):
            return []
        key = (scan.get("ts"), now_ms() // DAY if force else None)
        if _POOL_CACHE.get("key") != key:                 # one pool per scan, shared by all books
            _POOL_CACHE.update(key=key, pool=build_pool(scan))
        pool = _POOL_CACHE["pool"]
        chosen = self.choose(pool)
        if not chosen:
            return []
        old = {t["address"] for t in st.get("list", [])}
        self._set("traders", {"scan_ts": scan.get("ts"), "ts": now_ms(), "list": chosen, "pool": len(pool)})
        added = [t["address"][:8] for t in chosen if t["address"] not in old]
        self.db.log_event(f"{self.book}_traders", {"n": len(chosen), "added": added, "pool": len(pool)}, self.mode)
        self.notify("info", self.book, f"{self.book}: {len(chosen)} traders from a pool of {len(pool)}"
                                       + (f"; new {', '.join(added)}" if added else ""))
        return added

    def choose(self, pool: list[dict]) -> list[dict]:
        raise NotImplementedError

    def killed(self) -> bool:
        st = self._state("kill")
        if st.get("killed"):
            return True
        eq = self.ex.get_equity()
        if eq < self.kill_frac * self.cfg.account.starting_balance:
            for t in self.pm.open_trades():
                self.close(t, "kill")
            self.pm.sync()
            self._set("kill", {"killed": True, "ts": now_ms(), "equity": eq})
            self.notify("critical", self.book, f"{self.book}: portfolio stop at ${eq:.2f}; flattened and halted")
            return True
        return False

    # hooks for the take-profit twins (EXP-022); no-ops here
    def blocked(self, coin: str, long: bool) -> bool:
        return False

    def release(self, wanted: dict[str, bool]) -> None:
        pass

    def _follow(self, target: dict[str, float], n_read: int) -> list[str]:
        self.release({m: v > 0 for m, v in target.items()})
        actions = []
        for t in self.pm.open_trades():
            m, side = t["market"], (1 if t["direction"] == "long" else -1)
            want = target.get(m, 0.0)
            cur = t["size"] * t["entry"]
            rebuild = want * side > 0 and (abs(want) > WP_REBUILD * cur or abs(want) < cur / WP_REBUILD)
            if want * side <= 0 or rebuild:
                self.close(t, "leader_exit")
                actions.append(f"close {m}")
        self.pm.sync()
        held = {t["market"] for t in self.pm.open_trades()}
        for m, v in target.items():
            if m in held or len(held) >= self.max_positions or self.blocked(m, v > 0):
                continue
            if self.open_n(m, v > 0, abs(v), WP_STOP):
                held.add(m)
                actions.append(f"open {m} {'long' if v > 0 else 'short'} ${abs(v):.0f}")
        self._set("last", {"ts": now_ms(), "target": target, "traders_read": n_read})
        if actions:
            self.db.log_event(f"{self.book}_step", {"actions": actions}, self.mode)
            self.notify("info", self.book, f"{self.book}: " + "; ".join(actions))
        self._record_equity()
        return actions

    def open_n(self, coin: str, long: bool, notional: float, stop_pct: float) -> int | None:
        q = self.quote(coin)
        if q is None or coin not in self.infos:
            return None
        px = q[1] if long else q[0]
        stop = px * (1 - stop_pct) if long else px * (1 + stop_pct)
        return self.open(coin, long, px, stop, None, now_ms() + YEAR_MS, {}, maker=False, notional=notional)


# == EXP-014 majority-vote ensemble ============================================
ENS_MIN_AGREE, ENS_SHARE_IN, ENS_SHARE_OUT, ENS_MIN_HOLD = 3, 2 / 3, 0.5, 2
ENS_STOP = 0.10


def ensemble_votes(books: list[dict[str, float]]) -> dict[str, dict]:
    """coin -> {longs, shorts, side, share}; one vote per trader."""
    out: dict[str, dict] = {}
    for pos in books:
        for c, v in pos.items():
            d = out.setdefault(c, {"longs": 0, "shorts": 0})
            d["longs" if v > 0 else "shorts"] += 1
    for d in out.values():
        n = d["longs"] + d["shorts"]
        d["side"] = 1 if d["longs"] > d["shorts"] else -1 if d["shorts"] > d["longs"] else 0
        d["agree"] = max(d["longs"], d["shorts"])
        d["share"] = d["agree"] / n if n else 0.0
    return out


class EnsembleBook(_TraderBook):
    book = "ensemble"
    max_positions = 6
    n_traders = 15

    def choose(self, pool):
        return [{"address": p["address"], "score": round(p["score"], 2), "dd": round(p["dd"], 3)}
                for p in pool[: self.n_traders]]

    def step(self) -> list[str]:
        """Every 5 minutes."""
        if self.breaker.is_halted() or self.killed():
            return []
        books = []
        for t in self.traders():
            r = positions(self.sess, t["address"])
            if r:
                books.append(r[1])
            time.sleep(0.15)
        if len(books) < 5:
            return []
        votes = ensemble_votes(books)
        self._set("votes", {"ts": now_ms(), "traders_read": len(books),
                            "top": sorted(([c, v["longs"], v["shorts"]] for c, v in votes.items()),
                                          key=lambda x: -max(x[1], x[2]))[:15]})
        actions = []
        for t in self.pm.open_trades():
            v = votes.get(t["market"], {"side": 0, "agree": 0, "share": 0.0})
            ours = 1 if t["direction"] == "long" else -1
            if v["side"] != ours or v["agree"] < ENS_MIN_HOLD or v["share"] < ENS_SHARE_OUT:
                self.close(t, "signal_exit")
                actions.append(f"close {t['market']} ({v.get('longs', 0)}L/{v.get('shorts', 0)}S)")
        self.pm.sync()
        self.release({c: v["side"] > 0 for c, v in votes.items()
                      if v["side"] and v["agree"] >= ENS_MIN_HOLD and v["share"] >= ENS_SHARE_OUT})
        held = {t["market"] for t in self.pm.open_trades()}
        cands = sorted(((v["agree"], v["share"], c, v) for c, v in votes.items()
                        if v["side"] and v["agree"] >= ENS_MIN_AGREE and v["share"] >= ENS_SHARE_IN
                        and c not in held and c in self.infos and not self.blocked(c, v["side"] > 0)),
                       reverse=True)
        notional = self.ex.get_equity() / self.max_positions
        for agree, share, c, v in cands:
            if len(held) >= self.max_positions:
                break
            if self.open_n(c, v["side"] > 0, max(notional, MIN_NOTIONAL * 1.02), ENS_STOP):
                held.add(c)
                actions.append(f"open {c} {'long' if v['side'] > 0 else 'short'} ({v['longs']}L/{v['shorts']}S)")
        if actions:
            self.db.log_event("ensemble_step", {"actions": actions}, self.mode)
            self.notify("info", self.book, "ensemble: " + "; ".join(actions))
        self._record_equity()
        return actions


# == EXP-015 weighted multi-trader portfolio ======================================
WP_N, WP_MAX_CORR, WP_MAX_ALLOC, WP_COIN_CAP, WP_GROSS_CAP = 6, 0.7, 0.35, 0.25, 1.5
WP_STOP, WP_REBUILD, WP_MAX_POS = 0.15, 2.0, 10


def allocations(traders: list[dict], cap: float = WP_MAX_ALLOC) -> dict[str, float]:
    """Inverse-drawdown weights, normalised, each capped (excess spread over the rest)."""
    raw = {t["address"]: 1 / max(t["dd"], 0.05) for t in traders}
    w = {a: v / sum(raw.values()) for a, v in raw.items()}
    for _ in range(10):
        over = {a: v for a, v in w.items() if v > cap + 1e-12}
        if not over:
            break
        excess = sum(v - cap for v in over.values())
        free = {a: v for a, v in w.items() if a not in over}
        for a in over:
            w[a] = cap
        tot = sum(free.values())
        for a in free:
            w[a] += excess * free[a] / tot if tot else 0
    return w


def portfolio_targets(snaps: list[tuple[float, float, dict[str, float]]], equity: float) -> dict[str, float]:
    """snaps: (allocation, leader account value, coin -> signed value). Proportional sizing:
    our notional = sum alloc x (leader position / leader equity) x our equity, capped per coin and gross."""
    tgt: dict[str, float] = {}
    for alloc, av, pos in snaps:
        if av <= 0:
            continue
        for c, v in pos.items():
            tgt[c] = tgt.get(c, 0.0) + alloc * v / av * equity
    tgt = {c: math.copysign(min(abs(v), WP_COIN_CAP * equity), v) for c, v in tgt.items()}
    gross = sum(abs(v) for v in tgt.values())
    if gross > WP_GROSS_CAP * equity:
        tgt = {c: v * WP_GROSS_CAP * equity / gross for c, v in tgt.items()}
    keep = sorted(((c, v) for c, v in tgt.items() if abs(v) >= MIN_NOTIONAL), key=lambda x: -abs(x[1]))
    return dict(keep[:WP_MAX_POS])


class WeightedBook(_TraderBook):
    book = "weighted"
    max_positions = WP_MAX_POS

    def choose(self, pool):
        picks = pick_diverse(pool, WP_N, WP_MAX_CORR)
        if len(picks) < 4:
            return []
        al = allocations(picks)
        return [{"address": p["address"], "dd": round(p["dd"], 3), "score": round(p["score"], 2),
                 "alloc": round(al[p["address"]], 4)} for p in picks]

    def step(self) -> list[str]:
        """Every minute."""
        if self.breaker.is_halted() or self.killed():
            return []
        snaps = []
        for t in self.traders():
            r = positions(self.sess, t["address"])
            if r:
                snaps.append((t["alloc"], r[0], r[1]))
            time.sleep(0.15)
        if len(snaps) < 3:
            return []
        return self._follow(portfolio_targets(snaps, self.ex.get_equity()), len(snaps))


# == shared helpers for EXP-016..019 =================================================
FUNDING_EXTREME_APR = 0.25        # +/-25%/yr: the side paying this much is "fighting extreme funding"


def returns_matrix(traders: list[dict]) -> np.ndarray | None:
    """T x N daily returns (daily perp P&L / account value), aligned on the most recent days."""
    n = min((len(t["daily"]) for t in traders), default=0)
    if n < 10:
        return None
    return np.array([[d / max(t["account"], 1.0) for d in t["daily"][-n:]] for t in traders]).T


def funding_ok(apr: float | None, long: bool) -> bool:
    if apr is None:
        return True
    return not ((long and apr > FUNDING_EXTREME_APR) or (not long and apr < -FUNDING_EXTREME_APR))


class _FundingAware:
    """Mixin: current funding per coin from Hyperliquid metadata, refreshed hourly."""
    _meta_ts = 0.0

    def funding_apr(self, coin: str) -> float | None:
        if time.time() - self._meta_ts > 3600:
            try:
                self.refresh_metadata()
                self._meta_ts = time.time()
            except Exception:  # noqa: BLE001
                pass
        info = self.infos.get(coin)
        return None if info is None or info.funding_rate_hourly is None else info.funding_rate_hourly * 24 * 365


# == EXP-016 Hierarchical Risk Parity across traders ===================================
HRP_N = 8


class HRPBook(WeightedBook):
    """Same proportional copying as EXP-015, but the 8 best-scoring traders are allocated by HRP on
    their daily return series instead of inverse drawdown, and no correlation filter is needed."""
    book = "hrp"

    def choose(self, pool):
        picks = pool[:HRP_N]
        r = returns_matrix(picks)
        if r is None or len(picks) < 4:
            return []
        w = hrp_weights(r)
        return [{"address": p["address"], "dd": round(p["dd"], 3), "score": round(p["score"], 2),
                 "alloc": round(float(wi), 4)} for p, wi in zip(picks, w)]


# == EXP-017 Aggregating algorithm with sleeping experts and cluster penalty =========
EXP_N, EXP_ETA, EXP_ALPHA, EXP_SLEEP_H, EXP_CLUSTER_CORR = 15, 10.0, 0.02, 72, 0.5


class ExpertsBook(WeightedBook):
    """Each trader is an expert whose 'prediction' is its net exposure per coin (position / equity).
    Hourly: weights x exp(eta x last hour's return of the expert's book); inactive experts (no position
    and no fill for 72 h) sleep: excluded and their weight frozen. Effective weight divided by
    sqrt(cluster size). Our exposure = weighted average exposure, same caps as EXP-015."""
    book = "experts"

    def choose(self, pool):
        picks = pool[:EXP_N]
        r = returns_matrix(picks)
        cl = clusters(r, EXP_CLUSTER_CORR) if r is not None else list(range(len(picks)))
        return [{"address": p["address"], "dd": round(p["dd"], 3), "score": round(p["score"], 2),
                 "cluster": int(c), "alloc": 0.0} for p, c in zip(picks, cl)]

    def _experts(self) -> ExpertWeights:
        names = [t["address"] for t in self.traders()]
        st = self._state("weights")
        return ExpertWeights(names, EXP_ETA, EXP_ALPHA, state=st.get("w") if st.get("names") == names else None)

    def _awake(self, snaps: dict[str, tuple[float, dict]]) -> set[str]:
        st = self._state("activity")
        awake = set()
        for a, (av, pos) in snaps.items():
            if pos:
                st[a] = now_ms()
            if now_ms() - st.get(a, 0) < EXP_SLEEP_H * HOUR:
                awake.add(a)
        self._set("activity", st)
        return awake

    def update_weights(self, snaps: dict[str, tuple[float, dict]], mids: dict[str, float]) -> None:
        """Called hourly: score each expert on the exposures it held since the previous update."""
        last = self._state("last_exposure")
        ew = self._experts()
        awake = self._awake(snaps)
        gains = {}
        for a, ex in last.get("exposure", {}).items():
            g = 0.0
            for c, e in ex.items():
                p0, p1 = last.get("mids", {}).get(c), mids.get(c)
                if p0 and p1:
                    g += e * (p1 / p0 - 1)
            gains[a] = g
        if last:
            ew.update(gains, awake & set(gains))
        expo = {a: {c: v / av for c, v in pos.items()} for a, (av, pos) in snaps.items() if av > 0}
        self._set("last_exposure", {"ts": now_ms(), "exposure": expo,
                                    "mids": {c: mids[c] for e in expo.values() for c in e if c in mids}})
        self._set("weights", {"ts": now_ms(), "names": [t["address"] for t in self.traders()], "w": ew.w,
                              "awake": sorted(awake), "last_gains": gains})

    def step(self) -> list[str]:
        if self.breaker.is_halted() or self.killed():
            return []
        snaps = {}
        for t in self.traders():
            r = positions(self.sess, t["address"])
            if r:
                snaps[t["address"]] = r
            time.sleep(0.15)
        if len(snaps) < 3:
            return []
        if now_ms() - self._state("last_exposure").get("ts", 0) >= HOUR - 30_000:
            try:
                mids = {k: float(v) for k, v in self.info.all_mids().items()}
                self.update_weights(snaps, mids)
            except Exception:  # noqa: BLE001
                log.exception("experts: weight update failed")
        ew = self._experts()
        awake = self._awake(snaps)
        eff = ew.effective(awake & set(snaps), {t["address"]: t.get("cluster", -1) for t in self.traders()})
        rows = [(eff[a], av, pos) for a, (av, pos) in snaps.items() if a in eff]
        return self._follow(portfolio_targets(rows, self.ex.get_equity()), len(snaps))


# == EXP-018 Weighted portfolio + funding filter ====================================
class WeightedFundingBook(_FundingAware, WeightedBook):
    """EXP-015 unchanged, except a coin is not copied on the side that pays extreme funding
    (long above +25%/yr, short below -25%/yr): those crowded trades are the ones that get squeezed."""
    book = "weighted-ff"

    def step(self) -> list[str]:
        if self.breaker.is_halted() or self.killed():
            return []
        snaps = []
        for t in self.traders():
            r = positions(self.sess, t["address"])
            if r:
                snaps.append((t["alloc"], r[0], r[1]))
            time.sleep(0.15)
        if len(snaps) < 3:
            return []
        target = portfolio_targets(snaps, self.ex.get_equity())
        target = {c: v for c, v in target.items() if funding_ok(self.funding_apr(c), v > 0)}
        return self._follow(target, len(snaps))


# == EXP-019 Hybrid stack ============================================================
HY_N, HY_PER_CLUSTER, HY_MIN_AGREE, HY_SHARE_IN, HY_SHARE_OUT = 12, 3, 3, 0.6, 0.5
HY_RISK_MIN, HY_RISK_MAX, HY_RISK_TOTAL, HY_STOP, HY_GROSS = 0.005, 0.02, 0.08, 0.10, 1.0


def hybrid_ideas(snaps: list[tuple[float, float, dict]]) -> dict[str, dict]:
    """HRP-weighted consensus: per coin, weight of traders on each side / weight of all holders."""
    out: dict[str, dict] = {}
    for w, av, pos in snaps:
        for c, v in pos.items():
            d = out.setdefault(c, {"wl": 0.0, "ws": 0.0, "nl": 0, "ns": 0})
            if v > 0:
                d["wl"] += w; d["nl"] += 1
            else:
                d["ws"] += w; d["ns"] += 1
    for d in out.values():
        tot = d["wl"] + d["ws"]
        d["long"] = d["wl"] > d["ws"]
        d["share"] = max(d["wl"], d["ws"]) / tot if tot else 0.0
        d["agree"] = d["nl"] if d["long"] else d["ns"]
    return out


def idea_risk(share: float, regime_mult: float) -> float:
    """Fixed-fractional risk per idea: 0.5% of equity at 60% agreement rising to 2% at 100%."""
    x = (share - HY_SHARE_IN) / (1 - HY_SHARE_IN)
    return (HY_RISK_MIN + (HY_RISK_MAX - HY_RISK_MIN) * max(0.0, min(1.0, x))) * regime_mult


class HybridBook(_FundingAware, _TraderBook):
    """Filters -> correlation clusters (max 3 traders per cluster) -> HRP weights over 12 traders ->
    weighted consensus ideas -> funding filter -> Kuramoto regime (half risk when the market is not
    synchronised) -> fixed-fractional sizing (0.5-2% risk per idea at a 10% stop, 8% total risk,
    gross <= 1x) -> hard 10% stops and the $85 portfolio stop."""
    book = "hybrid"
    max_positions = 10

    def choose(self, pool):
        r = returns_matrix(pool[:40])
        cl = clusters(r, 0.5) if r is not None else list(range(len(pool)))
        picks, per = [], {}
        for p, c in zip(pool, cl):
            if per.get(c, 0) < HY_PER_CLUSTER:
                picks.append((p, c))
                per[c] = per.get(c, 0) + 1
            if len(picks) >= HY_N:
                break
        r = returns_matrix([p for p, _ in picks])
        if r is None or len(picks) < 5:
            return []
        w = hrp_weights(r)
        return [{"address": p["address"], "dd": round(p["dd"], 3), "score": round(p["score"], 2),
                 "cluster": int(c), "alloc": round(float(wi), 4)} for (p, c), wi in zip(picks, w)]

    def regime_mult(self) -> float:
        live = self.db.get_state("sync:live") or {}
        series = live.get("series") or []
        return 1.0 if series and series[-1][3] else 0.5

    def step(self) -> list[str]:
        if self.breaker.is_halted() or self.killed():
            return []
        snaps = []
        for t in self.traders():
            r = positions(self.sess, t["address"])
            if r:
                snaps.append((t["alloc"], r[0], r[1]))
            time.sleep(0.15)
        if len(snaps) < 5:
            return []
        ideas = hybrid_ideas(snaps)
        actions = []
        for t in self.pm.open_trades():
            d = ideas.get(t["market"])
            long = t["direction"] == "long"
            if not d or d["long"] != long or d["share"] < HY_SHARE_OUT or d["agree"] < 2:
                self.close(t, "signal_exit")
                actions.append(f"close {t['market']}")
        self.pm.sync()
        equity = self.ex.get_equity()
        mult = self.regime_mult()
        open_tr = self.pm.open_trades()
        held = {t["market"] for t in open_tr}
        risk_used = sum(t["size"] * t["entry"] for t in open_tr) * HY_STOP / equity
        gross = sum(t["size"] * t["entry"] for t in open_tr)
        cands = sorted(((d["share"], d["agree"], c, d) for c, d in ideas.items()
                        if d["agree"] >= HY_MIN_AGREE and d["share"] >= HY_SHARE_IN and c not in held
                        and c in self.infos), reverse=True)
        for share, agree, c, d in cands:
            if len(held) >= self.max_positions:
                break
            if not funding_ok(self.funding_apr(c), d["long"]):
                continue
            risk = idea_risk(share, mult)
            if risk_used + risk > HY_RISK_TOTAL:
                continue
            notional = risk * equity / HY_STOP
            if notional < 0.7 * MIN_NOTIONAL:
                continue
            notional = max(notional, MIN_NOTIONAL * 1.02)
            if gross + notional > HY_GROSS * equity:
                continue
            if self.open_n(c, d["long"], notional, HY_STOP):
                held.add(c)
                risk_used += notional * HY_STOP / equity
                gross += notional
                actions.append(f"open {c} {'long' if d['long'] else 'short'} ${notional:.0f} "
                               f"({d['nl']}L/{d['ns']}S, {share:.0%} of weight, risk {risk:.1%})")
        self._set("last", {"ts": now_ms(), "regime_mult": mult, "risk_used": round(risk_used, 4),
                           "ideas": {c: {k: d[k] for k in ("nl", "ns", "share")} for c, d in ideas.items()
                                     if d["agree"] >= 2}})
        if actions:
            self.db.log_event("hybrid_step", {"actions": actions}, self.mode)
            self.notify("info", self.book, "hybrid: " + "; ".join(actions))
        self._record_equity()
        return actions


# == EXP-020 random control, EXP-021 wide ensemble, EXP-022 take-profit twins ==========
import random  # noqa: E402

TRAIL_ACTIVATE, TRAIL_GAP, TRAIL_MIN_STEP = 0.03, 0.02, 0.001


class RandomWeightedBook(WeightedBook):
    """EXP-020: EXP-015 rules on 6 traders drawn at random from all signal-source wallets."""
    book = "weighted-random"

    def choose(self, pool):
        scan = self.db.get_state("wallets:scan") or {}
        srcs = sorted({w["address"] for w in scan.get("copyable", []) + scan.get("rejected", [])
                       if is_signal_source(w)})
        rng = random.Random(scan.get("ts", 0))
        rng.shuffle(srcs)
        picks = []
        for a in srcs:
            try:
                p = profile(self.sess, a)
            except Exception:  # noqa: BLE001
                p = None
            if p and p["account"] > 0:
                picks.append(p)
            if len(picks) >= WP_N:
                break
            time.sleep(0.2)
        if len(picks) < 4:
            return []
        al = allocations(picks)
        return [{"address": p["address"], "dd": round(p["dd"], 3), "score": round(p["score"], 2),
                 "alloc": round(al[p["address"]], 4)} for p in picks]


class WideEnsembleBook(EnsembleBook):
    """EXP-021: EXP-014 rules, voters = whole pool with at most 3 per correlation cluster."""
    book = "ensemble-wide"

    def choose(self, pool):
        r = returns_matrix(pool)
        cl = clusters(r, 0.5) if r is not None else list(range(len(pool)))
        per, out = {}, []
        for p, c in zip(pool, cl):
            if per.get(c, 0) < 3:
                per[c] = per.get(c, 0) + 1
                out.append({"address": p["address"], "score": round(p["score"], 2), "dd": round(p["dd"], 3),
                            "cluster": int(c)})
        return out


class _TrailMixin:
    """EXP-022: trailing take-profit (+3% activates, 2% trail) with a re-entry cooldown."""

    def _tstate(self, k):
        return self.db.get_state(f"{self.book}:{k}") or {}

    def blocked(self, coin, long):
        return self._tstate("cooldown").get(coin) == long

    def release(self, wanted):
        cool = self._tstate("cooldown")
        keep = {c: lg for c, lg in cool.items() if wanted.get(c) == lg}
        if keep != cool:
            self.db.set_state(f"{self.book}:cooldown", keep)

    def trail(self) -> list[str]:
        trail, cool, acts = self._tstate("trail"), self._tstate("cooldown"), []
        open_ids = {str(t["id"]): t for t in self.pm.open_trades()}
        for tid in [k for k in trail if k not in open_ids]:          # closed since last look
            row = self.db.query("SELECT market, direction, exit_reason FROM trades WHERE id=?", (int(tid),))
            if row and row[0]["exit_reason"] == "stop":
                self.db.execute("UPDATE trades SET exit_reason='trail_stop' WHERE id=?", (int(tid),))
                cool[row[0]["market"]] = row[0]["direction"] == "long"
            trail.pop(tid)
        for tid, t in open_ids.items():
            q = self.quote(t["market"])
            if not q:
                continue
            long = t["direction"] == "long"
            px = q[0] if long else q[1]
            best = trail.get(tid)
            if best is None:
                if (px / t["entry"] - 1) * (1 if long else -1) < TRAIL_ACTIVATE:
                    continue
                best = px
            best = max(best, px) if long else min(best, px)
            trail[tid] = best
            new = best * (1 - TRAIL_GAP) if long else best * (1 + TRAIL_GAP)
            better = new > t["stop"] * (1 + TRAIL_MIN_STEP) if long else new < t["stop"] * (1 - TRAIL_MIN_STEP)
            if better and self.om.move_stop(t["id"], t["market"], long, t["size"], new):
                acts.append(f"trail {t['market']} -> {new:.6g}")
        self.db.set_state(f"{self.book}:trail", trail)
        self.db.set_state(f"{self.book}:cooldown", cool)
        return acts

    def poll(self):
        super().poll()
        self.trail()

    def step(self):
        acts = super().step()
        return acts + self.trail()


class WeightedTPBook(_TrailMixin, WeightedBook):
    book = "weighted-tp"


class EnsembleTPBook(_TrailMixin, EnsembleBook):
    book = "ensemble-tp"
