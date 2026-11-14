"""EXP-005 runner: cross-sectional momentum / reversal on the coin universe."""
from __future__ import annotations

import logging
from typing import Any

from app.backtest.portfolio import XsConfig, daily_funding, load_daily, report, run_xs
from app.config import HL_MAINNET_URL
from app.data.market_data import HyperliquidInfo
from app.data.universe import UNIVERSE
from app.storage.database import Database, now_ms
from app.storage.models import MarketInfo

log = logging.getLogger(__name__)

XS_VARIANTS: dict[str, tuple[str, XsConfig]] = {
    "M1": ("Momentum: long top 3 / short bottom 3", XsConfig()),
    "M2": ("Reversal: long 7-day losers / short winners", XsConfig(reversal=True)),
    "M3": ("Momentum long-only: top 3", XsConfig(n_short=0)),
    "M1r": ("Momentum, registered 0.5%-risk sizing", XsConfig(sizing="risk")),
}


def tradable_infos() -> dict[str, MarketInfo]:
    meta, ctxs = HyperliquidInfo(HL_MAINNET_URL).meta_and_ctxs()
    out = {}
    for a, ctx in zip(meta["universe"], ctxs):
        n = a.get("name")
        if n in UNIVERSE and not a.get("isDelisted") and int(a["maxLeverage"]) >= 2:
            out[n] = MarketInfo(n, int(a["szDecimals"]), int(a["maxLeverage"]), 10.0, float(ctx["funding"]), True)
    return out


def run_all_xs(db: Database) -> dict[str, Any]:
    infos = tradable_infos()
    coins = list(infos)
    funding = daily_funding(db, coins)
    out: dict[str, Any] = {"ts": now_ms(), "coins": coins, "labels": {k: v[0] for k, v in XS_VARIANTS.items()},
                           "sources": {}}
    for src in ("binance", "hyperliquid"):
        frames = load_daily(db, src, coins)
        out["sources"][src] = {k: report(run_xs(frames, infos, funding, cfg), cfg.starting_equity) | {"label": lab}
                               for k, (lab, cfg) in XS_VARIANTS.items()}
    db.set_state("research:xs", out)
    return out
