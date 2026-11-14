"""Strategy lab: forward paper-trading of several strategies side by side.

Each "book" is an independent simulated $100 account with its own risk engine
state, circuit breaker and trade journal (DB mode "paper-<book>"). All books see
the same live Hyperliquid mainnet data. No real orders exist anywhere in here.

Books run rules-only (no Claude review): the point is to measure each strategy
exactly as it was backtested.
"""
from __future__ import annotations

import dataclasses
from datetime import datetime, timezone
import logging
import threading
import time
from typing import Any

import pandas as pd

from app.backtest.simulator import FillParams
from app.config import HL_MAINNET_URL, HL_MAINNET_WS, Config
from app.data.history import fetch_history
from app.data.market_data import HyperliquidInfo
from app.data.universe import UNIVERSE, fetch_universe
from app.data.websocket_client import PriceFeed
from app.execution.paper_exchange import PaperExchange
from app.monitoring.alerts import Notifier
from app.storage.database import Database, now_ms
from app.strategy.firefly import FireflyStrategy
from app.strategy.synchrony import close_matrix, order_parameter
from app.data.candles import completed_only, require_fresh_history, to_frame
from app.research import ALT_HALF_SPREAD_BPS, ALT_MAX_SPREAD_BPS, ALT_SLIPPAGE_BPS
from app.strategy.signals import PreparedMarket
from app.trader import Trader

log = logging.getLogger(__name__)

# book -> (label, strategy kind, exit mode)
BOOKS: dict[str, tuple[str, str, str]] = {
    # "swarm": ("Firefly Swarm (all synced coins)", "swarm:F1", "trailing_reverse"),
    #   EXP-004 failed its backtest criterion, so it is not paper-traded. Uncomment to run it anyway.
    "firefly": ("Firefly (synced market only)", "firefly:F1", "trailing_reverse"),
    "control": ("Control: 4H cross, no sync filter", "firefly:F0", "trailing_reverse"),
    "placebo": ("Placebo: unsynced market only", "firefly:F2", "trailing_reverse"),
    "pullback-trail": ("Pullback + trailing stop", "pullback", "trailing"),
    "pullback-fixed": ("Pullback, fixed 2R (original)", "pullback", "fixed"),
}


