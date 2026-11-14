"""Strategy lab: forward paper-trading of Firefly and Relative Strength side by side.

Each "book" is an independent simulated $100 account with its own risk engine
state, circuit breaker and trade journal (DB mode "paper-<book>"). All books see
the same live Hyperliquid mainnet data. No real orders exist anywhere in here.

Books run rules-only (no Claude review): the point is to measure each strategy
exactly as it was backtested.
"""
from __future__ import annotations

import dataclasses
import logging
import threading
import time
from typing import Any

import pandas as pd

from app.backtest.simulator import FillParams
from app.config import HL_MAINNET_URL, HL_MAINNET_WS, Config
from app.data.candles import completed_only
from app.data.history import fetch_history
from app.data.market_data import HyperliquidInfo
from app.data.universe import UNIVERSE, fetch_universe
from app.data.websocket_client import PriceFeed
from app.execution.paper_exchange import PaperExchange
from app.lab_xs import BOOK as XS_BOOK, LABEL as XS_LABEL, MomentumBook
from app.monitoring.alerts import Notifier
from app.storage.database import Database, now_ms
from app.strategy.firefly import FireflyStrategy
from app.strategy.synchrony import close_matrix, order_parameter
from app.trader import Trader

log = logging.getLogger(__name__)

# book -> (label, strategy kind, exit mode). Control and placebo are the Firefly experiment's
# comparison groups (same trades without / against the synchrony filter); see docs/experiments.md EXP-003.
BOOKS: dict[str, tuple[str, str, str]] = {
    "firefly": ("Firefly (synced market only)", "firefly:F1", "trailing_reverse"),
    "control": ("Control: 4H cross, no sync filter", "firefly:F0", "trailing_reverse"),
    "placebo": ("Placebo: unsynced market only", "firefly:F2", "trailing_reverse"),
}


