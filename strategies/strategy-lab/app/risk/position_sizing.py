"""Position sizing from stop distance and all-in costs.

    R = E * r                         planned dollar risk budget
    loss_per_notional = stop% + 2*fee + 2*slippage + funding_estimate
    N = R / loss_per_notional         notional, so a stop-out costs at most R
    margin = N / leverage

Size is rounded DOWN to exchange precision, so rounding can only reduce risk.
"""
from __future__ import annotations

from dataclasses import dataclass

from app.data.market_metadata import round_size_down


@dataclass
class CostModel:
    fee_rate: float            # per side
    slippage: float            # per side, fraction of price
    funding_per_hour: float    # adverse hourly funding rate assumed (absolute)
    funding_hours: float

    @property
    def round_trip_cost_pct(self) -> float:
        return 2 * self.fee_rate + 2 * self.slippage + self.funding_per_hour * self.funding_hours


@dataclass
class SizeResult:
    size: float
    notional: float
    margin: float
    leverage: float
    planned_risk: float          # dollar loss if stopped, including costs
    est_costs: float             # dollar costs (fees + slippage + funding) for the round trip
    capped_by_leverage: bool


def size_position(equity: float, risk_fraction: float, entry: float, stop: float, max_leverage: float,
                  sz_decimals: int, costs: CostModel) -> SizeResult:
    if equity <= 0 or entry <= 0:
        return SizeResult(0, 0, 0, 0, 0, 0, False)
    budget = equity * risk_fraction
    stop_pct = abs(entry - stop) / entry
    loss_per_notional = stop_pct + costs.round_trip_cost_pct
    notional = budget / loss_per_notional
    capped = False
    max_notional = equity * max_leverage
    if notional > max_notional:
        notional, capped = max_notional, True
    size = round_size_down(notional / entry, sz_decimals)
    notional = size * entry
    return SizeResult(
        size=size,
        notional=notional,
        margin=notional / max_leverage if max_leverage else notional,
        leverage=notional / equity,
        planned_risk=notional * loss_per_notional,
        est_costs=notional * costs.round_trip_cost_pct,
        capped_by_leverage=capped,
    )


def liquidation_price(entry: float, direction: str, leverage: float, mmr: float) -> float:
    """Approximate isolated-margin liquidation price. Margin = N/leverage; liquidation
    happens when the loss leaves only maintenance margin (N * mmr)."""
    move = 1.0 / leverage - mmr
    return entry * (1 - move) if direction == "long" else entry * (1 + move)
