"""Independent, deterministic risk engine: the final authority on every trade.

Inputs are a TradeProposal (from the strategy, optionally reviewed by Claude),
the account state, live market context and verified exchange metadata. Claude's
opinion is never an input to sizing or to any rule here, and there is no
exception path: every failed rule is a rejection.
"""
from __future__ import annotations

import logging
from dataclasses import dataclass

from app.config import Config
from app.risk.exposure import correlated_open
from app.risk.position_sizing import CostModel, liquidation_price, size_position
from app.storage.models import AccountState, MarketContext, MarketInfo, RiskDecision, TradeProposal

log = logging.getLogger(__name__)

EPS = 1e-9


@dataclass
class RiskInputs:
    proposal: TradeProposal
    account: AccountState
    market: MarketContext | None
    info: MarketInfo | None
    now_ms: int
    protective_orders_supported: bool


class RiskEngine:
    def __init__(self, cfg: Config):
        self.cfg = cfg

    def evaluate(self, x: RiskInputs) -> RiskDecision:
        cfg, p, acct = self.cfg, x.proposal, x.account
        rc, sc, ec = cfg.risk, cfg.strategy, cfg.execution
        reasons: list[str] = []
        d = RiskDecision(approved=False, reasons=reasons, market=p.market, direction=p.direction.value,
                         stop=p.stop, target=p.target)

        # -- account / system state ---------------------------------------
        if acct.halted:
            reasons.append(f"trading halted: {acct.halt_reason}")
        if p.market not in cfg.trading.allowed_assets:
            reasons.append(f"market {p.market} is not approved")
        if len(acct.open_positions) >= cfg.trading.max_open_positions:
            reasons.append(f"account already has an open position ({', '.join(acct.open_positions)})")
        if correlated_open(p.market, acct.open_positions) >= rc.max_correlated_positions:
            reasons.append("correlated position already open")
        if acct.trades_this_week >= rc.max_trades_per_week:
            reasons.append(f"weekly trade limit reached ({acct.trades_this_week}/{rc.max_trades_per_week})")
        weekly_floor = -rc.max_weekly_loss * acct.week_start_equity
        if acct.week_realized_pnl <= weekly_floor:
            reasons.append("weekly loss limit reached")
        if acct.peak_equity > 0 and acct.equity <= acct.peak_equity * (1 - rc.max_drawdown):
            reasons.append("drawdown protection triggered")
        if x.now_ms > p.signal_expires_ms:
            reasons.append("signal expired")

        # -- metadata and data quality --------------------------------------
        if x.info is None or not x.info.verified:
            reasons.append("exchange metadata could not be verified")
        if x.market is None:
            reasons.append("no live market data")
        else:
            if ec.reject_stale_data and x.market.data_age_seconds > ec.stale_after_seconds:
                reasons.append(f"market data is stale ({x.market.data_age_seconds:.0f}s old)")
            max_spread = (x.info.max_spread_bps if x.info and x.info.max_spread_bps is not None
                          else ec.max_spread_bps)
            if x.market.spread_bps > max_spread:
                reasons.append(f"spread too wide ({x.market.spread_bps:.1f} bps)")
        if ec.require_protective_stop and not x.protective_orders_supported:
            reasons.append("a protective exit cannot be confirmed on this execution venue")

        # -- stop / target geometry (on the proposal) ------------------------
        if p.stop is None or p.stop <= 0:
            reasons.append("stop-loss is missing")
        if p.target is None or p.target <= 0:
            reasons.append("take-profit target is missing")
        if reasons and (x.market is None or x.info is None or p.stop is None or p.target is None):
            return self._finish(d)

        long = p.direction.value == "long"
        # Size from the price we would actually pay, not the candle close.
        exec_px = x.market.ask if long else x.market.bid
        d.entry = exec_px
        if long and not p.stop < exec_px:
            reasons.append("stop-loss is on the wrong side of entry")
        if not long and not p.stop > exec_px:
            reasons.append("stop-loss is on the wrong side of entry")
        if long and not p.target > exec_px:
            reasons.append("target is on the wrong side of entry")
        if not long and not p.target < exec_px:
            reasons.append("target is on the wrong side of entry")
        drift_bps = abs(exec_px - p.entry) / p.entry * 1e4
        if drift_bps > ec.max_slippage_bps:
            reasons.append(f"price moved {drift_bps:.1f} bps from signal entry (max {ec.max_slippage_bps})")
        if any("wrong side" in r for r in reasons):
            return self._finish(d)

        # -- sizing ---------------------------------------------------------
        slip_bps = x.info.slippage_bps if x.info.slippage_bps is not None else ec.assumed_slippage_bps
        costs = CostModel(
            fee_rate=cfg.fees.taker,
            slippage=slip_bps / 1e4,
            funding_per_hour=max(abs(x.market.funding_rate_hourly), 0.0000125),
            funding_hours=rc.funding_hold_hours,
        )
        budget = acct.equity * rc.risk_per_trade
        d.risk_budget = budget
        sz = size_position(acct.equity, rc.risk_per_trade, exec_px, p.stop, cfg.trading.max_leverage,
                           x.info.sz_decimals, costs)
        d.size, d.notional, d.margin, d.leverage = sz.size, sz.notional, sz.margin, sz.leverage
        d.planned_risk, d.est_costs = sz.planned_risk, sz.est_costs

        stop_dist = abs(exec_px - p.stop)
        tgt_dist = abs(p.target - exec_px)
        d.gross_reward_risk = tgt_dist / stop_dist
        cost_pct = costs.round_trip_cost_pct * exec_px
        d.net_reward_risk = (tgt_dist - cost_pct) / (stop_dist + cost_pct)

        if sz.size <= 0:
            reasons.append("position size rounds to zero at exchange precision")
        if sz.notional < x.info.min_notional:
            reasons.append(f"notional ${sz.notional:.2f} is below exchange minimum ${x.info.min_notional:.2f} "
                           f"(risk is not increased to fit)")
        if sz.planned_risk > budget + EPS:
            reasons.append(f"planned risk ${sz.planned_risk:.4f} exceeds budget ${budget:.4f}")
        if sz.leverage > cfg.trading.max_leverage + EPS:
            reasons.append(f"leverage {sz.leverage:.2f}x exceeds {cfg.trading.max_leverage}x")
        if acct.open_margin + sz.margin > acct.equity:
            reasons.append("insufficient margin")
        if cfg.trading.max_leverage > x.info.max_leverage:
            reasons.append(f"{p.market} allows at most {x.info.max_leverage}x leverage")
        if d.gross_reward_risk + EPS < sc.minimum_reward_risk:
            reasons.append(f"reward/risk {d.gross_reward_risk:.2f} below {sc.minimum_reward_risk}")
        if d.net_reward_risk + EPS < sc.minimum_net_reward_risk:
            reasons.append(f"net reward/risk {d.net_reward_risk:.2f} below {sc.minimum_net_reward_risk}")
        if budget > 0 and sz.est_costs / budget > rc.max_cost_fraction_of_risk:
            reasons.append(f"trading costs too high ({sz.est_costs / budget:.0%} of risk budget)")
        at_risk = acct.open_risk + sz.planned_risk     # every open stop plus this one
        if acct.week_realized_pnl - at_risk < weekly_floor - EPS:
            reasons.append("a stop-out would breach the weekly loss limit")
        if acct.peak_equity > 0 and acct.equity - at_risk < acct.peak_equity * (1 - rc.max_drawdown) - EPS:
            reasons.append("a stop-out would breach the drawdown limit")

        # Liquidation must be far beyond the stop.
        liq = liquidation_price(exec_px, p.direction.value, cfg.trading.max_leverage,
                                x.info.maintenance_margin_rate)
        d.liquidation_price = liq
        liq_dist = abs(exec_px - liq)
        if liq_dist < rc.min_liquidation_buffer * stop_dist:
            reasons.append(f"liquidation ({liq:.2f}) too close to stop")
        if (long and liq >= p.stop) or (not long and liq <= p.stop):
            reasons.append("liquidation price is before the stop")
        return self._finish(d)

    @staticmethod
    def _finish(d: RiskDecision) -> RiskDecision:
        d.approved = not d.reasons
        return d