class Lab:
    def __init__(self, cfg: Config, db: Database):
        self.cfg = cfg
        self.db = db
        # One lock per book: the scheduler runs jobs in parallel threads, and a book's poll (stop
        # checks, position sync) must never interleave with its own step (cancel stop -> close, or
        # open -> place stop). That interleaving emergency-closed and halted two books on 2026-11-12.
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
            if kind.startswith("swarm"):
                # EXP-004 limits (owner-approved): all synced coins, 3 positions, 8 entries a week.
                bcfg = dataclasses.replace(
                    bcfg, trading=dataclasses.replace(bcfg.trading, allowed_assets=tuple(self.swarm_coins),
                                                      max_open_positions=3),
                    risk=dataclasses.replace(bcfg.risk, max_trades_per_week=8))
                fpb = dataclasses.replace(fp, slippage=ALT_SLIPPAGE_BPS / 1e4)   # conservative fills for alts
                ex = PaperExchange(db, fpb, cfg.account.starting_balance, quote, book=book)
                t = SwarmTrader(bcfg, db, ex, self.feed, self.info, None, Notifier(db, ex.mode),
                                self._factory("firefly:" + kind.split(":")[1]))
            else:
                ex = PaperExchange(db, fp, cfg.account.starting_balance, quote, book=book)
                t = Trader(bcfg, db, ex, self.feed, self.info, None, Notifier(db, ex.mode), self._factory(kind))
                t.load_market = self._cached_loader(t)      # share candle downloads between books
            self.traders[book] = t
        from app.lab_xs import MomentumBook
        self.momentum = MomentumBook(cfg, db, self.info, self.feed, self.swarm_coins, fp)
        from app.copy_book import CopyBook
        self.copy = CopyBook(cfg, db, self.info, dataclasses.replace(fp, slippage=0.001))
        from app.consensus import Collector, ConsensusBook
        self.collector = Collector(db)
        alt_fp = dataclasses.replace(fp, slippage=0.001)
        self.consensus = [ConsensusBook(cfg, db, self.info, alt_fp, follow=True),
                          ConsensusBook(cfg, db, self.info, alt_fp, follow=False),
                          ConsensusBook(cfg, db, self.info, alt_fp, follow=True, take_profit=True)]
        # EXP-009 (meanrev) and EXP-010 (hurst) failed their backtests and were dropped 2026-11-11.
        from app.lab_mm import MarketMaker
        from app.lab_books import FundingBook
        self.fundingc = FundingBook(cfg, db, self.info, alt_fp, self.swarm_coins)
        from app.lab_books import FastTrendBook
        self.fasttrend = FastTrendBook(cfg, db, self.info, fp, ["BTC", "ETH"])     # EXP-024
        from app.elite import (EnsembleBook, EnsembleTPBook, ExpertsBook, HRPBook, HybridBook, RandomWeightedBook,
                               WeightedBook, WeightedFundingBook, WeightedTPBook, WideEnsembleBook)
        self.ensemble = EnsembleBook(cfg, db, self.info, alt_fp, self.swarm_coins)
        self.weighted = WeightedBook(cfg, db, self.info, alt_fp, self.swarm_coins)
        self.elite = {b.book: b for b in (
            self.ensemble, self.weighted,
            HRPBook(cfg, db, self.info, alt_fp, self.swarm_coins),
            ExpertsBook(cfg, db, self.info, alt_fp, self.swarm_coins),
            WeightedFundingBook(cfg, db, self.info, alt_fp, self.swarm_coins),
            HybridBook(cfg, db, self.info, alt_fp, self.swarm_coins),
            RandomWeightedBook(cfg, db, self.info, alt_fp, self.swarm_coins),
            WideEnsembleBook(cfg, db, self.info, alt_fp, self.swarm_coins),
            WeightedTPBook(cfg, db, self.info, alt_fp, self.swarm_coins),
            EnsembleTPBook(cfg, db, self.info, alt_fp, self.swarm_coins))}
        self.mm = MarketMaker(db, self.feed, fp.maker_fee, fp.taker_fee, cfg.account.starting_balance)

    def lock(self, book: object) -> threading.RLock:
        with self._locks_guard:
            return self._locks.setdefault(id(book), threading.RLock())

    def _swarm_coins(self) -> list[str]:
        meta, _ = self.info.meta_and_ctxs()
        listed = {a["name"] for a in meta["universe"] if not a.get("isDelisted") and int(a["maxLeverage"]) >= 2}
        return [c for c in UNIVERSE if c in listed]

    def _factory(self, kind: str):
        if kind == "pullback":
            return None
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
        books = (list(self.traders.values()) + [self.momentum, self.copy] + self.consensus
                 + [self.fundingc, self.fasttrend] + list(self.elite.values()))
        for b in books:
            try:
                with self.lock(b):
                    b.hourly_funding()
            except Exception:  # noqa: BLE001
                log.exception("funding accrual failed")
        try:
            meta, ctxs = self.info.meta_and_ctxs()
            rates = {a["name"]: float(c.get("funding") or 0) for a, c in zip(meta["universe"], ctxs)}
            mids = {c: (q.bid + q.ask) / 2 for c in ("BTC", "ETH") if (q := self.feed.quote(c))}
            self.mm.hourly_funding(rates, mids)
        except Exception:  # noqa: BLE001
            log.exception("mm funding failed")


    def consensus_step(self) -> None:
        try:
            signal = self.collector.snapshot()
        except Exception:  # noqa: BLE001
            log.exception("consensus snapshot failed")
            return
        for b in self.consensus:
            try:
                with self.lock(b):
                    b.step(signal)
            except Exception:  # noqa: BLE001
                log.exception("%s step failed", b.book)

    def consensus_poll(self) -> None:
        for b in self.consensus:
            try:
                with self.lock(b):
                    b.poll()
            except Exception:  # noqa: BLE001
                log.exception("%s poll failed", b.book)

    def funding_contrarian(self) -> None:
        try:
            with self.lock(self.fundingc):
                self.fundingc.step()             # acts only when 3 days have passed
        except Exception:  # noqa: BLE001
            log.exception("funding contrarian step failed")

    def funding_contrarian_poll(self) -> None:
        try:
            with self.lock(self.fundingc):
                self.fundingc.poll()
        except Exception:  # noqa: BLE001
            log.exception("funding contrarian poll failed")

    def fasttrend_step(self) -> None:
        try:
            with self.lock(self.fasttrend):
                self.fasttrend.step()
        except Exception:  # noqa: BLE001
            log.exception("fasttrend step failed")

    def fasttrend_poll(self) -> None:
        try:
            with self.lock(self.fasttrend):
                self.fasttrend.poll()
        except Exception:  # noqa: BLE001
            log.exception("fasttrend poll failed")

    def elite_refresh(self) -> None:
        for b in self.elite.values():
            try:
                with self.lock(b):
                    b.refresh_traders()         # only rebuilds after a new leaderboard scan
            except Exception:  # noqa: BLE001
                log.exception("%s trader refresh failed", b.book)

    def elite_step(self, which: str) -> None:
        b = self.elite[which]
        try:
            with self.lock(b):
                b.step()
        except Exception:  # noqa: BLE001
            log.exception("%s step failed", which)

    def elite_poll(self) -> None:
        for b in self.elite.values():
            try:
                with self.lock(b):
                    b.poll()
            except Exception:  # noqa: BLE001
                log.exception("%s poll failed", b.book)

    def copy_step(self) -> None:
        try:
            with self.lock(self.copy):
                self.copy.step()
        except Exception:  # noqa: BLE001
            log.exception("copy step failed")

    def rescan_wallets(self) -> None:
        """Fresh leaderboard scan (re-checks every wallet), then let the copy book refill its leaders."""
        from app.wallets import scan
        try:
            res = scan()
            self.db.set_state("wallets:scan", res)
            log.info("wallet scan: %d copyable of %d analysed", len(res["copyable"]), res["analysed"])
            with self.lock(self.copy):
                self.copy.refresh_leaders(force=True)
        except Exception:  # noqa: BLE001
            log.exception("wallet scan failed")

    def weekly_rebalance(self) -> None:
        try:
            self.refresh_daily_candles()
            with self.lock(self.momentum):
                self.momentum.rebalance()
        except Exception:  # noqa: BLE001
            log.exception("momentum rebalance failed")

    def daily_research(self) -> None:
        from app.research import run_all
        try:
            fetch_history(self.db, self.info, "hyperliquid", self.cfg.trading.allowed_assets, 12)
            fetch_history(self.db, self.info, "binance", self.cfg.trading.allowed_assets, 12)
            fetch_universe(self.db, "binance", 12)
            run_all(self.db, self.cfg)
            from app.xs_research import run_all_xs
            run_all_xs(self.db)
            from app.vaults import refresh as refresh_vaults
            refresh_vaults(self.db)
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
        self.copy.startup()
        for b in self.consensus:
            b.startup()
        self.mm.start()
        self.fundingc.startup()
        self.fasttrend.startup()
        for b in self.elite.values():
            b.startup()
        from app.copy_book import BOOK as CP_BOOK, LABEL as CP_LABEL
        from app.lab_xs import BOOK as XS_BOOK, LABEL as XS_LABEL
        self.db.set_state("lab:books", {"consensus": "Firefly Consensus (follow traders)",
                                        "consensus-fade": "Consensus fade (control)",
                                        "consensus-tp": "Consensus follow + take-profit (trailing)",
                                        "mm": "Market making (BTC/ETH)",
                                        "funding": "Funding contrarian (EXP-013 C3)",
                                        "ensemble": "Majority-vote ensemble (15 elite traders)",
                                        "weighted": "Weighted multi-trader portfolio (6 traders)",
                                        "hrp": "HRP: risk parity across 8 traders",
                                        "experts": "Expert weighting (aggregating algorithm)",
                                        "weighted-ff": "Weighted portfolio + funding filter",
                                        "hybrid": "Hybrid: clusters + HRP + consensus + regime",
                                        "weighted-random": "Random control: weighted rules, random traders",
                                        "ensemble-wide": "Wide ensemble: whole pool, max 3 per style",
                                        "weighted-tp": "Weighted portfolio + take-profit",
                                        "ensemble-tp": "Majority-vote ensemble + take-profit",
                                        "fasttrend": "Fast trend: 4H trend + 1H breakout (EXP-024)",
                                        CP_BOOK: CP_LABEL, XS_BOOK: XS_LABEL} | {b: v[0] for b, v in BOOKS.items()})
        s = BlockingScheduler(timezone="UTC")
        s.add_job(self.hourly, "cron", minute=self.cfg.paper.evaluation_minute, second=5, max_instances=1,
                  coalesce=True, id="hourly")
        s.add_job(self.poll, "interval", seconds=self.cfg.paper.poll_seconds, max_instances=1, coalesce=True,
                  id="poll")
        s.add_job(self.funding, "cron", minute=0, second=30, id="funding")
        s.add_job(self.daily_research, "cron", hour=0, minute=20, id="research", max_instances=1)
        s.add_job(self.weekly_rebalance, "cron", day_of_week="mon", hour=0, minute=10, id="momentum",
                  max_instances=1)
        s.add_job(self.rescan_wallets, "interval", days=2, id="wallet_scan",
                  max_instances=1)
        if now_ms() - (self.db.get_state("wallets:scan") or {}).get("ts", 0) > 2 * 86_400_000:
            s.add_job(self.rescan_wallets, id="wallet_scan_now", max_instances=1)   # runs once, right away
        s.add_job(self.funding_contrarian, "cron", minute=5, id="funding_c3", max_instances=1, coalesce=True)
        s.add_job(self.funding_contrarian_poll, "interval", seconds=60, id="funding_c3_poll", max_instances=1,
                  coalesce=True)
        s.add_job(self.fasttrend_step, "cron", minute=self.cfg.paper.evaluation_minute, second=45, id="fasttrend",
                  max_instances=1, coalesce=True)
        s.add_job(self.fasttrend_poll, "interval", seconds=30, id="fasttrend_poll", max_instances=1, coalesce=True)
        s.add_job(self.elite_refresh, "interval", hours=1, id="elite_refresh", max_instances=1, coalesce=True,
                  next_run_time=datetime.now(timezone.utc))
        for k, name in enumerate(("ensemble", "ensemble-wide", "ensemble-tp")):
            s.add_job(self.elite_step, "cron", minute="*/5", second=40 + 5 * k, args=[name], id=name,
                      max_instances=1, coalesce=True)
        for name in ("weighted", "hrp", "experts", "weighted-ff", "weighted-random", "weighted-tp"):
            s.add_job(self.elite_step, "interval", seconds=60, args=[name], id=name, max_instances=1, coalesce=True)
        s.add_job(self.elite_step, "cron", minute="*/2", second=50, args=["hybrid"], id="hybrid",
                  max_instances=1, coalesce=True)
        s.add_job(self.elite_poll, "interval", seconds=60, id="elite_poll", max_instances=1, coalesce=True)
        s.add_job(self.copy_step, "interval", seconds=60, id="copy", max_instances=1, coalesce=True)
        s.add_job(self.consensus_step, "cron", minute="*/5", second=20, id="consensus", max_instances=1,
                  coalesce=True)
        s.add_job(self.consensus_poll, "interval", seconds=60, id="consensus_poll", max_instances=1,
                  coalesce=True)
        log.info("lab running %d books: %s", len(self.traders), ", ".join(self.traders))
        try:
            s.start()
        except (KeyboardInterrupt, SystemExit):
            pass
        finally:
            self.feed.stop()


