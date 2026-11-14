"""Paper book for EXP-005 M1 "Relative Strength": weekly cross-sectional momentum.

Every Monday 00:10 UTC: rank Hyperliquid-listed universe coins by 28-day return
(daily closes through Sunday), hold long the top 3 and short the bottom 3 at equal
notional (gross 1.0 x equity), each with a reduce-only stop at 3 x daily ATR14.
Positions that stay in the same leg are kept untouched.

Sizing comes from the strategy itself (equal weight), not from the per-trade risk
engine, whose 0.5%-risk rule makes these positions impossible on $100 (see
docs/experiments.md EXP-005). Every order still goes through the order manager:
write-ahead IDs, fill verification, verified reduce-only stops, emergency close.
Paper only.
"""
from __future__ import annotations

import logging
from datetime import datetime, timezone

import numpy as np
import pandas as pd

from app.backtest.simulator import FillParams
from app.data.market_metadata import parse_markets, round_size_down
from app.execution.adapter import make_cloid
from app.execution.order_manager import OrderError, OrderManager
from app.execution.paper_exchange import PaperExchange
from app.execution.position_manager import PositionManager
from app.execution.reconciliation import reconcile
from app.monitoring.alerts import Notifier
from app.risk.circuit_breaker import CircuitBreaker
from app.storage.database import Database, now_ms
from app.storage.models import RiskDecision

log = logging.getLogger(__name__)

BOOK = "momentum"
LABEL = "Relative Strength (momentum L/S)"
LOOKBACK, N_LONG, N_SHORT, STOP_ATR, GROSS, MIN_NOTIONAL = 28, 3, 3, 3.0, 1.0, 10.0


