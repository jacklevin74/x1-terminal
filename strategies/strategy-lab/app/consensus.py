"""EXP-007 "Firefly Consensus": Kuramoto synchrony of profitable traders' positions.

Each signal-source wallet is an oscillator whose phase in a coin is its position side
(long = 0, short = pi). For N wallets holding the coin, the Kuramoto order parameter is
    R = |sum exp(i*phase)| / N = |#long - #short| / N
One vote per wallet, regardless of size. Every snapshot is stored for later study.
Paper only.
"""
from __future__ import annotations

import logging
import time
from concurrent.futures import ThreadPoolExecutor
from typing import Any

import requests

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
INFO = "https://api.hyperliquid.xyz/info"

MIN_N_ENTER, R_ENTER, R_EXIT, MIN_N_HOLD = 8, 0.75, 0.5, 5
MAX_POSITIONS, GROSS, STOP_PCT, MIN_NOTIONAL = 6, 1.0, 0.10, 10.0
# EXP-008 take-profit variant: once a trade is up TRAIL_ACTIVATE, trail the stop TRAIL_GAP
# behind the best price seen. After a trailing exit, don't re-enter that coin until the
# crowd's signal on it resets (it would otherwise buy straight back in).
TRAIL_ACTIVATE, TRAIL_GAP, TRAIL_MIN_STEP = 0.03, 0.02, 0.001

SCHEMA = """
CREATE TABLE IF NOT EXISTS wallet_snapshots (
    ts INTEGER NOT NULL, address TEXT NOT NULL, coin TEXT NOT NULL, szi REAL NOT NULL,
    value REAL NOT NULL, account REAL NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_wsnap_ts ON wallet_snapshots(ts);
CREATE TABLE IF NOT EXISTS consensus_signal (
    ts INTEGER NOT NULL, coin TEXT NOT NULL, n INTEGER NOT NULL, longs INTEGER NOT NULL,
    shorts INTEGER NOT NULL, r REAL NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_csig_ts ON consensus_signal(ts);
"""


def is_signal_source(w: dict) -> bool:
    """The pre-registered EXP-007 selection rule (see docs/experiments.md)."""
    if w.get("early_exit"):
        return False
    if w["perp_pnl_all"] < 50_000 or w["perp_pnl_month"] <= 0:
        return False
    if w["perp_fills"] < 10 or w["last_perp_fill_days"] is None or w["last_perp_fill_days"] > 14:
        return False
    if w["maker_share"] > 0.5 and w["fills_per_day"] > 50:
        return False
    if w["fills_per_day"] > 300:
        return False
    if w.get("net_share") is not None and w["gross_lev"] > 0 and w["net_share"] < 0.3:
        return False
    return True


def order_parameter(sides: list[int]) -> tuple[int, int, int, float, int]:
    """sides: +1 long / -1 short per wallet. Returns (n, longs, shorts, R, majority side)."""
    n = len(sides)
    longs = sum(1 for s in sides if s > 0)
    shorts = n - longs
    r = abs(longs - shorts) / n if n else 0.0
    return n, longs, shorts, r, (1 if longs > shorts else -1 if shorts > longs else 0)


class Collector:
    def __init__(self, db: Database):
        self.db = db
        self.db._conn.executescript(SCHEMA)

    def sources(self) -> list[str]:
        st = self.db.get_state("consensus:sources")
        if st:
            return st["addresses"]
        scan = self.db.get_state("wallets:scan") or {}
        addrs = sorted({w["address"] for w in scan.get("copyable", []) + scan.get("rejected", [])
                        if is_signal_source(w)})
        self.db.set_state("consensus:sources", {"addresses": addrs, "ts": now_ms(), "frozen": True})
        return addrs

    def _one(self, addr: str):
        s = requests.Session()
        for k in range(3):
            try:
                r = s.post(INFO, json={"type": "clearinghouseState", "user": addr}, timeout=15)
                if r.status_code == 429:
                    time.sleep(3 * (k + 1))
                    continue
                return addr, r.json()
            except requests.RequestException:
                time.sleep(2)
        return addr, None

    def snapshot(self) -> dict[str, dict[str, Any]]:
        ts = now_ms()
        rows, by_coin, ok = [], {}, 0
        with ThreadPoolExecutor(max_workers=3) as pool:
            for addr, st in pool.map(self._one, self.sources()):
                if not st:
                    continue
                ok += 1
                av = float(st.get("marginSummary", {}).get("accountValue", 0) or 0)
                for p in st.get("assetPositions", []):
                    q = p["position"]
                    szi = float(q["szi"])
                    if szi == 0:
                        continue
                    rows.append((ts, addr, q["coin"], szi, float(q["positionValue"]), av))
                    by_coin.setdefault(q["coin"], []).append(1 if szi > 0 else -1)
        with self.db._lock:
            self.db._conn.executemany("INSERT INTO wallet_snapshots VALUES (?,?,?,?,?,?)", rows)
        signal = {}
        for coin, sides in by_coin.items():
            n, lo, sh, r, side = order_parameter(sides)
            signal[coin] = {"n": n, "longs": lo, "shorts": sh, "r": r, "side": side}
        with self.db._lock:
            self.db._conn.executemany("INSERT INTO consensus_signal VALUES (?,?,?,?,?,?)",
                                      [(ts, c, v["n"], v["longs"], v["shorts"], v["r"]) for c, v in signal.items()])
        self.db.set_state("consensus:last", {"ts": ts, "wallets_read": ok, "signal": signal})
        return signal