class SwarmTrader(Trader):
    """Firefly Swarm book: many coins, so candles are reused from the lab database where possible.

    Entries can only happen at 4H closes (EMA-cross strategy), so all coins are evaluated every
    4 hours; in between, only coins with an open position are refreshed (for exits and trailing).
    """

    def refresh_metadata(self) -> bool:
        ok = super().refresh_metadata()
        for m, info in self.infos.items():
            if m not in ("BTC", "ETH"):
                info.slippage_bps, info.half_spread_bps = ALT_SLIPPAGE_BPS, ALT_HALF_SPREAD_BPS
                info.max_spread_bps = ALT_MAX_SPREAD_BPS
        return ok

    def markets_to_evaluate(self) -> list[str]:
        if (now_ms() // 3_600_000) % 4 == 0:
            return list(self.cfg.trading.allowed_assets)
        return [t["market"] for t in self.pm.open_trades()]

    def load_market(self, m: str) -> PreparedMarket:
        now = now_ms()
        sc = self.cfg.strategy
        frames = {}
        for iv, mn in (("1d", sc.daily_ema_slow + 10), ("4h", 110)):
            rows = completed_only(self.db.load_candles("hyperliquid", m, iv), now)
            require_fresh_history(rows, iv, now, mn)
            frames[iv] = to_frame(rows)
        oldest = min((t["opened_ms"] for t in self.pm.open_trades() if t["market"] == m), default=now)
        span = min(max(10 * 86_400_000, now - oldest + 86_400_000), 60 * 86_400_000)
        rows = completed_only(self.info.candles(m, "1h", now - span, now), now)
        require_fresh_history(rows, "1h", now, 30)
        frames["1h"] = to_frame(rows)
        time.sleep(0.3)   # stay well inside Hyperliquid's info rate limit
        return PreparedMarket(m, frames["1d"], frames["4h"], frames["1h"], sc)
