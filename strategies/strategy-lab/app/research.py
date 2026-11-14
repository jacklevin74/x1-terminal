"""Historical research: synchrony index + backtests of every strategy variant.

Results are stored in the database (system_state) for the dashboard. Re-run daily
by the lab so the historical tables include the newest completed data.
"""
from __future__ import annotations

import dataclasses
import logging
import math
import time
from typing import Any

import numpy as np
import pandas as pd

from app.backtest.engine import Backtester
from app.backtest.performance import summarize
from app.config import HL_MAINNET_URL, Config
from app.data.history import load_funding, load_prepared
from app.data.market_data import HyperliquidInfo
from app.data.market_metadata import parse_markets
from app.storage.models import MarketInfo
from app.data.universe import UNIVERSE
from app.storage.database import Database, now_ms
from app.strategy.ema_cross import CrossStrategy
from app.strategy.firefly import FireflyStrategy
from app.strategy.synchrony import close_matrix, order_parameter

log = logging.getLogger(__name__)
DAY = 86_400_000

# name -> (label, strategy kind, exit mode)
VARIANTS: dict[str, tuple[str, str, str]] = {
    "pullback_fixed": ("Pullback, fixed 2R (original)", "pullback", "fixed"),
    "pullback_trail": ("Pullback, trailing stop (EXP-001 B)", "pullback", "trailing"),
    "cross4h": ("4H EMA cross (EXP-002 X1)", "cross", "reverse"),
    "F0": ("Firefly control: no sync filter", "firefly:F0", "trailing_reverse"),
    "F1": ("Firefly: synced market only", "firefly:F1", "trailing_reverse"),
    "F2": ("Firefly placebo: unsynced only", "firefly:F2", "trailing_reverse"),
}

# EXP-004: the same Firefly rules on every universe coin listed on Hyperliquid, up to 3 positions.
SWARM_VARIANTS: dict[str, tuple[str, str]] = {
    "S1": ("Firefly Swarm: synced only", "F1"),
    "S0": ("Swarm control: no sync filter", "F0"),
    "S2": ("Swarm placebo: unsynced only", "F2"),
}
ALT_SLIPPAGE_BPS, ALT_HALF_SPREAD_BPS, ALT_FUNDING_HOURLY = 10.0, 3.0, 0.000025
ALT_MAX_SPREAD_BPS = 15.0


def swarm_markets(db: Database, source: str, meta: dict, ctxs: list) -> dict[str, MarketInfo]:
    """Universe coins listed on Hyperliquid (max leverage >= 2) with full candle history in `source`."""
    out: dict[str, MarketInfo] = {}
    for asset, ctx in zip(meta["universe"], ctxs):
        name = asset.get("name")
        if name not in UNIVERSE or asset.get("isDelisted") or int(asset["maxLeverage"]) < 2:
            continue
        have = {iv for iv in ("1h", "4h", "1d")
                if db.query("SELECT 1 FROM candles WHERE source=? AND market=? AND interval=? LIMIT 1",
                            (source, name, iv))}
        if have != {"1h", "4h", "1d"}:
            continue
        alt = name not in ("BTC", "ETH")
        out[name] = MarketInfo(name=name, sz_decimals=int(asset["szDecimals"]), max_leverage=int(asset["maxLeverage"]),
                               min_notional=10.0, funding_rate_hourly=float(ctx["funding"]), verified=True,
                               slippage_bps=ALT_SLIPPAGE_BPS if alt else None,
                               half_spread_bps=ALT_HALF_SPREAD_BPS if alt else None,
                               max_spread_bps=ALT_MAX_SPREAD_BPS if alt else None)
    # keep the fixed universe order (pre-registered candidate order)
    return {c: out[c] for c in UNIVERSE if c in out}


def run_swarm(db: Database, cfg: Config, source: str, sync: pd.DataFrame, meta: dict, ctxs: list,
              funding) -> dict[str, Any]:
    infos = swarm_markets(db, source, meta, ctxs)
    coins = tuple(infos)
    scfg = dataclasses.replace(
        cfg, trading=dataclasses.replace(cfg.trading, allowed_assets=coins, max_open_positions=3),
        risk=dataclasses.replace(cfg.risk, max_trades_per_week=8),
        strategy=dataclasses.replace(cfg.strategy, exit_mode="trailing_reverse"))
    from app.data.candles import to_frame
    from app.strategy.signals import PreparedMarket
    prepared = {}
    for c in coins:
        fr = {iv: to_frame(db.load_candles(source, c, iv)) for iv in ("1d", "4h", "1h")}
        prepared[c] = PreparedMarket(c, fr["1d"], fr["4h"], fr["1h"], scfg.strategy)
    default_funding = {c: ALT_FUNDING_HOURLY for c in coins if c not in ("BTC", "ETH")}
    out: dict[str, Any] = {"coins": list(coins)}
    for name, (label, variant) in SWARM_VARIANTS.items():
        strategies = {c: FireflyStrategy(pm, sync, variant) for c, pm in prepared.items()}
        r = Backtester(scfg, prepared, infos, funding, strategies=strategies,
                       default_funding=default_funding).run()
        out[name] = r
        log.info("swarm %s %s: %d trades", source, name, len(r.trades))
    return out


def sync_index(db: Database, source: str) -> pd.DataFrame:
    return order_parameter(close_matrix(db, source, UNIVERSE))


def _clean(x: Any) -> Any:
    if isinstance(x, float) and (math.isinf(x) or math.isnan(x)):
        return None
    if isinstance(x, dict):
        return {k: _clean(v) for k, v in x.items()}
    if isinstance(x, list):
        return [_clean(v) for v in x]
    if isinstance(x, (np.floating,)):
        return _clean(float(x))
    if isinstance(x, (np.integer,)):
        return int(x)
    return x