class Lab:
    def __init__(self, cfg: Config, db: Database):
        self.cfg = cfg
        self.db = db
        # One lock per book: the scheduler runs jobs in parallel threads, and a book's poll (stop
        # checks, position sync) must never interleave with its own step (cancel stop -> close, or
        # open -> place stop).
        self._locks: dict[int, threading.RLock] = {}
        self._locks_guard = threading.Lock()
        self.info = HyperliquidInfo(HL_MAINNET_URL)
        self.swarm_coins = self._swarm_coins()
        coins = tuple(dict.fromkeys(list(cfg.trading.allowed_assets) + self.swarm_coins))
        self.feed = PriceFeed(HL_MAINNET_WS, self.info, coins, cfg.execution.stale_after_seconds)
        self.sync: pd.DataFrame | None = None
        self._daily_ready = False
        self._market_cache: dict[tuple[str, int], Any] = {}
        fp = FillParams(cfg.fees.taker, cfg.fees.maker, cfg.execution.assumed_slippage_bps / 1e4, 0.0)

        def quote(m: str):
            q = self.feed.quote(m)
            return (q.bid, q.ask) if q else None

        self.traders: dict[str, Trader] = {}
        for book, (_, kind, exit_mode) in BOOKS.items():
            bcfg = dataclasses.replace(
                cfg, ai=dataclasses.replace(cfg.ai, enabled=False, required_for_entry=False),
                strategy=dataclasses.replace(cfg.strategy, exit_mode=exit_mode))
            ex = PaperExchange(db, fp, cfg.account.starting_balance, quote, book=book)
            t = Trader(bcfg, db, ex, self.feed, self.info, None, Notifier(db, ex.mode), self._factory(kind))
            t.load_market = self._cached_loader(t)      # share candle downloads between books
            self.traders[book] = t
        self.momentum = MomentumBook(cfg, db, self.info, self.feed, self.swarm_coins, fp)

    def lock(self, book: object) -> threading.RLock:
        with self._locks_guard:
            return self._locks.setdefault(id(book), threading.RLock())

    def _swarm_coins(self) -> list[str]:
        meta, _ = self.info.meta_and_ctxs()
        listed = {a["name"] for a in meta["universe"] if not a.get("isDelisted") and int(a["maxLeverage"]) >= 2}
        return [c for c in UNIVERSE if c in listed]

    def _factory(self, kind: str):
        variant = kind.split(":")[1]

        def make(pm):
            if self.sync is None:
                raise RuntimeError("synchrony index not available")
            return FireflyStrategy(pm, self.sync, variant)
        return make

    def _cached_loader(self, t: Trader):
        original = Trader.load_market.__get__(t)

        def load(m: str):
            key = (m, now_ms() // 3_600_000)
            if key not in self._market_cache:
                self._market_cache = {k: v for k, v in self._market_cache.items() if k[1] == key[1]}
                self._market_cache[key] = original(m)
            return self._market_cache[key]
        return load

    # -- synchrony --------------------------------------------------------
    def hl_coins(self) -> list[str]:
        """Universe coins that actually trade on Hyperliquid (have stored candles there)."""
        have = {r["market"] for r in self.db.query(
            "SELECT DISTINCT market FROM candles WHERE source='hyperliquid' AND interval='4h'")}
        return [c for c in UNIVERSE if c in have] or list(UNIVERSE)

    def update_sync(self, days: int = 6) -> None:
        rep = fetch_universe(self.db, "hyperliquid", days, self.hl_coins(), self.info)
        frame = order_parameter(close_matrix(self.db, "hyperliquid", UNIVERSE))
        self.sync = frame
        s = frame.dropna(subset=["R_s"]).tail(540)          # last 90 days of 4H readings
        self.db.set_state("sync:live", {
            "ts": now_ms(), "coins": int(frame["n"].iloc[-1]) if len(frame) else 0,
            "fetched": sum(1 for v in rep.values() if v > 0),
            "series": [[int(t), float(r.R_s), (None if pd.isna(r.baseline) else float(r.baseline)), bool(r.synced)]
                       for t, r in s.iterrows()]})
        last = s.iloc[-1] if len(s) else None
        if last is not None:
            log.info("synchrony R_s=%.3f baseline=%s synced=%s (%d coins)", last.R_s, last.baseline, last.synced,
                     int(frame["n"].iloc[-1]))

    # -- schedule ---------------------------------------------------------
    def refresh_daily_candles(self) -> None:
        now = now_ms()
        for c in self.swarm_coins:
            try:
                rows = completed_only(self.info.candles(c, "1d", now - 420 * 86_400_000, now), now)
                self.db.upsert_candles("hyperliquid", c, "1d", rows)
            except Exception as e:  # noqa: BLE001
                log.warning("daily candles %s: %s", c, e)
            time.sleep(0.5)

    def hourly(self) -> None:
        hour = (now_ms() // 3_600_000) % 24
        if hour == 0 or not self._daily_ready:
            self.refresh_daily_candles()
            self._daily_ready = True
        if self.sync is None or hour % 4 == 0:
            try:
                self.update_sync()
            except Exception:  # noqa: BLE001
                log.exception("synchrony update failed")
        for book, t in self.traders.items():
            try:
                with self.lock(t):
                    t.evaluate_cycle()
            except Exception:  # noqa: BLE001
                log.exception("%s: evaluation failed", book)

    def poll(self) -> None:
        try:
            with self.lock(self.momentum):
                self.momentum.poll()
        except Exception:  # noqa: BLE001
            log.exception("momentum: poll failed")
        for book, t in self.traders.items():
            try:
                with self.lock(t):
                    t.poll()
            except Exception:  # noqa: BLE001
                log.exception("%s: poll failed", book)

    def funding(self) -> None:
        for b in list(self.traders.values()) + [self.momentum]:
            try:
                with self.lock(b):
                    b.hourly_funding()
            except Exception:  # noqa: BLE001
                log.exception("funding accrual failed")

    def weekly_rebalance(self) -> None:
        try:
            self.refresh_daily_candles()
            with self.lock(self.momentum):
                self.momentum.rebalance()
        except Exception:  # noqa: BLE001
            log.exception("momentum rebalance failed")

    def daily_research(self) -> None:
        from app.research import run_all
        from app.xs_research import run_all_xs
        try:
            fetch_history(self.db, self.info, "hyperliquid", self.cfg.trading.allowed_assets, 12)
            fetch_history(self.db, self.info, "binance", self.cfg.trading.allowed_assets, 12)
            fetch_universe(self.db, "binance", 12)
            run_all(self.db, self.cfg)
            run_all_xs(self.db)
        except Exception:  # noqa: BLE001
            log.exception("daily research failed")

    def run(self) -> None:
        from apscheduler.schedulers.blocking import BlockingScheduler
        self.feed.start()
        time.sleep(3)
        self.update_sync(days=200)
        for t in self.traders.values():
            t.startup()
        self.refresh_daily_candles()
        self._daily_ready = True
        self.momentum.startup()
        self.db.set_state("lab:books", {XS_BOOK: XS_LABEL} | {b: v[0] for b, v in BOOKS.items()})
        s = BlockingScheduler(timezone="UTC")
        s.add_job(self.hourly, "cron", minute=self.cfg.paper.evaluation_minute, second=5, max_instances=1,
                  coalesce=True, id="hourly")
        s.add_job(self.poll, "interval", seconds=self.cfg.paper.poll_seconds, max_instances=1, coalesce=True,
                  id="poll")
        s.add_job(self.funding, "cron", minute=0, second=30, id="funding")
        s.add_job(self.daily_research, "cron", hour=0, minute=20, id="research", max_instances=1)
        s.add_job(self.weekly_rebalance, "cron", day_of_week="mon", hour=0, minute=10, id="momentum",
                  max_instances=1)
        log.info("lab running %d books + %s: %s", len(self.traders), XS_BOOK, ", ".join(self.traders))
        try:
            s.start()
        except (KeyboardInterrupt, SystemExit):
            pass
        finally:
            self.feed.stop()
