"""Event-driven historical backtester.

Walks 1H candle closes in time order. At each close it (1) manages open
positions against that bar's range, then (2) while below the position limit, evaluates the strategy on
completed candles only and, for a candidate, asks the same RiskEngine used in
live trading. Approved entries fill at the NEXT bar's open plus spread and
slippage. Claude is not part of backtests: it has seen historical prices in
training, so including it would leak the future.
"""
from __future__ import annotations

import logging
import re
from collections import Counter
from dataclasses import dataclass, field
from typing import Any

import numpy as np

from app.backtest.performance import summarize
from app.backtest.simulator import (FillParams, SimPosition, check_bar_exit, entry_fee,
                                    entry_price_from_open, funding_payment, gross_pnl, market_exit)
from app.config import Config
from app.risk.risk_engine import RiskEngine, RiskInputs
from app.storage.models import AccountState, MarketContext, MarketInfo, TradeProposal
from app.strategy.exits import trailing_stop, trend_broken
from app.strategy.signals import PreparedMarket, anchor_target
from app.timeutil import HOUR_MS, hour_floor, week_start_ms

log = logging.getLogger(__name__)

DEFAULT_FUNDING_HOURLY = 0.0000125   # HL baseline (0.01% per 8h); used where history is missing


@dataclass
class BacktestResult:
    trades: list[dict[str, Any]]
    equity_curve: list[tuple[int, float]]
    evaluations: int
    candidates: int
    rejections: Counter
    halts: list[dict[str, Any]]
    start_ms: int
    end_ms: int
    splits: dict[str, dict[str, Any]] = field(default_factory=dict)