class ConsensusBook:
    def __init__(self, cfg, db: Database, info, fp: FillParams, follow: bool = True, take_profit: bool = False):
        self.cfg, self.db, self.info, self.follow, self.take_profit = cfg, db, info, follow, take_profit
        self.book = "consensus-tp" if take_profit else "consensus" if follow else "consensus-fade"
        self.s = requests.Session()
        self._quotes: dict[str, tuple[float, float, float]] = {}
        self.ex = PaperExchange(db, fp, cfg.account.starting_balance, self.quote, book=self.book)
        self.mode = self.ex.mode
        self.notify = Notifier(db, self.mode)
        self.breaker = CircuitBreaker(db, self.mode, max_api_errors=10)
        self.infos: dict = {}
        self.om = OrderManager(self.ex, db, self.breaker, self.infos, self.notify, max_slippage_bps=30,
                               max_open_positions=MAX_POSITIONS)
        self.pm = PositionManager(self.ex, db, self.om, self.breaker, self.notify, max_hold_hours=24 * 365,
                                  leverage=cfg.trading.max_leverage)
        self._last_equity = 0

    def quote(self, coin: str):
        q = self._quotes.get(coin)
        if q and time.time() - q[2] < 20:
            return q[0], q[1]
        try:
            book = self.s.post(INFO, json={"type": "l2Book", "coin": coin}, timeout=10).json()
            bid, ask = float(book["levels"][0][0]["px"]), float(book["levels"][1][0]["px"])
            self._quotes[coin] = (bid, ask, time.time())
            return bid, ask
        except Exception:  # noqa: BLE001
            return None

    def refresh_metadata(self) -> None:
        meta, ctxs = self.info.meta_and_ctxs()
        keep = [(a, c) for a, c in zip(meta["universe"], ctxs)
                if not a.get("isDelisted") and int(a["maxLeverage"]) >= 2]
        names = tuple(a["name"] for a, _ in keep)
        self.infos.clear()
        self.infos.update(parse_markets({"universe": [a for a, _ in keep]}, [c for _, c in keep], names))

    def startup(self) -> None:
        self.refresh_metadata()
        rep = reconcile(self.ex, self.db, self.om, self.pm, self.breaker)
        self.notify("info" if rep.ok else "critical", "startup",
                    f"{self.book} book started; reconciliation {'ok' if rep.ok else 'FAILED'}")
        self.db.record_equity(self.mode, self.ex.get_equity())

    def wanted(self, signal: dict) -> dict[str, int]:
        """coin -> side we want to hold, for new entries (ranked by R x N)."""
        cool = self._cooldown() if self.take_profit else {}
        cands = [(c, v) for c, v in signal.items()
                 if v["n"] >= MIN_N_ENTER and v["r"] >= R_ENTER and v["side"] != 0 and c in self.infos
                 and c not in cool]
        cands.sort(key=lambda cv: -cv[1]["r"] * cv[1]["n"])
        return {c: (v["side"] if self.follow else -v["side"]) for c, v in cands}

    def step(self, signal: dict) -> dict:
        for m in {t["market"] for t in self.pm.open_trades()}:
            q = self.quote(m)
            if q:
                self.ex.on_quote(m, *q)
        self._sync()
        if self.take_profit:
            self._release_cooldown(signal)
        actions = []
        # exits: synchrony broke down, too few holders, or majority flipped
        for t in self.pm.open_trades():
            v = signal.get(t["market"], {"n": 0, "r": 0.0, "side": 0})
            ours = 1 if t["direction"] == "long" else -1
            expected = v["side"] if self.follow else -v["side"]
            if v["n"] < MIN_N_HOLD or v["r"] < R_EXIT or expected != ours:
                cloid = make_cloid("consensus_exit", self.mode, t["id"], now_ms())
                self.om.cancel_trade_orders(t["id"], t["market"])
                self.db.upsert_order({"cloid": cloid, "mode": self.mode, "trade_id": t["id"], "market": t["market"],
                                      "side": "close", "kind": "signal_exit", "size": t["size"],
                                      "reduce_only": True, "status": "submitting"})
                self.ex.close_position(t["market"], cloid)
                actions.append(f"close {t['market']} (N={v['n']}, R={v['r']:.2f})")
        self._sync()
        actions += self._trail()
        if self.breaker.is_halted():
            return {"halted": self.breaker.reason(), "actions": actions}
        held = {t["market"] for t in self.pm.open_trades()}
        equity = self.ex.get_equity()
        notional = GROSS * equity / MAX_POSITIONS
        for c, side in self.wanted(signal).items():
            if len(held) >= MAX_POSITIONS:
                break
            if c in held:
                continue
            q = self.quote(c)
            if q is None:
                continue
            px = q[1] if side > 0 else q[0]
            size = round_size_down(notional / px, self.infos[c].sz_decimals)
            if size * px < MIN_NOTIONAL:
                continue
            stop = px * (1 - STOP_PCT) if side > 0 else px * (1 + STOP_PCT)
            d = RiskDecision(approved=True, reasons=[], market=c, direction="long" if side > 0 else "short",
                             entry=px, stop=stop, target=None, size=size, notional=size * px,
                             margin=size * px / self.cfg.trading.max_leverage, leverage=size * px / equity,
                             planned_risk=size * px * (STOP_PCT + 2 * self.cfg.fees.taker + 0.002))
            try:
                if self.om.open_position(d, None, time.time_ns(), place_tp=False):
                    held.add(c)
                    v = signal[c]
                    actions.append(f"open {c} {'long' if side > 0 else 'short'} (N={v['n']}, R={v['r']:.2f})")
            except OrderError as e:
                actions.append(f"refused {c}: {e}")
        if actions:
            self.db.log_event("consensus_step", {"actions": actions}, self.mode)
            self.notify("info", "consensus", f"{self.book}: " + "; ".join(actions))
        if now_ms() - self._last_equity > 300_000:
            self.db.record_equity(self.mode, self.ex.get_equity())
            self._last_equity = now_ms()
        return {"actions": actions}

    def poll(self) -> None:
        """Between snapshots: let stops trigger on fresh quotes."""
        for m in {t["market"] for t in self.pm.open_trades()}:
            q = self.quote(m)
            if q:
                self.ex.on_quote(m, *q)
        self._sync()
        self._trail()

    # -- EXP-008 take-profit (trailing stop) -------------------------------
    def _trail_state(self) -> dict:
        return self.db.get_state(f"{self.book}:trail") or {}

    def _cooldown(self) -> dict:
        return self.db.get_state(f"{self.book}:cooldown") or {}

    def _sync(self) -> None:
        closed = self.pm.sync()
        if not self.take_profit or not closed:
            return
        trail, cool = self._trail_state(), self._cooldown()
        for row in closed:
            if str(row["id"]) in trail and row.get("exit_reason") == "stop":
                self.db.execute("UPDATE trades SET exit_reason='trail_stop' WHERE id=?", (row["id"],))
                cool[row["market"]] = 1 if row["direction"] == "long" else -1
            trail.pop(str(row["id"]), None)
        self.db.set_state(f"{self.book}:trail", trail)
        self.db.set_state(f"{self.book}:cooldown", cool)

    def _release_cooldown(self, signal: dict) -> None:
        """A coin becomes tradeable again once the signal that got us in has broken or flipped."""
        cool = self._cooldown()
        keep = {}
        for c, side in cool.items():
            v = signal.get(c, {"n": 0, "r": 0.0, "side": 0})
            expected = v["side"] if self.follow else -v["side"]
            if not (v["n"] < MIN_N_HOLD or v["r"] < R_EXIT or expected != side):
                keep[c] = side
        if keep != cool:
            self.db.set_state(f"{self.book}:cooldown", keep)

    def _trail(self) -> list[str]:
        if not self.take_profit:
            return []
        trail, actions = self._trail_state(), []
        for t in self.pm.open_trades():
            q = self.quote(t["market"])
            if not q:
                continue
            long = t["direction"] == "long"
            px = q[0] if long else q[1]                      # price we could exit at
            key = str(t["id"])
            best = trail.get(key)
            if best is None:
                if (px - t["entry"]) / t["entry"] * (1 if long else -1) < TRAIL_ACTIVATE:
                    continue
                best = px
            best = max(best, px) if long else min(best, px)
            trail[key] = best
            new = best * (1 - TRAIL_GAP) if long else best * (1 + TRAIL_GAP)
            cur = t["stop"]
            better = new > cur * (1 + TRAIL_MIN_STEP) if long else new < cur * (1 - TRAIL_MIN_STEP)
            if better and self.om.move_stop(t["id"], t["market"], long, t["size"], new):
                actions.append(f"trail {t['market']} stop -> {new:.6g}")
        self.db.set_state(f"{self.book}:trail", trail)
        if actions:
            self.db.log_event("consensus_trail", {"actions": actions}, self.mode)
        return actions

    def hourly_funding(self) -> None:
        for t in self.pm.open_trades():
            info, q = self.infos.get(t["market"]), self.quote(t["market"])
            if info and q:
                cost = self.ex.accrue_funding(t["market"], sum(q) / 2, info.funding_rate_hourly or 0.0)
                self.db.add_trade_funding(t["id"], cost)
