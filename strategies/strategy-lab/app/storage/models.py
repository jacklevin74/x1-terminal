"""Plain data objects passed between components."""
from __future__ import annotations

from dataclasses import asdict, dataclass, field
from enum import Enum
from typing import Any


class Direction(str, Enum):
    LONG = "long"
    SHORT = "short"


@dataclass
class Signal:
    """Output of the strategy engine. A signal is a candidate, not a trade."""
    market: str
    direction: Direction | None
    timestamp_ms: int              # close time of the 1H candle that produced it
    expires_ms: int
    trend: str                     # bullish | bearish | neutral
    pullback: bool
    confirmation: bool
    entry: float | None = None
    stop: float | None = None
    target: float | None = None
    reward_risk: float | None = None
    atr_4h: float | None = None
    checks: dict[str, bool] = field(default_factory=dict)
    notes: list[str] = field(default_factory=list)
    snapshot: dict[str, Any] = field(default_factory=dict)

    @property
    def is_candidate(self) -> bool:
        return (
            self.direction is not None
            and self.pullback
            and self.confirmation
            and None not in (self.entry, self.stop, self.target)
        )

    def to_dict(self) -> dict[str, Any]:
        d = asdict(self)
        d["direction"] = self.direction.value if self.direction else None
        return d


@dataclass
class TradeProposal:
    """What reaches the risk engine. Claude's opinion is attached, not trusted."""
    market: str
    direction: Direction
    entry: float
    stop: float
    target: float
    signal_ts_ms: int
    signal_expires_ms: int
    ai_decision: str | None = None
    ai_confidence: float | None = None
    ai_reasoning: str | None = None


@dataclass
class MarketInfo:
    """Verified exchange metadata for one perp market."""
    name: str
    sz_decimals: int
    max_leverage: int
    min_notional: float = 10.0
    funding_rate_hourly: float | None = None
    verified: bool = False
    slippage_bps: float | None = None      # per-market cost override (altcoins); None = config default
    half_spread_bps: float | None = None
    max_spread_bps: float | None = None    # per-market spread guard; None = config default

    @property
    def maintenance_margin_rate(self) -> float:
        # Hyperliquid: maintenance margin = half of the initial margin at max leverage.
        return 1.0 / (2.0 * self.max_leverage)


@dataclass
class AccountState:
    equity: float
    peak_equity: float
    week_start_equity: float
    week_realized_pnl: float
    trades_this_week: int
    open_positions: list[str]       # markets with an open position
    halted: bool = False
    halt_reason: str | None = None
    open_margin: float = 0.0        # margin already used by open positions
    open_risk: float = 0.0          # planned stop-out loss of open positions


@dataclass
class MarketContext:
    """Live market facts the risk engine needs at decision time."""
    bid: float
    ask: float
    data_age_seconds: float
    funding_rate_hourly: float = 0.0

    @property
    def mid(self) -> float:
        return (self.bid + self.ask) / 2.0

    @property
    def spread_bps(self) -> float:
        return (self.ask - self.bid) / self.mid * 1e4 if self.mid else float("inf")


@dataclass
class RiskDecision:
    approved: bool
    reasons: list[str]
    market: str
    direction: str
    entry: float | None = None
    stop: float | None = None
    target: float | None = None
    size: float = 0.0               # base-asset quantity, already rounded to exchange precision
    notional: float = 0.0
    margin: float = 0.0
    leverage: float = 0.0
    planned_risk: float = 0.0       # stop-out loss including all estimated costs
    risk_budget: float = 0.0
    est_costs: float = 0.0
    gross_reward_risk: float = 0.0
    net_reward_risk: float = 0.0
    liquidation_price: float | None = None

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)
