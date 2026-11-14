"""Copy-trading paper book (EXP-006 "Shadow"): mirror the top copyable Hyperliquid wallets.

Every minute:
  1. read each leader's live positions (public clearinghouseState)
  2. target weight per coin = average over leaders of signed position value / leader account value
  3. our target notional = weight x our equity, gross capped at GROSS_CAP x equity
  4. open when a target appears (>= $10), close when it disappears or flips side; small size
     drifts are ignored to save fees; a position more than 2x off target is closed and reopened
Every copied position gets a reduce-only disaster stop STOP_PCT from entry.
All orders go through the order manager (write-ahead ids, verified fills and stops). Paper only.
"""
from __future__ import annotations

import logging
import time
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

BOOK, LABEL = "copy", "Shadow: copy top traders"
MIN_LEADERS = 3          # needed to start copying
MIN_LEADERS_KEEP = 2     # after dropping dead leaders, keep copying the rest while waiting for refills
N_LEADERS, GROSS_CAP, STOP_PCT, MIN_NOTIONAL, MAX_POSITIONS, REBUILD_RATIO = 5, 1.5, 0.10, 10.0, 6, 2.0
INFO = "https://api.hyperliquid.xyz/info"
# Leader health check (hourly): drop a leader whose account is nearly empty or who has not traded
# perps for INACTIVE_DAYS, and refill from the next wallets in the scan's copyable list.
MIN_LEADER_EQUITY, INACTIVE_DAYS, HEALTH_EVERY_MS = 1_000.0, 7, 3_600_000


