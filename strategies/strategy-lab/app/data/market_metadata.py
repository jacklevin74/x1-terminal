"""Exchange metadata and Hyperliquid precision rules.

Hyperliquid perps: order size is rounded to `szDecimals`; prices allow at most
5 significant figures and at most (6 - szDecimals) decimal places. Minimum order
value is $10 notional.
"""
from __future__ import annotations

import math
from decimal import ROUND_DOWN, Decimal
from typing import Any

from app.storage.models import MarketInfo

HL_MIN_NOTIONAL = 10.0
MAX_PERP_PRICE_DECIMALS = 6


class MetadataError(ValueError):
    pass


def parse_markets(meta: dict[str, Any], ctxs: list[dict[str, Any]], wanted: tuple[str, ...]) -> dict[str, MarketInfo]:
    universe = meta.get("universe") or []
    if len(universe) != len(ctxs):
        raise MetadataError("meta universe and asset contexts have different lengths")
    out: dict[str, MarketInfo] = {}
    for asset, ctx in zip(universe, ctxs):
        name = asset.get("name")
        if name not in wanted:
            continue
        if asset.get("isDelisted"):
            raise MetadataError(f"{name} is delisted")
        try:
            sz_dec = int(asset["szDecimals"])
            max_lev = int(asset["maxLeverage"])
            funding = float(ctx["funding"])
        except (KeyError, TypeError, ValueError) as e:
            raise MetadataError(f"{name}: incomplete metadata ({e})") from e
        if not 0 <= sz_dec <= 6 or max_lev < 1:
            raise MetadataError(f"{name}: implausible metadata szDecimals={sz_dec} maxLeverage={max_lev}")
        out[name] = MarketInfo(name=name, sz_decimals=sz_dec, max_leverage=max_lev,
                               min_notional=HL_MIN_NOTIONAL, funding_rate_hourly=funding, verified=True)
    missing = set(wanted) - set(out)
    if missing:
        raise MetadataError(f"markets not found in exchange metadata: {sorted(missing)}")
    return out


def round_size_down(size: float, sz_decimals: int) -> float:
    """Always round toward zero so rounding can never increase risk."""
    q = Decimal(1).scaleb(-sz_decimals)
    return float(Decimal(str(size)).quantize(q, rounding=ROUND_DOWN))


def tick_size(px: float, sz_decimals: int) -> float:
    """Smallest price step Hyperliquid allows at this price (5 significant figures, max decimals)."""
    magnitude = math.floor(math.log10(px))
    decimals = min(MAX_PERP_PRICE_DECIMALS - sz_decimals, max(0, 4 - magnitude))
    return 10.0 ** -decimals


def round_price(px: float, sz_decimals: int, mode: str = "nearest") -> float:
    """Round to Hyperliquid's tick rules. mode: nearest | down | up."""
    if px <= 0:
        raise ValueError("price must be positive")
    max_dec = MAX_PERP_PRICE_DECIMALS - sz_decimals
    # 5 significant figures (integers are always allowed regardless of sig figs)
    magnitude = math.floor(math.log10(px))
    sig_dec = max(0, 4 - magnitude)
    decimals = min(max_dec, sig_dec)
    factor = 10 ** decimals
    if mode == "down":
        v = math.floor(px * factor + 1e-9) / factor
    elif mode == "up":
        v = math.ceil(px * factor - 1e-9) / factor
    else:
        v = round(px * factor) / factor
    if px >= 1e5 and decimals == 0:
        v = float(int(v))
    return round(v, decimals)
