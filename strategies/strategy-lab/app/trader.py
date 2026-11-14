"""Live loop for paper (and testnet) trading.

Hourly, one minute after each 1H close:
    completed candles -> strategy -> [candidate] -> Claude review -> risk engine
    -> order manager (only if approved, reconciled, and not halted)
Every few seconds:
    quotes -> paper fills -> position sync -> circuit-breaker checks -> health -> alerts
"""
from __future__ import annotations

import json
import logging
import time
from typing import Any, Callable

from app.ai.trade_analysis import Analyst, ai_gate
from app.config import Config
from app.data.candles import CandleError, completed_only, require_fresh_history, to_frame
from app.data.market_data import HyperliquidInfo, MarketDataError
from app.data.market_metadata import MetadataError, parse_markets
from app.data.websocket_client import PriceFeed
from app.execution.adapter import ExchangeAdapter
from app.execution.order_manager import OrderError, OrderManager
from app.execution.paper_exchange import PaperExchange
from app.execution.position_manager import PositionManager
from app.execution.reconciliation import reconcile
from app.monitoring.alerts import Notifier
from app.monitoring.health import write_health
from app.monitoring.reports import daily_report, weekly_report
from app.risk.circuit_breaker import CircuitBreaker
from app.risk.risk_engine import RiskEngine, RiskInputs
from app.storage.database import Database, now_ms
from app.storage.models import MarketContext, MarketInfo, TradeProposal
from app.strategy.signals import PreparedMarket, anchor_target

log = logging.getLogger(__name__)
DAY_MS = 86_400_000


