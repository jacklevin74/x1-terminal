"""Exposure and correlation limits."""
from __future__ import annotations

# BTC and ETH move together closely enough that holding both is one bet.
CORRELATION_GROUPS: list[set[str]] = [{"BTC", "ETH"}]


def correlated_open(market: str, open_markets: list[str]) -> int:
    group = next((g for g in CORRELATION_GROUPS if market in g), {market})
    return sum(1 for m in open_markets if m in group)