class CopyBook:
    def __init__(self, cfg, db: Database, info, fp: FillParams):
        self.cfg, self.db, self.info = cfg, db, info
        self.s = requests.Session()
        self._quotes: dict[str, tuple[float, float, float]] = {}
        self.ex = PaperExchange(db, fp, cfg.account.starting_balance, self.quote, book=BOOK)
        self.mode = self.ex.mode
        self.notify = Notifier(db, self.mode)
        self.breaker = CircuitBreaker(db, self.mode, max_api_errors=10)
        self.infos: dict = {}
        self.om = OrderManager(self.ex, db, self.breaker, self.infos, self.notify, max_slippage_bps=30,
                               max_open_positions=MAX_POSITIONS)
        self.pm = PositionManager(self.ex, db, self.om, self.breaker, self.notify, max_hold_hours=24 * 365,
                                  leverage=cfg.trading.max_leverage)
        self._last_equity = 0

    # -- market data ------------------------------------------------------
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
        names = tuple(a["name"] for a in meta["universe"] if not a.get("isDelisted") and int(a["maxLeverage"]) >= 2)
        self.infos.clear()
        self.infos.update(parse_markets({"universe": [a for a in meta["universe"] if a["name"] in names]},
                                        [c for a, c in zip(meta["universe"], ctxs) if a["name"] in names], names))

    # -- leaders ----------------------------------------------------------
    def leaders(self) -> list[str]:
        st = self.db.get_state("copy:leaders")
        if st and len(st["addresses"]) >= MIN_LEADERS_KEEP:
            return st["addresses"]
        if st and st["addresses"]:
            return []       # only one leader left: wait for refills rather than copy one trader
        scan = self.db.get_state("wallets:scan") or {}
        picks = [w["address"] for w in scan.get("copyable", [])[:N_LEADERS]]
        if len(picks) >= MIN_LEADERS:
            self.db.set_state("copy:leaders", {"addresses": picks, "ts": now_ms()})
            return picks
        return []           # too few to diversify: wait rather than copy one trader

    def _leader_health(self, addr: str) -> str | None:
        """None if healthy, else the reason to drop. Network errors count as healthy (retry next hour)."""
        try:
            st = self.s.post(INFO, json={"type": "clearinghouseState", "user": addr}, timeout=15).json()
            av = float(st["marginSummary"]["accountValue"])
            if av < MIN_LEADER_EQUITY:
                return f"account ${av:,.0f} < ${MIN_LEADER_EQUITY:,.0f}"
            fills = self.s.post(INFO, json={"type": "userFills", "user": addr}, timeout=15).json()
            last = max((f["time"] for f in fills if not f["coin"].startswith("@")), default=0)
            if now_ms() - last > INACTIVE_DAYS * 86_400_000:
                return f"no perp trades for {INACTIVE_DAYS}+ days"
            return None
        except Exception:  # noqa: BLE001
            return None

    def refresh_leaders(self, force: bool = False) -> list[str]:
        st = self.db.get_state("copy:leaders")
        if not st or (not force and now_ms() - st.get("checked", 0) < HEALTH_EVERY_MS):
            return []
        dropped = self.db.get_state("copy:dropped") or {}
        scan = self.db.get_state("wallets:scan") or {}
        keep, changes = [], []
        # A newer scan is the source of truth: leaders that no longer pass it are dropped, and
        # previously dropped wallets that pass it again become eligible. Ignore broken scans.
        new_scan = scan.get("ts", 0) > st.get("scan_ts", 0) and scan.get("analysed", 0) >= 50
        approved = {w["address"] for w in scan.get("copyable", [])}
        if new_scan:
            dropped = {a: v for a, v in dropped.items() if a not in approved}
        for a in st["addresses"]:
            why = "no longer passes the leaderboard scan" if new_scan and a not in approved else None
            if why is None:
                why = self._leader_health(a)
            if why:
                dropped[a] = {"ts": now_ms(), "reason": why}
                changes.append(f"drop {a[:8]} ({why})")
            else:
                keep.append(a)
        for w in scan.get("copyable", []):
            if len(keep) >= N_LEADERS:
                break
            a = w["address"]
            if a in keep or a in dropped:
                continue
            why = self._leader_health(a)
            if why:
                dropped[a] = {"ts": now_ms(), "reason": why}
            else:
                keep.append(a)
                changes.append(f"add {a[:8]}")
        self.db.set_state("copy:dropped", dropped)
        self.db.set_state("copy:leaders", {"addresses": keep, "ts": st["ts"] if not changes else now_ms(),
                                           "checked": now_ms(),
                                           "scan_ts": scan.get("ts", 0) if new_scan else st.get("scan_ts", 0)})
        if changes:
            self.db.log_event("copy_leaders", {"changes": changes, "leaders": keep}, self.mode)
            self.notify("info", "copy_leaders", "copy leaders: " + "; ".join(changes))
        return changes

    def leader_weights(self) -> tuple[dict[str, float], list[dict[str, Any]]]:
        weights: dict[str, float] = {}
        snaps = []
        leaders = self.leaders()
        if not leaders:
            raise LookupError(f"fewer than {MIN_LEADERS} copyable leaders found; not copying")
        for a in leaders:
            st = self.s.post(INFO, json={"type": "clearinghouseState", "user": a}, timeout=15).json()
            av = float(st["marginSummary"]["accountValue"])
            pos = []
            for p in st.get("assetPositions", []):
                q = p["position"]
                signed = float(q["positionValue"]) * (1 if float(q["szi"]) > 0 else -1)
                pos.append((q["coin"], signed))
                if av > 0:
                    weights[q["coin"]] = weights.get(q["coin"], 0.0) + signed / av / len(leaders)
            snaps.append({"address": a, "account": av, "positions": pos})
            time.sleep(0.2)
        return weights, snaps

    # -- main step --------------------------------------------------------
    def step(self) -> dict[str, Any]:
        for m in {t["market"] for t in self.pm.open_trades()}:
            q = self.quote(m)
            if q:
                self.ex.on_quote(m, *q)
        self.pm.sync()
        if self.breaker.is_halted():
            return {"halted": self.breaker.reason()}
        try:
            self.refresh_leaders()
        except Exception:  # noqa: BLE001
            log.exception("leader refresh failed")
        try:
            weights, snaps = self.leader_weights()
            self.breaker.record_api_success()
        except LookupError as e:
            self.db.set_state("copy:last", {"ts": now_ms(), "waiting": str(e)})
            return {"waiting": str(e)}
        except Exception as e:  # noqa: BLE001
            self.breaker.record_api_error(str(e))
            return {"error": str(e)}
        equity = self.ex.get_equity()
        target = {c: w * equity for c, w in weights.items() if c in self.infos}
        gross = sum(abs(v) for v in target.values())
        if gross > GROSS_CAP * equity:
            target = {c: v * GROSS_CAP * equity / gross for c, v in target.items()}
        target = dict(sorted(((c, v) for c, v in target.items() if abs(v) >= MIN_NOTIONAL),
                             key=lambda x: -abs(x[1]))[:MAX_POSITIONS])
        actions = []
        for t in self.pm.open_trades():
            m, side = t["market"], (1 if t["direction"] == "long" else -1)
            want = target.get(m, 0.0)
            cur = t["size"] * t["entry"]
            rebuild = want * side > 0 and (abs(want) > REBUILD_RATIO * cur or abs(want) < cur / REBUILD_RATIO)
            if want * side <= 0 or rebuild:
                cloid = make_cloid("copy_exit", self.mode, t["id"], now_ms())
                self.om.cancel_trade_orders(t["id"], m)
                self.db.upsert_order({"cloid": cloid, "mode": self.mode, "trade_id": t["id"], "market": m,
                                      "side": "close", "kind": "leader_exit", "size": t["size"],
                                      "reduce_only": True, "status": "submitting"})
                self.ex.close_position(m, cloid)
                actions.append(f"close {m}")
        self.pm.sync()
        held = {t["market"] for t in self.pm.open_trades()}
        for m, v in target.items():
            if m in held:
                continue
            q = self.quote(m)
            if q is None:
                continue
            long = v > 0
            px = q[1] if long else q[0]
            size = round_size_down(abs(v) / px, self.infos[m].sz_decimals)
            if size * px < MIN_NOTIONAL:
                continue
            stop = px * (1 - STOP_PCT) if long else px * (1 + STOP_PCT)
            d = RiskDecision(approved=True, reasons=[], market=m, direction="long" if long else "short", entry=px,
                             stop=stop, target=None, size=size, notional=size * px,
                             margin=size * px / self.cfg.trading.max_leverage, leverage=size * px / equity,
                             planned_risk=size * px * (STOP_PCT + 2 * self.cfg.fees.taker + 0.002))
            try:
                # Unique per decision (nanoseconds): the order id derives from it.
                if self.om.open_position(d, None, time.time_ns(), place_tp=False):
                    actions.append(f"open {m} {'long' if long else 'short'} ${size * px:.0f}")
            except OrderError as e:
                actions.append(f"refused {m}: {e}")
        if actions:
            self.db.log_event("copy_step", {"actions": actions, "target": target}, self.mode)
            self.notify("info", "copy", "copy: " + "; ".join(actions))
        self.db.set_state("copy:last", {"ts": now_ms(), "target": target, "leaders": snaps, "equity": equity})
        if now_ms() - self._last_equity > 300_000:
            self.db.record_equity(self.mode, self.ex.get_equity())
            self._last_equity = now_ms()
        return {"actions": actions, "target": target}

    def startup(self) -> None:
        self.refresh_metadata()
        try:
            self.refresh_leaders(force=True)
        except Exception:  # noqa: BLE001
            log.exception("leader refresh failed")
        rep = reconcile(self.ex, self.db, self.om, self.pm, self.breaker)
        self.notify("info" if rep.ok else "critical", "startup",
                    f"copy book started; leaders {len(self.leaders())}; reconciliation "
                    f"{'ok' if rep.ok else 'FAILED: ' + '; '.join(rep.issues)}")
        self.db.record_equity(self.mode, self.ex.get_equity())

    def hourly_funding(self) -> None:
        for t in self.pm.open_trades():
            info, q = self.infos.get(t["market"]), self.quote(t["market"])
            if info and q:
                cost = self.ex.accrue_funding(t["market"], sum(q) / 2, info.funding_rate_hourly or 0.0)
                self.db.add_trade_funding(t["id"], cost)