class MomentumBook:
    def __init__(self, cfg, db: Database, info, feed, coins: list[str], fp: FillParams):
        self.cfg, self.db, self.info, self.feed, self.coins = cfg, db, info, feed, coins

        def quote(m):
            q = feed.quote(m)
            return (q.bid, q.ask) if q else None
        self.ex = PaperExchange(db, fp, cfg.account.starting_balance, quote, book=BOOK)
        self.mode = self.ex.mode
        self.notify = Notifier(db, self.mode)
        self.breaker = CircuitBreaker(db, self.mode, max_api_errors=cfg.risk.max_api_errors)
        self.infos: dict = {}
        self.om = OrderManager(self.ex, db, self.breaker, self.infos, self.notify, max_slippage_bps=30,
                               max_open_positions=N_LONG + N_SHORT)
        self.pm = PositionManager(self.ex, db, self.om, self.breaker, self.notify, max_hold_hours=24 * 365,
                                  leverage=cfg.trading.max_leverage)
        self._last_equity = 0

    def refresh_metadata(self) -> None:
        meta, ctxs = self.info.meta_and_ctxs()
        self.infos.clear()
        self.infos.update(parse_markets(meta, ctxs, tuple(self.coins)))

    def startup(self) -> None:
        self.refresh_metadata()
        rep = reconcile(self.ex, self.db, self.om, self.pm, self.breaker)
        self.notify("info" if rep.ok else "critical", "startup",
                    f"momentum book started; reconciliation {'ok' if rep.ok else 'FAILED: ' + '; '.join(rep.issues)}")
        self.db.record_equity(self.mode, self.ex.get_equity())

    # -- weekly rebalance ---------------------------------------------------
    def ranking(self) -> tuple[list[str], list[str], dict[str, float]]:
        now = now_ms()
        closes, atr = {}, {}
        for c in self.coins:
            rows = [r for r in self.db.load_candles("hyperliquid", c, "1d") if r["close_t"] <= now]
            if len(rows) < LOOKBACK + 20:
                continue
            df = pd.DataFrame(rows)
            if now - int(df["close_t"].iloc[-1]) > 2 * 86_400_000:
                continue                                    # stale daily data: skip coin
            prev_c = df["c"].shift(1)
            tr = pd.concat([df["h"] - df["l"], (df["h"] - prev_c).abs(), (df["l"] - prev_c).abs()], axis=1).max(axis=1)
            closes[c] = df["c"].to_numpy()
            atr[c] = float(tr.ewm(alpha=1 / 14, adjust=False).mean().iloc[-1])
        ret = {c: v[-1] / v[-1 - LOOKBACK] - 1 for c, v in closes.items()}
        ranked = sorted(ret, key=ret.get, reverse=True)
        return ranked[:N_LONG], ranked[::-1][:N_SHORT], atr

    def rebalance(self) -> dict:
        if self.breaker.is_halted():
            self.notify("warning", "rebalance_skipped", f"momentum rebalance skipped: halted ({self.breaker.reason()})")
            return {"skipped": "halted"}
        self.refresh_metadata()
        longs, shorts, atr = self.ranking()
        if len(atr) < 15:
            self.notify("warning", "rebalance_skipped", f"momentum: only {len(atr)} coins with fresh data")
            return {"skipped": "data"}
        target = {c: "long" for c in longs} | {c: "short" for c in shorts}
        week = datetime.now(timezone.utc).strftime("%G-W%V")
        closed, opened = [], []
        for t in self.pm.open_trades():
            if target.get(t["market"]) == t["direction"]:
                continue
            cloid = make_cloid("rebalance", self.mode, t["id"], week)
            self.om.cancel_trade_orders(t["id"], t["market"])
            self.db.upsert_order({"cloid": cloid, "mode": self.mode, "trade_id": t["id"], "market": t["market"],
                                  "side": "close", "kind": "rebalance", "size": t["size"], "reduce_only": True,
                                  "status": "submitting"})
            self.ex.close_position(t["market"], cloid)
            closed.append(t["market"])
        self.pm.sync()
        held = {t["market"] for t in self.pm.open_trades()}
        equity = self.ex.get_equity()
        notional = GROSS * equity / (N_LONG + N_SHORT)
        for c, side in target.items():
            if c in held or c not in self.infos:
                continue
            q = self.feed.quote(c)
            if q is None:
                self.notify("warning", "no_quote", f"momentum: no fresh quote for {c}, skipped")
                continue
            px = q.ask if side == "long" else q.bid
            dist = STOP_ATR * atr[c]
            size = round_size_down(notional / px, self.infos[c].sz_decimals)
            if size * px < MIN_NOTIONAL:
                continue
            stop = px - dist if side == "long" else px + dist
            loss_pct = dist / px + 2 * self.cfg.fees.taker + 0.002
            d = RiskDecision(approved=True, reasons=[], market=c, direction=side, entry=px, stop=stop, target=None,
                             size=size, notional=size * px, margin=size * px / self.cfg.trading.max_leverage,
                             leverage=size * px / equity, planned_risk=size * px * loss_pct)
            self.db.log_risk_decision(self.mode, None, d.to_dict() | {"strategy": "EXP-005 M1"})
            try:
                if self.om.open_position(d, None, now_ms(), place_tp=False):
                    opened.append(f"{c} {side}")
            except OrderError as e:
                self.notify("warning", "order_refused", f"momentum {c}: {e}")
        summary = {"week": week, "longs": longs, "shorts": shorts, "closed": closed, "opened": opened,
                   "equity": round(equity, 2)}
        self.db.log_event("rebalance", summary, self.mode)
        self.db.set_state("momentum:last_rebalance", summary | {"ts": now_ms()})
        self.notify("info", "rebalance", f"momentum rebalance {week}: long {longs}, short {shorts}; "
                                         f"opened {opened or '-'}, closed {closed or '-'}")
        return summary

    # -- fast loop ----------------------------------------------------------
    def poll(self) -> None:
        for m in {t["market"] for t in self.pm.open_trades()}:
            q = self.feed.quote(m)
            if q:
                self.ex.on_quote(m, q.bid, q.ask)
        try:
            self.pm.sync()
            self.breaker.record_api_success()
        except Exception as e:  # noqa: BLE001
            self.breaker.record_api_error(str(e))
            log.exception("momentum sync failed")
        if now_ms() - self._last_equity > 300_000:
            self.db.record_equity(self.mode, self.ex.get_equity())
            self._last_equity = now_ms()

    def hourly_funding(self) -> None:
        for t in self.pm.open_trades():
            info = self.infos.get(t["market"])
            q = self.feed.raw_quote(t["market"])
            if info and q:
                cost = self.ex.accrue_funding(t["market"], (q.bid + q.ask) / 2, info.funding_rate_hourly or 0.0)
                self.db.add_trade_funding(t["id"], cost)
