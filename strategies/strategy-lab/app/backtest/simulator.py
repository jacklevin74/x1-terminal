"""Conservative fill model shared by the backtester and the paper exchange.

Rules:
- Entries are taker orders: long pays ask + slippage, short receives bid - slippage.
- Stops are stop-market (taker). A gap through the stop fills at the worse price.
- Targets are resting reduce-only limits (maker fee). They fill only if price
  trades *through* the target, not merely touches it.
- If a bar's range contains both stop and target, the stop is assumed first.
- Funding accrues hourly on notional; positive rate means longs pay.
"""
from __future__ import annotations

from dataclasses import dataclass, field


@dataclass
class FillParams:
    taker_fee: float
    maker_fee: float
    slippage: float          # fraction per taker fill
    half_spread: float       # fraction, used when no live book is available


@dataclass
class SimPosition:
    market: str
    direction: str
    size: float
    entry_px: float
    stop: float
    target: float | None          # None = no take-profit (trailing exits)
    opened_ms: int
    planned_risk: float
    fees: float = 0.0
    initial_stop: float | None = None
    extreme: float | None = None  # best price since entry (high for longs, low for shorts)
    funding: float = 0.0
    signal: dict = field(default_factory=dict)

    @property
    def is_long(self) -> bool:
        return self.direction == "long"


@dataclass
class ExitFill:
    price: float
    reason: str              # stop | target | time | emergency
    fee: float


def entry_price_from_open(open_px: float, direction: str, fp: FillParams) -> float:
    adj = fp.half_spread + fp.slippage
    return open_px * (1 + adj) if direction == "long" else open_px * (1 - adj)


def entry_fee(price: float, size: float, fp: FillParams) -> float:
    return price * size * fp.taker_fee


def gross_pnl(pos: SimPosition, exit_px: float) -> float:
    sign = 1 if pos.is_long else -1
    return sign * (exit_px - pos.entry_px) * pos.size


def check_bar_exit(pos: SimPosition, o: float, h: float, l: float, fp: FillParams) -> ExitFill | None:
    """Exit check for one OHLC bar. Stop has priority when both levels are inside the range."""
    if pos.is_long:
        if l <= pos.stop:
            px = min(pos.stop, o) * (1 - fp.slippage - fp.half_spread)
            return ExitFill(px, "stop", px * pos.size * fp.taker_fee)
        if pos.target is not None and h > pos.target:
            return ExitFill(pos.target, "target", pos.target * pos.size * fp.maker_fee)
    else:
        if h >= pos.stop:
            px = max(pos.stop, o) * (1 + fp.slippage + fp.half_spread)
            return ExitFill(px, "stop", px * pos.size * fp.taker_fee)
        if pos.target is not None and l < pos.target:
            return ExitFill(pos.target, "target", pos.target * pos.size * fp.maker_fee)
    return None


def check_quote_exit(pos: SimPosition, bid: float, ask: float, fp: FillParams) -> ExitFill | None:
    """Exit check against a live quote (paper trading)."""
    if pos.is_long:
        if bid <= pos.stop:
            px = bid * (1 - fp.slippage)
            return ExitFill(px, "stop", px * pos.size * fp.taker_fee)
        if pos.target is not None and bid > pos.target:
            return ExitFill(pos.target, "target", pos.target * pos.size * fp.maker_fee)
    else:
        if ask >= pos.stop:
            px = ask * (1 + fp.slippage)
            return ExitFill(px, "stop", px * pos.size * fp.taker_fee)
        if pos.target is not None and ask < pos.target:
            return ExitFill(pos.target, "target", pos.target * pos.size * fp.maker_fee)
    return None


def market_exit(pos: SimPosition, ref_px: float, fp: FillParams, reason: str) -> ExitFill:
    px = ref_px * (1 - fp.slippage) if pos.is_long else ref_px * (1 + fp.slippage)
    return ExitFill(px, reason, px * pos.size * fp.taker_fee)


def funding_payment(pos: SimPosition, mark_px: float, hourly_rate: float) -> float:
    """Positive return value = cost to us."""
    sign = 1 if pos.is_long else -1
    return sign * pos.size * mark_px * hourly_rate