def run_variant(cfg: Config, prepared, infos, funding, sync: pd.DataFrame | None, kind: str, exit_mode: str):
    c = dataclasses.replace(cfg, strategy=dataclasses.replace(cfg.strategy, exit_mode=exit_mode))
    strategies = None
    if kind == "cross":
        strategies = {m: CrossStrategy(pm, "ema_cross_4h") for m, pm in prepared.items()}
    elif kind.startswith("firefly:"):
        strategies = {m: FireflyStrategy(pm, sync, kind.split(":")[1]) for m, pm in prepared.items()}
    return Backtester(c, prepared, infos, funding, strategies=strategies).run()


def sync_buckets(trades: list[dict], sync: pd.DataFrame, n: int = 5) -> list[dict]:
    """Exploratory: average result by synchrony (R_s relative to baseline) at entry."""
    if not trades:
        return []
    t_idx = sync.index.to_numpy(dtype="int64")
    rel = (sync["R_s"] / sync["baseline"]).to_numpy()
    rows = []
    for t in trades:
        k = int(np.searchsorted(t_idx, t["opened_ms"], side="right")) - 1
        if k >= 0 and not np.isnan(rel[k]):
            rows.append({"rel": rel[k], "R": t["r_multiple"], "win": t["net_pnl"] > 0})
    if len(rows) < n * 3:
        return []
    df = pd.DataFrame(rows)
    df["bucket"] = pd.qcut(df["rel"], n, labels=False, duplicates="drop")
    g = df.groupby("bucket").agg(lo=("rel", "min"), hi=("rel", "max"), trades=("R", "size"),
                                 avg_R=("R", "mean"), win_rate=("win", "mean"))
    return g.reset_index(drop=True).to_dict("records")


def run_all(db: Database, cfg: Config, sources: tuple[str, ...] = ("binance", "hyperliquid")) -> dict[str, Any]:
    started = time.time()
    meta, ctxs = HyperliquidInfo(HL_MAINNET_URL).meta_and_ctxs()
    infos = parse_markets(meta, ctxs, cfg.trading.allowed_assets)
    funding = load_funding(db, cfg.trading.allowed_assets)
    out: dict[str, Any] = {"ts": now_ms(), "sources": {},
                           "variants": {**{k: v[0] for k, v in VARIANTS.items()},
                                        **{k: v[0] for k, v in SWARM_VARIANTS.items()}}}
    for src in sources:
        sync = sync_index(db, src)
        prepared = load_prepared(db, cfg, src)
        res_src: dict[str, Any] = {}
        for name, (label, kind, exit_mode) in VARIANTS.items():
            r = run_variant(cfg, prepared, infos, funding, sync, kind, exit_mode)
            curve = pd.Series(dict(r.equity_curve))
            daily = curve.groupby(curve.index // DAY * DAY).last()
            res_src[name] = {
                "summary": summarize(r.trades, cfg.account.starting_balance),
                "splits": r.splits, "halts": len(r.halts),
                "curve": [[int(k), float(v)] for k, v in daily.items()],
                "trades": [{k: t[k] for k in ("market", "direction", "opened_ms", "closed_ms", "entry", "exit",
                                              "net_pnl", "r_multiple", "exit_reason")} for t in r.trades],
            }
            if name == "F0":
                res_src["F0"]["sync_buckets"] = sync_buckets(r.trades, sync)
            log.info("research %s %s: %s trades", src, name, len(r.trades))
        sw = run_swarm(db, cfg, src, sync, meta, ctxs, funding)
        for name in SWARM_VARIANTS:
            r = sw[name]
            curve = pd.Series(dict(r.equity_curve))
            dly = curve.groupby(curve.index // DAY * DAY).last()
            years = max((r.end_ms - r.start_ms) / (365 * DAY), 1e-9)
            by_coin: dict[str, list[float]] = {}
            for t in r.trades:
                by_coin.setdefault(t["market"], []).append(t["r_multiple"])
            res_src[name] = {
                "summary": summarize(r.trades, cfg.account.starting_balance),
                "splits": r.splits, "halts": len(r.halts), "trades_per_year": len(r.trades) / years,
                "curve": [[int(k), float(v)] for k, v in dly.items()],
                "by_coin": {k: {"trades": len(v), "avg_R": float(np.mean(v))} for k, v in by_coin.items()},
                "rejections": dict(r.rejections.most_common(8)),
                "trades": [{k: t[k] for k in ("market", "direction", "opened_ms", "closed_ms", "entry", "exit",
                                              "net_pnl", "r_multiple", "exit_reason")} for t in r.trades],
            }
        res_src["_swarm_coins"] = sw["coins"]
        s = sync.dropna(subset=["R_s"])
        daily = s.groupby(s.index // DAY * DAY).last()
        btc = pd.Series({r["close_t"]: r["c"] for r in db.load_candles(src, "BTC", "1d")})
        out["sources"][src] = {
            "results": res_src,
            "sync_daily": [[int(t), float(r.R_s), (None if np.isnan(r.baseline) else float(r.baseline)),
                            bool(r.synced), int(r.n)] for t, r in daily.iterrows()],
            "btc_daily": [[int(t), float(v)] for t, v in btc.items()],
            "synced_share": float(s["synced"].mean()) if len(s) else None,
            "coins": int(s["n"].iloc[-1]) if len(s) else 0,
        }
    out["runtime_s"] = round(time.time() - started, 1)
    out = _clean(out)
    db.set_state("research:results", out)
    return out