class Trader:
    def __init__(self, cfg: Config, db: Database, adapter: ExchangeAdapter, feed: PriceFeed,
                 info: HyperliquidInfo, analyst: Analyst | None, notifier: Notifier,
                 strategy_factory: Callable[[PreparedMarket], Any] | None = None):
        self.cfg = cfg
        self.db = db
        self.ex = adapter
        self.feed = feed
        self.info = info
        self.analyst = analyst
        self.notify = notifier
        self.mode = adapter.mode
        self.breaker = CircuitBreaker(db, self.mode, max_api_errors=cfg.risk.max_api_errors,
                                      max_reconnects_per_hour=cfg.risk.max_ws_reconnects_per_hour,
                                      on_trip=lambda r: notifier("critical", "halt", f"EMERGENCY HALT: {r}"))
        self.infos: dict[str, MarketInfo] = {}
        self.om = OrderManager(adapter, db, self.breaker, self.infos, notifier, cfg.execution.max_slippage_bps,
                               cfg.trading.max_open_positions)
        self.exit_mode = cfg.strategy.exit_mode
        hold = cfg.strategy.max_hold_hours if self.exit_mode == "fixed" else cfg.strategy.trailing_max_hold_hours
        self.pm = PositionManager(adapter, db, self.om, self.breaker, notifier, hold, cfg.trading.max_leverage)
        # Default strategy is the pullback engine itself; alternatives wrap a PreparedMarket.
        self.strategy_factory = strategy_factory
        self._prepared: dict[str, PreparedMarket] = {}
        self.risk = RiskEngine(cfg)
        self.entries_enabled = False
        self._last_equity_ts = 0
        self._seen_reconnects = 0

    # -- startup ----------------------------------------------------------
    def refresh_metadata(self) -> bool:
        try:
            meta, ctxs = self.info.meta_and_ctxs()
            fresh = parse_markets(meta, ctxs, self.cfg.trading.allowed_assets)
            self.infos.clear()
            self.infos.update(fresh)
            self.breaker.record_api_success()
            return True
        except (MarketDataError, MetadataError) as e:
            self.infos.clear()   # unverified metadata -> risk engine rejects
            self.breaker.record_api_error(str(e))
            log.error("metadata refresh failed: %s", e)
            return False

    def startup(self) -> None:
        self.refresh_metadata()
        rep = reconcile(self.ex, self.db, self.om, self.pm, self.breaker)
        self.entries_enabled = rep.ok
        for a in rep.actions:
            log.info("reconcile: %s", a)
        if rep.ok:
            self.notify("info", "startup", f"started; reconciliation ok ({len(rep.actions)} action(s))")
        else:
            self.notify("critical", "reconcile_failed", "reconciliation failed: " + "; ".join(rep.issues))
        if self.breaker.is_halted():
            self.notify("warning", "halt_active", f"halt is active: {self.breaker.reason()}")
        self._record_equity(force=True)

    # -- hourly evaluation ------------------------------------------------
    def load_market(self, m: str) -> PreparedMarket:
        now = now_ms()
        sc = self.cfg.strategy
        spans = {"1d": 420 * DAY_MS, "4h": 60 * DAY_MS, "1h": 10 * DAY_MS}
        mins = {"1d": sc.daily_ema_slow + 10, "4h": sc.setup_ema_slow * 2 + sc.pullback_lookback_bars + 10,
                "1h": sc.volume_period + sc.swing_lookback + 10}
        frames = {}
        for iv, span in spans.items():
            rows = completed_only(self.info.candles(m, iv, now - span, now), now)
            require_fresh_history(rows, iv, now, mins[iv])
            frames[iv] = to_frame(rows)
        return PreparedMarket(m, frames["1d"], frames["4h"], frames["1h"], sc)

    def evaluate_cycle(self) -> list[dict[str, Any]]:
        out: list[dict[str, Any]] = []
        self.refresh_metadata()
        strats: dict[str, Any] = {}
        for m in self.markets_to_evaluate():
            try:
                pm = self.load_market(m)
                self.breaker.record_api_success()
            except (CandleError, MarketDataError) as e:
                self.db.log_event("data_invalid", {"market": m, "error": str(e)}, self.mode)
                if isinstance(e, MarketDataError):
                    self.breaker.record_api_error(str(e))
                log.warning("%s: no evaluation (%s)", m, e)
                continue
            self._prepared[m] = pm
            strats[m] = self.strategy_factory(pm) if self.strategy_factory else pm
        self.manage_exits(strats)
        for m, strat in strats.items():
            if self._in_cooldown(m):
                continue
            sig = strat.evaluate()
            sig_id = self.db.log_signal(self.mode, sig.to_dict(), sig.is_candidate)
            row = {"market": m, "trend": sig.trend, "candidate": sig.is_candidate, "checks": sig.checks}
            out.append(row)
            log.info("%s %s trend=%s pullback=%s confirmation=%s candidate=%s%s", self.mode, m, sig.trend,
                     sig.pullback, sig.confirmation, sig.is_candidate, f" ({sig.notes[0]})" if sig.notes else "")
            if not sig.is_candidate:
                continue
            self.notify("info", "candidate", f"{m} {sig.direction.value.upper()} candidate: entry {sig.entry:.2f}, "
                                             f"stop {sig.stop:.2f}")
            acct = self.pm.account_state(self.cfg.account.starting_balance)
            gate = ai_gate(self.analyst, sig, acct, self.cfg, self.mode)
            self.db.log_ai_decision(self.mode, sig_id, m, gate.decision, {
                "analysis": gate.analysis.model_dump() if gate.analysis else None,
                "meta": gate.meta, "error": gate.error})
            row["ai"] = gate.decision
            if not gate.proceed:
                why = gate.error or (gate.analysis.reasoning[:300] if gate.analysis else "")
                self.notify("info", "ai_no_trade", f"{m}: Claude {gate.decision}. {why}")
                continue
            dec = self._risk_check(m, sig, acct)
            if not self.entries_enabled:
                dec.reasons.append("startup reconciliation has not succeeded")
                dec.approved = False
            self.db.log_risk_decision(self.mode, sig_id, dec.to_dict())
            row["risk"] = {"approved": dec.approved, "reasons": dec.reasons}
            if not dec.approved:
                self.notify("info", "risk_rejected", f"{m} rejected by risk engine: " + "; ".join(dec.reasons))
                continue
            self.notify("info", "risk_approved",
                        f"{m} approved: size {dec.size} (${dec.notional:.2f}), risk ${dec.planned_risk:.3f}, "
                        f"net R:R {dec.net_reward_risk:.2f}")
            try:
                tid = self.om.open_position(dec, sig_id, sig.timestamp_ms, place_tp=self.exit_mode == "fixed")
                row["trade_id"] = tid
            except OrderError as e:
                self.notify("warning", "order_refused", f"{m}: {e}")
            if len(self.ex.get_positions()) >= self.cfg.trading.max_open_positions:
                break
        return out

    def markets_to_evaluate(self) -> list[str]:
        return list(self.cfg.trading.allowed_assets)

    def _in_cooldown(self, m: str) -> bool:
        if any(t["market"] == m for t in self.pm.open_trades()):
            return False
        last = self.db.query("SELECT MAX(closed_ms) c FROM trades WHERE mode=? AND market=? AND status='closed'",
                             (self.mode, m))[0]["c"]
        return bool(last) and now_ms() - last < self.cfg.strategy.cooldown_hours * 3_600_000

    def manage_exits(self, strats: dict[str, Any]) -> None:
        """Run once per hour after the candle close: opposite-crossover exits and trailing stops."""
        from app.execution.adapter import make_cloid
        from app.strategy.exits import trailing_stop
        sc = self.cfg.strategy
        for t in self.pm.open_trades():
            m, long = t["market"], t["direction"] == "long"
            pm, strat = self._prepared.get(m), strats.get(m)
            if pm is None:
                continue
            T = int(pm.h1["close_t"].iloc[-1])
            if self.exit_mode in ("reverse", "trailing_reverse") and hasattr(strat, "opposite_cross_at") \
                    and strat.opposite_cross_at(T, t["direction"]):
                cloid = make_cloid("reverse", self.mode, t["id"])
                self.om.cancel_trade_orders(t["id"], m)
                self.db.upsert_order({"cloid": cloid, "mode": self.mode, "trade_id": t["id"], "market": m,
                                      "side": "close", "kind": "reverse", "size": t["size"],
                                      "reduce_only": True, "status": "submitting"})
                ack = self.ex.close_position(m, cloid)
                self.db.log_event("reverse_exit", {"trade_id": t["id"], "ack": ack.status}, self.mode)
                self.pm.sync()
                continue
            if self.exit_mode in ("trailing", "trailing_trend", "trailing_reverse"):
                since = pm.h1[pm.h1["t"] >= t["opened_ms"] - 3_600_000]
                if since.empty:
                    continue
                extreme = float(since["h"].max()) if long else float(since["l"].min())
                atr4 = float(pm.h4["atr"].iloc[-1])
                init = (t.get("payload") and json.loads(t["payload"]).get("initial_stop")) or t["stop"]
                new = trailing_stop(t["direction"], t["entry"], init, t["stop"], extreme, atr4,
                                    sc.trail_atr_mult, sc.trail_activate_r)
                if (long and new > t["stop"] * 1.0002) or (not long and new < t["stop"] * 0.9998):
                    self.om.move_stop(t["id"], m, long, t["size"], new)

    def _risk_check(self, m: str, sig, acct):
        q = self.feed.raw_quote(m)
        ctx = None
        if q is not None:
            info = self.infos.get(m)
            ctx = MarketContext(bid=q.bid, ask=q.ask, data_age_seconds=q.age,
                                funding_rate_hourly=(info.funding_rate_hourly or 0.0) if info else 0.0)
        direction = sig.direction.value
        exec_px = (ctx.ask if direction == "long" else ctx.bid) if ctx else sig.entry
        target = anchor_target(sig.stop, exec_px, direction, self.cfg.strategy.target_r)
        proposal = TradeProposal(market=m, direction=sig.direction, entry=sig.entry, stop=sig.stop, target=target,
                                 signal_ts_ms=sig.timestamp_ms, signal_expires_ms=sig.expires_ms)
        return self.risk.evaluate(RiskInputs(proposal, acct, ctx, self.infos.get(m), now_ms(),
                                             self.ex.supports_protective_orders))

    # -- fast loop --------------------------------------------------------
    def poll(self) -> None:
        if isinstance(self.ex, PaperExchange):
            for m in self.cfg.trading.allowed_assets:
                q = self.feed.quote(m)
                if q:
                    self.ex.on_quote(m, q.bid, q.ask)
        try:
            self.pm.sync()
            self.breaker.record_api_success()
        except Exception as e:  # noqa: BLE001
            self.breaker.record_api_error(str(e))
            log.exception("position sync failed")
        if self.feed.reconnects > self._seen_reconnects:
            for _ in range(self.feed.reconnects - self._seen_reconnects):
                self.breaker.record_reconnect()
            self._seen_reconnects = self.feed.reconnects
        acct = self.pm.account_state(self.cfg.account.starting_balance)
        self.breaker.check_account(acct.equity, acct.peak_equity, acct.week_start_equity, acct.week_realized_pnl,
                                   self.cfg.risk.max_drawdown, self.cfg.risk.max_weekly_loss)
        self._record_equity()
        write_health(self.db, self.mode, feed=self.feed.health(), halted=self.breaker.is_halted(),
                     halt_reason=self.breaker.reason(), entries_enabled=self.entries_enabled,
                     metadata_verified=bool(self.infos), equity=acct.equity,
                     open_positions=acct.open_positions, live_execution="DISABLED")
        self.notify.flush()

    def _record_equity(self, force: bool = False) -> None:
        if force or now_ms() - self._last_equity_ts > 300_000:
            self.db.record_equity(self.mode, self.ex.get_equity())
            self._last_equity_ts = now_ms()

    def hourly_funding(self) -> None:
        if not isinstance(self.ex, PaperExchange):
            return   # real venues settle funding themselves
        for t in self.pm.open_trades():
            info = self.infos.get(t["market"])
            q = self.feed.raw_quote(t["market"])
            if info and q:
                cost = self.ex.accrue_funding(t["market"], (q.bid + q.ask) / 2, info.funding_rate_hourly or 0.0)
                self.db.add_trade_funding(t["id"], cost)

    # -- scheduler --------------------------------------------------------
    def run(self) -> None:
        from apscheduler.schedulers.blocking import BlockingScheduler
        self.feed.start()
        time.sleep(2)
        self.startup()
        s = BlockingScheduler(timezone="UTC")
        s.add_job(self.evaluate_cycle, "cron", minute=self.cfg.paper.evaluation_minute, second=5,
                  max_instances=1, coalesce=True, id="evaluate")
        s.add_job(self.poll, "interval", seconds=self.cfg.paper.poll_seconds, max_instances=1, coalesce=True,
                  id="poll")
        s.add_job(self.hourly_funding, "cron", minute=0, second=30, id="funding")
        start = self.cfg.account.starting_balance
        s.add_job(lambda: self.notify("info", "daily_report", daily_report(self.db, self.mode, start)),
                  "cron", hour=0, minute=5, id="daily")
        s.add_job(lambda: self.notify("info", "weekly_report", weekly_report(self.db, self.mode, start)),
                  "cron", day_of_week="mon", hour=0, minute=10, id="weekly")
        log.info("%s trader running; evaluation at minute %02d of every hour", self.mode,
                 self.cfg.paper.evaluation_minute)
        try:
            s.start()
        except (KeyboardInterrupt, SystemExit):
            log.info("stopping")
        finally:
            self.feed.stop()
