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
from app.data.universe import UNIVERSE
from app.storage.database import Database, now_ms
from app.strategy.firefly import FireflyStrategy
from app.strategy.synchrony import close_matrix, order_parameter

log = logging.getLogger(__name__)
DAY = 86_400_000

# name -> (label, strategy kind, exit mode)
VARIANTS: dict[str, tuple[str, str, str]] = {
    "F0": ("Firefly control: no sync filter", "firefly:F0", "trailing_reverse"),
    "F1": ("Firefly: synced market only", "firefly:F1", "trailing_reverse"),
    "F2": ("Firefly placebo: unsynced only", "firefly:F2", "trailing_reverse"),
}

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
                           "variants": {k: v[0] for k, v in VARIANTS.items()}}
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