class Backtester:
    def __init__(self, cfg: Config, markets: dict[str, PreparedMarket], infos: dict[str, MarketInfo],
                 funding: dict[str, dict[int, float]] | None = None, half_spread_bps: float = 1.0,
                 strategies: dict[str, Any] | None = None, default_funding: dict[str, float] | None = None):
        self.cfg = cfg
        self.markets = markets
        self.infos = infos
        # Optional alternative signal generators (e.g. EMA crossover); default is the pullback strategy.
        self.strategies = strategies
        self.funding = funding or {}
        self.default_funding = default_funding or {}
        self.risk = RiskEngine(cfg)
        self.fp = FillParams(taker_fee=cfg.fees.taker, maker_fee=cfg.fees.maker,
                             slippage=cfg.execution.assumed_slippage_bps / 1e4,
                             half_spread=half_spread_bps / 1e4)

    def _rate(self, market: str, t: int) -> float:
        return self.funding.get(market, {}).get(hour_floor(t),
                                                self.default_funding.get(market, DEFAULT_FUNDING_HOURLY))

    def _daily_closing_at(self, market: str, T: int):
        pm = self.markets[market]
        i = int(np.searchsorted(pm.d1["close_t"].to_numpy(), T))
        if i < len(pm.d1) and int(pm.d1["close_t"].iloc[i]) == T:
            return pm.d1.iloc[i]
        return None

    def _update_trailing(self, pos: SimPosition, bar, T: int) -> None:
        """After bar T closed: update the best price and the stop that applies from the next bar."""
        sc = self.cfg.strategy
        long = pos.direction == "long"
        pos.extreme = max(pos.extreme, float(bar["h"])) if long else min(pos.extreme, float(bar["l"]))
        pm = self.markets[pos.market]
        j = int(np.searchsorted(pm.h4["close_t"].to_numpy(), T, side="right")) - 1
        if j < 0:
            return
        atr4 = float(pm.h4["atr"].iloc[j])
        pos.stop = trailing_stop(pos.direction, pos.entry_px, pos.initial_stop, pos.stop, pos.extreme, atr4,
                                 sc.trail_atr_mult, sc.trail_activate_r)

    def fp_for(self, market: str) -> FillParams:
        """Per-market fill costs: altcoin overrides come from MarketInfo, else the defaults."""
        info = self.infos.get(market)
        if info is None or (info.slippage_bps is None and info.half_spread_bps is None):
            return self.fp
        return FillParams(self.fp.taker_fee, self.fp.maker_fee,
                          (info.slippage_bps if info.slippage_bps is not None else self.fp.slippage * 1e4) / 1e4,
                          (info.half_spread_bps if info.half_spread_bps is not None else self.fp.half_spread * 1e4)
                          / 1e4)

    def run(self, start_ms: int | None = None, end_ms: int | None = None) -> BacktestResult:
        """Portfolio walk: up to `trading.max_open_positions` positions at once (1 by default)."""
        cfg = self.cfg
        index: dict[str, dict[int, int]] = {
            m: {int(t): i for i, t in enumerate(pm.h1["close_t"].to_numpy())} for m, pm in self.markets.items()}
        times = sorted(set().union(*[set(ix) for ix in index.values()]))
        if start_ms:
            times = [t for t in times if t >= start_ms]
        if end_ms:
            times = [t for t in times if t <= end_ms]
        order = list(self.markets)          # fixed candidate order (pre-registered: universe list order)
        max_open = cfg.trading.max_open_positions
        exit_mode = cfg.strategy.exit_mode
        max_hold_ms = (cfg.strategy.max_hold_hours if exit_mode == "fixed"
                       else cfg.strategy.trailing_max_hold_hours) * HOUR_MS

        equity = cfg.account.starting_balance
        peak = equity
        week = None
        week_start_eq = equity
        week_pnl = 0.0
        week_trades = 0
        cooldown_until: dict[str, int] = {}
        open_pos: dict[str, SimPosition] = {}
        margins: dict[str, float] = {}
        trades: list[dict[str, Any]] = []
        curve: list[tuple[int, float]] = []
        rejections: Counter = Counter()
        halts: list[dict[str, Any]] = []
        n_evaluations = n_candidates = 0
        last_bar: dict[str, Any] = {}

        def close(p: SimPosition, t: int, px: float, reason: str, fee: float) -> None:
            nonlocal equity, peak, week_pnl
            g = gross_pnl(p, px)
            fees = p.fees + fee
            net = g - fees - p.funding
            equity += net
            week_pnl += net
            trades.append({"market": p.market, "direction": p.direction, "opened_ms": p.opened_ms,
                           "closed_ms": t, "entry": p.entry_px, "exit": px, "size": p.size, "stop": p.stop,
                           "target": p.target, "planned_risk": p.planned_risk, "gross_pnl": g, "fees": fees,
                           "funding": p.funding, "net_pnl": net,
                           "r_multiple": net / p.planned_risk if p.planned_risk else None,
                           "exit_reason": reason})
            cooldown_until[p.market] = t + cfg.strategy.cooldown_hours * HOUR_MS
            del open_pos[p.market]
            margins.pop(p.market, None)
            if equity <= peak * (1 - cfg.risk.max_drawdown):
                # Live trading would halt here until an operator reviews. The backtest
                # records the event and resumes from a fresh peak so the full period is tested.
                halts.append({"ts": t, "equity": equity, "peak": peak})
                peak = equity
            peak = max(peak, equity)

        for T in times:
            wk = week_start_ms(T)
            if wk != week:
                week, week_start_eq, week_pnl, week_trades = wk, equity, 0.0, 0

            # 1) manage open positions on the bar that closed at T
            for m in list(open_pos):
                pos = open_pos[m]
                i = index[m].get(T)
                if i is None:
                    continue
                fp = self.fp_for(m)
                bar = self.markets[m].h1.iloc[i]
                last_bar[m] = bar
                pos.funding += funding_payment(pos, float(bar["c"]), self._rate(m, T - HOUR_MS))
                # Exit check uses the stop computed from bars that closed BEFORE this one.
                ex = check_bar_exit(pos, float(bar["o"]), float(bar["h"]), float(bar["l"]), fp)
                if ex is None and T - pos.opened_ms >= max_hold_ms:
                    ex = market_exit(pos, float(bar["c"]), fp, "time")
                if ex is None and exit_mode in ("reverse", "trailing_reverse") and self.strategies and \
                        self.strategies[m].opposite_cross_at(T, pos.direction):
                    ex = market_exit(pos, float(bar["c"]), fp, "reverse")
                if ex is None and exit_mode == "trailing_trend":
                    d_row = self._daily_closing_at(m, T)
                    if d_row is not None and trend_broken(pos.direction, float(d_row["c"]),
                                                          float(d_row["ema_fast"])):
                        ex = market_exit(pos, float(bar["c"]), fp, "trend")
                if ex is not None:
                    close(pos, T, ex.price, ex.reason, ex.fee)
                elif exit_mode in ("trailing", "trailing_trend", "trailing_reverse"):
                    self._update_trailing(pos, bar, T)

            # 2) look for new entries while there is room
            for m in order:
                if len(open_pos) >= max_open:
                    break
                if m in open_pos or cooldown_until.get(m, 0) > T:
                    continue
                i = index[m].get(T)
                pm = self.markets[m]
                if i is None or i + 1 >= len(pm.h1):
                    continue
                sig = (self.strategies[m] if self.strategies else pm).evaluate(i)
                n_evaluations += 1
                if not sig.is_candidate:
                    continue
                n_candidates += 1
                nxt = pm.h1.iloc[i + 1]
                if int(nxt["t"]) != T:
                    rejections["next bar missing"] += 1
                    continue
                if m not in self.infos:
                    rejections["no exchange metadata for market"] += 1
                    continue
                fp = self.fp_for(m)
                o = float(nxt["o"])
                ctx = MarketContext(bid=o * (1 - fp.half_spread), ask=o * (1 + fp.half_spread),
                                    data_age_seconds=0.0, funding_rate_hourly=self._rate(m, T))
                exec_px = ctx.ask if sig.direction.value == "long" else ctx.bid
                target = anchor_target(sig.stop, exec_px, sig.direction.value, cfg.strategy.target_r)
                proposal = TradeProposal(market=m, direction=sig.direction, entry=sig.entry, stop=sig.stop,
                                         target=target, signal_ts_ms=sig.timestamp_ms,
                                         signal_expires_ms=sig.expires_ms)
                acct = AccountState(equity=equity, peak_equity=peak, week_start_equity=week_start_eq,
                                    week_realized_pnl=week_pnl, trades_this_week=week_trades,
                                    open_positions=list(open_pos), open_margin=sum(margins.values()),
                                    open_risk=sum(p.planned_risk for p in open_pos.values()))
                dec = self.risk.evaluate(RiskInputs(proposal, acct, ctx, self.infos[m], T, True))
                if not dec.approved:
                    for r in dec.reasons:
                        rejections[_reason_key(r)] += 1
                    if not open_pos and any("drawdown" in r for r in dec.reasons):
                        # Live: trading stays blocked until an operator reviews. Backtest:
                        # record the halt and resume from a fresh peak.
                        halts.append({"ts": T, "equity": equity, "peak": peak, "kind": "drawdown_guard"})
                        peak = equity
                    continue
                px = entry_price_from_open(o, sig.direction.value, fp)
                # In trailing modes the 2R target only gates entry; no take-profit is placed.
                open_pos[m] = SimPosition(market=m, direction=sig.direction.value, size=dec.size, entry_px=px,
                                          stop=sig.stop, target=target if exit_mode == "fixed" else None,
                                          opened_ms=T, planned_risk=dec.planned_risk,
                                          fees=entry_fee(px, dec.size, fp), initial_stop=sig.stop, extreme=px)
                margins[m] = dec.margin
                week_trades += 1
            curve.append((T, equity))

        for m, pos in list(open_pos.items()):
            if m in last_bar:
                ex = market_exit(pos, float(last_bar[m]["c"]), self.fp_for(m), "end_of_data")
                close(pos, times[-1], ex.price, ex.reason, ex.fee)

        res = BacktestResult(trades=trades, equity_curve=curve, evaluations=n_evaluations, candidates=n_candidates,
                             rejections=rejections, halts=halts,
                             start_ms=times[0] if times else 0, end_ms=times[-1] if times else 0)
        res.splits = chronological_splits(res, cfg.account.starting_balance)
        return res


def _reason_key(reason: str) -> str:
    """Collapse numeric detail so rejection reasons can be counted."""
    return re.sub(r"\d+(\.\d+)?", "#", reason.split(" (")[0])


def chronological_splits(res: BacktestResult, starting: float) -> dict[str, dict[str, Any]]:
    """60% development / 20% validation / 20% out-of-sample, by time."""
    span = res.end_ms - res.start_ms
    if span <= 0:
        return {}
    b1 = res.start_ms + int(span * 0.6)
    b2 = res.start_ms + int(span * 0.8)
    seg = {
        "development (first 60%)": [t for t in res.trades if t["opened_ms"] < b1],
        "validation (next 20%)": [t for t in res.trades if b1 <= t["opened_ms"] < b2],
        "out-of-sample (last 20%)": [t for t in res.trades if t["opened_ms"] >= b2],
    }
    return {k: summarize(v, starting) | {"from_ms": lo, "to_ms": hi}
            for (k, v), (lo, hi) in zip(seg.items(), [(res.start_ms, b1), (b1, b2), (b2, res.end_ms)])}
