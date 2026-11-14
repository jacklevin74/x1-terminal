"""Exchange adapter interface. Paper, testnet and fakes in tests implement this.

Rule for callers: an `OrderAck` only says the request was accepted. Fills and
positions must be confirmed with `get_positions()` / `get_open_orders()` /
`get_fills()` before anything is assumed.
"""
from __future__ import annotations

import hashlib
from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from typing import Any


@dataclass
class OrderAck:
    status: str                    # filled | resting | rejected | error
    oid: int | None = None
    filled_size: float = 0.0
    avg_px: float | None = None
    error: str | None = None
    raw: Any = None


@dataclass
class ExchangePosition:
    market: str
    size: float                    # signed: + long, - short
    entry_px: float


@dataclass
class ExchangeOrder:
    cloid: str | None
    oid: int | None
    market: str
    is_buy: bool
    size: float
    limit_px: float | None
    trigger_px: float | None
    reduce_only: bool
    kind: str                      # stop | take_profit | limit


@dataclass
class Fill:
    cloid: str | None
    oid: int | None
    market: str
    is_buy: bool
    size: float
    px: float
    fee: float
    ts: int
    extra: dict = field(default_factory=dict)


class ExchangeAdapter(ABC):
    mode: str = "abstract"
    supports_protective_orders: bool = True

    @abstractmethod
    def get_equity(self) -> float: ...

    @abstractmethod
    def get_positions(self) -> dict[str, ExchangePosition]: ...

    @abstractmethod
    def get_open_orders(self) -> list[ExchangeOrder]: ...

    @abstractmethod
    def get_fills(self, since_ms: int) -> list[Fill]: ...

    @abstractmethod
    def place_entry(self, market: str, is_buy: bool, size: float, limit_px: float, cloid: str) -> OrderAck:
        """Immediate-or-cancel limit order. Unfilled remainder is cancelled."""

    @abstractmethod
    def place_stop(self, market: str, is_buy: bool, size: float, trigger_px: float, cloid: str) -> OrderAck:
        """Reduce-only stop-market trigger order."""

    @abstractmethod
    def place_take_profit(self, market: str, is_buy: bool, size: float, limit_px: float, cloid: str) -> OrderAck:
        """Reduce-only resting limit order."""

    @abstractmethod
    def cancel(self, market: str, cloid: str) -> bool: ...

    @abstractmethod
    def close_position(self, market: str, cloid: str) -> OrderAck:
        """Reduce-only aggressive close of the whole position."""


def make_cloid(*parts: Any) -> str:
    """Deterministic 128-bit client order id (Hyperliquid format: 0x + 32 hex).
    The same signal always maps to the same id, which blocks duplicate submission."""
    h = hashlib.sha256("|".join(str(p) for p in parts).encode()).hexdigest()[:32]
    return "0x" + h
