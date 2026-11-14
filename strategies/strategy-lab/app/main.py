"""Command-line entry point.

    python -m app.main fetch      --source hyperliquid|binance --days N
    python -m app.main backtest   --source hyperliquid|binance [--csv out.csv]
    python -m app.main signals    [--ai]            evaluate current market once, no orders
    python -m app.main paper                        run the paper trader (live data, simulated orders)
    python -m app.main testnet                      run against Hyperliquid testnet (needs agent wallet)
    python -m app.main status     [--mode paper]
    python -m app.main report     [--mode paper] [--weekly]
    python -m app.main halt       --mode paper --reason "..."
    python -m app.main clear-halt --mode paper --operator NAME --reason "..."
    python -m app.main gates      [--run-tests]
    python -m app.main attest     GATE --operator NAME --note "..."
"""
from __future__ import annotations

import argparse
import csv
import json
import logging
import subprocess
import sys

from app.config import (HL_MAINNET_URL, HL_MAINNET_WS, HL_TESTNET_URL, HL_TESTNET_WS, ROOT, Config,
                        load_config, setup_logging)
from app.storage.database import Database, now_ms
from app.timeutil import iso

log = logging.getLogger("app")


def _db(cfg: Config) -> Database:
    return Database(cfg.db_path)


def cmd_fetch(cfg: Config, a: argparse.Namespace) -> None:
    from app.data.history import fetch_history
    from app.data.market_data import HyperliquidInfo
    db, info = _db(cfg), HyperliquidInfo(HL_MAINNET_URL)
    if not a.universe:
        rep = fetch_history(db, info, a.source, cfg.trading.allowed_assets, a.days)
    else:
        # Synchrony index (Firefly) and Relative Strength need every universe coin. Coins a venue
        # does not list fail individually and are skipped; the index uses whatever is available.
        from app.data.universe import UNIVERSE
        rep = {}
        for m in UNIVERSE:
            try:
                rep |= fetch_history(db, info, a.source, (m,), a.days)
            except Exception as e:  # noqa: BLE001
                rep[m] = {"error": type(e).__name__}
                log.warning("fetch %s %s skipped: %s", a.source, m, e)
    print(json.dumps(rep, indent=2))


def cmd_backtest(cfg: Config, a: argparse.Namespace) -> None:
    from app.backtest.engine import Backtester
    from app.backtest.performance import format_summary, summarize
    from app.data.history import load_funding, load_prepared
    from app.data.market_data import HyperliquidInfo
    from app.data.market_metadata import parse_markets

    import dataclasses
    if a.strategy != "pullback":
        a.exit_mode = "reverse"     # crossover systems exit on the opposite cross (or the stop)
    if a.exit_mode:
        cfg = dataclasses.replace(cfg, strategy=dataclasses.replace(cfg.strategy, exit_mode=a.exit_mode))
    db = _db(cfg)
    meta, ctxs = HyperliquidInfo(HL_MAINNET_URL).meta_and_ctxs()
    infos = parse_markets(meta, ctxs, cfg.trading.allowed_assets)
    prepared = load_prepared(db, cfg, a.source)
    strategies = None
    if a.strategy != "pullback":
        from app.strategy.ema_cross import CrossStrategy
        strategies = {m: CrossStrategy(pm, a.strategy) for m, pm in prepared.items()}
    bt = Backtester(cfg, prepared, infos, load_funding(db, cfg.trading.allowed_assets),
                    half_spread_bps=a.half_spread_bps, strategies=strategies)
    r = bt.run()
    print(f"Backtest source={a.source}  strategy={a.strategy}  exit_mode={cfg.strategy.exit_mode}  {iso(r.start_ms)} -> {iso(r.end_ms)}  "
          f"evaluations={r.evaluations} candidates={r.candidates}")
    if a.source == "binance":
        print("NOTE: Binance spot candles are a proxy for Hyperliquid perps (price basis and volume differ).")
    print("Claude is not used in backtests (it has seen historical prices in training).\n")
    print(format_summary("ALL TRADES", summarize(r.trades, cfg.account.starting_balance)))
    for k, s in r.splits.items():
        print(format_summary(f"{k}  [{iso(s['from_ms'])} -> {iso(s['to_ms'])}]", s))
    print(f"\nHalts that live trading would have required operator review for: {len(r.halts)}")
    for h in r.halts:
        print(f"  {iso(h['ts'])} equity ${h['equity']:.2f} (peak ${h['peak']:.2f})")
    print("\nTop risk-engine rejection reasons:")
    for reason, n in r.rejections.most_common(10):
        print(f"  {n:>5}  {reason}")
    oos = r.splits.get("out-of-sample (last 20%)", {})
    db.set_state("last_backtest", {"ts": now_ms(), "source": a.source, "strategy": a.strategy, "exit_mode": cfg.strategy.exit_mode, "trades": len(r.trades),
                                   "oos_trades": oos.get("trades", 0),
                                   "oos_expectancy_usd": oos.get("expectancy_usd"),
                                   "oos_profit_factor": oos.get("profit_factor"),
                                   "summary": summarize(r.trades, cfg.account.starting_balance)})
    db.set_state("last_backtest_curve", r.equity_curve[::24])
    if a.csv:
        with open(a.csv, "w", newline="") as f:
            if r.trades:
                w = csv.DictWriter(f, fieldnames=list(r.trades[0]))
                w.writeheader()
                w.writerows(r.trades)
        print(f"\ntrades written to {a.csv}")


def _analyst(cfg: Config):
    if not cfg.ai.enabled:
        return None
    from app.ai.claude_client import ClaudeAnalyst
    return ClaudeAnalyst(cfg.ai, cfg.secrets.anthropic_api_key)


def _build_trader(cfg: Config, mode: str):
    from app.backtest.simulator import FillParams
    from app.data.market_data import HyperliquidInfo
    from app.data.websocket_client import PriceFeed
    from app.execution.paper_exchange import PaperExchange
    from app.monitoring.alerts import Notifier
    from app.trader import Trader

    db = _db(cfg)
    s = cfg.secrets
    notifier = Notifier(db, mode, s.telegram_bot_token, s.telegram_chat_id, cfg.alerts.telegram_enabled)
    if mode == "paper":
        # Paper: real MAINNET market data, simulated orders.
        info = HyperliquidInfo(HL_MAINNET_URL)
        feed = PriceFeed(HL_MAINNET_WS, info, cfg.trading.allowed_assets, cfg.execution.stale_after_seconds)
        fp = FillParams(cfg.fees.taker, cfg.fees.maker, cfg.execution.assumed_slippage_bps / 1e4, 0.0)

        def quote(m: str):
            q = feed.quote(m)
            return (q.bid, q.ask) if q else None
        adapter = PaperExchange(db, fp, cfg.account.starting_balance, quote)
    elif mode == "testnet":
        from app.data.market_metadata import parse_markets
        from app.execution.hyperliquid_client import HyperliquidTestnetAdapter
        if not (s.hl_testnet_account_address and s.hl_testnet_agent_key_file):
            sys.exit("testnet needs HL_TESTNET_ACCOUNT_ADDRESS and HL_TESTNET_AGENT_KEY_FILE in .env")
        info = HyperliquidInfo(HL_TESTNET_URL)
        feed = PriceFeed(HL_TESTNET_WS, info, cfg.trading.allowed_assets, cfg.execution.stale_after_seconds)
        meta, ctxs = info.meta_and_ctxs()
        szd = {k: v.sz_decimals for k, v in parse_markets(meta, ctxs, cfg.trading.allowed_assets).items()}
        adapter = HyperliquidTestnetAdapter(s.hl_testnet_account_address, s.hl_testnet_agent_key_file,
                                            cfg.trading.allowed_assets, int(cfg.trading.max_leverage), szd)
    else:
        sys.exit(f"unsupported mode {mode}")
    return Trader(cfg, db, adapter, feed, info, _analyst(cfg), notifier)


def cmd_run(cfg: Config, a: argparse.Namespace) -> None:
    mode = a.cmd
    if mode == "testnet" and cfg.trading.mode != "testnet":
        sys.exit("set trading.mode: testnet in config.yaml to run against testnet")
    if cfg.ai.enabled and cfg.ai.required_for_entry and not cfg.secrets.anthropic_api_key:
        log.warning("ANTHROPIC_API_KEY not set; relying on `ant auth login` credentials if present. "
                    "If none exist, every candidate will be skipped (AI review is required).")
    _build_trader(cfg, mode).run()


def cmd_signals(cfg: Config, a: argparse.Namespace) -> None:
    """One-off evaluation of the current market. Never places orders."""
    from app.ai.trade_analysis import ai_gate
    from app.data.market_data import HyperliquidInfo
    from app.storage.models import AccountState
    from app.trader import Trader
    info = HyperliquidInfo(HL_MAINNET_URL)
    t = Trader.__new__(Trader)
    t.cfg, t.info = cfg, info
    for m in cfg.trading.allowed_assets:
        try:
            pm = t.load_market(m)
        except Exception as e:  # noqa: BLE001
            print(f"{m}: cannot evaluate: {e}")
            continue
        sig = pm.evaluate()
        print(f"\n{m}  as of {iso(sig.timestamp_ms)} UTC  trend={sig.trend}  candidate={sig.is_candidate}")
        for k, v in sig.checks.items():
            print(f"   {'PASS' if v else 'fail'}  {k}")
        for n in sig.notes:
            print(f"   note: {n}")
        if sig.is_candidate:
            print(f"   entry {sig.entry:.2f}  stop {sig.stop:.2f}  target {sig.target:.2f}  R:R {sig.reward_risk:.2f}")
        if a.ai and sig.is_candidate:
            acct = AccountState(cfg.account.starting_balance, cfg.account.starting_balance,
                                cfg.account.starting_balance, 0.0, 0, [])
            g = ai_gate(_analyst(cfg), sig, acct, cfg, "signals")
            print(f"   Claude: {g.decision} {g.error or ''}")
            if g.analysis:
                print(f"   {g.analysis.reasoning}")


def cmd_lab(cfg: Config, a: argparse.Namespace) -> None:
    from app.lab import Lab
    for noisy in ("apscheduler", "websocket"):
        logging.getLogger(noisy).setLevel(logging.WARNING)
    Lab(cfg, _db(cfg)).run()


def cmd_research(cfg: Config, a: argparse.Namespace) -> None:
    from app.research import run_all
    out = run_all(_db(cfg), cfg)
    for src, d in out["sources"].items():
        print(f"\n== {src}  (synchrony coins: {d['coins']}, time synced: {d['synced_share'] or 0:.0%})")
        print(f"{'variant':38} {'trades':>6} {'avg R':>7} {'PF':>5} {'val R':>7} {'OOS R':>7}")
        for k, r in d["results"].items():
            if k.startswith("_"):
                continue
            s, sp = r["summary"], r["splits"]
            seg = lambda name: (sp.get(name) or {}).get("expectancy_r")  # noqa: E731
            f = lambda x: "   -  " if x is None else f"{x:+.3f}"  # noqa: E731
            print(f"{out['variants'][k]:38} {s.get('trades', 0):>6} {f(s.get('expectancy_r')):>7} "
                  f"{(s.get('profit_factor') or 0):>5.2f} {f(seg('validation (next 20%)')):>7} "
                  f"{f(seg('out-of-sample (last 20%)')):>7}")
        if "_swarm_coins" in d["results"]:
            print(f"  swarm traded {len(d['results']['_swarm_coins'])} coins; trades/year: " + ", ".join(
                f"{k} {d['results'][k]['trades_per_year']:.0f}" for k in ("S1", "S0", "S2")))
        b = d["results"]["F0"].get("sync_buckets")
        if b:
            print("  control trades by synchrony at entry (exploratory):")
            for row in b:
                print(f"    R/baseline {row['lo']:.2f}-{row['hi']:.2f}: {row['trades']:>3} trades, "
                      f"avg {row['avg_R']:+.2f} R, win {row['win_rate']:.0%}")
    print(f"\nruntime {out['runtime_s']}s")


def cmd_xs(cfg: Config, a: argparse.Namespace) -> None:
    from app.xs_research import run_all_xs
    out = run_all_xs(_db(cfg))
    VAL, OOS = "validation (next 20%)", "out-of-sample (last 20%)"
    f = lambda x: "    -  " if x is None else f"{x:+7.1%}"  # noqa: E731
    for src, res in out["sources"].items():
        print(f"\n== {src}: {len(out['coins'])} coins")
        print(f"{'variant':46} {'trades':>6} {'avg R':>6} {'total':>8} {'CAGR':>7} {'maxDD':>7} {'+months':>7} "
              f"{'worst mo':>8} {'best mo':>8} {'val ret':>8} {'OOS ret':>8}")
        for k, r in res.items():
            s, sp = r["summary"], r.get("splits", {})
            print(f"{r['label']:46} {s.get('trades', 0):>6} {(s.get('expectancy_r') or 0):>+6.2f} "
                  f"{f(r.get('total_return'))} {f(r.get('cagr'))} {f(r.get('max_drawdown_pct'))} "
                  f"{(r.get('positive_months') or 0):>7.0%} {f(r.get('worst_month'))} {f(r.get('best_month'))} "
                  f"{f((sp.get(VAL) or {}).get('equity_return'))} {f((sp.get(OOS) or {}).get('equity_return'))}")
            print(f"{'':46} val avg {(sp.get(VAL) or {}).get('expectancy_r') or 0:+.2f}R "
                  f"({(sp.get(VAL) or {}).get('trades', 0)})  OOS avg {(sp.get(OOS) or {}).get('expectancy_r') or 0:+.2f}R "
                  f"({(sp.get(OOS) or {}).get('trades', 0)})  skipped<$10: {r.get('skipped_small')}")


def cmd_status(cfg: Config, a: argparse.Namespace) -> None:
    from app.monitoring.health import read_health
    from app.risk.circuit_breaker import CircuitBreaker
    db = _db(cfg)
    br = CircuitBreaker(db, a.mode)
    print(f"mode: {a.mode}   live execution: DISABLED (v1 has no mainnet adapter)")
    print(f"halt: {'ACTIVE - ' + str(br.reason()) if br.is_halted() else 'not active'}")
    h = read_health(db, a.mode)
    if h:
        print(f"last health {iso(h['ts'])}: equity ${h.get('equity', 0):.2f}, entries_enabled={h.get('entries_enabled')}, "
              f"feed={h.get('feed')}")
    for t in db.trades(a.mode, "open"):
        print(f"OPEN #{t['id']} {t['market']} {t['direction']} size {t['size']} @ {t['entry']} "
              f"stop {t['stop']:.2f} target {t['target'] or 0:.2f}")
    closed = db.trades(a.mode, "closed")
    print(f"closed trades: {len(closed)}   net P&L ${sum(t['net_pnl'] or 0 for t in closed):+.4f}")


def cmd_report(cfg: Config, a: argparse.Namespace) -> None:
    from app.monitoring.reports import daily_report, weekly_report
    fn = weekly_report if a.weekly else daily_report
    print(fn(_db(cfg), a.mode, cfg.account.starting_balance))


def cmd_halt(cfg: Config, a: argparse.Namespace) -> None:
    from app.risk.circuit_breaker import CircuitBreaker
    CircuitBreaker(_db(cfg), a.mode).trip(f"manual halt: {a.reason}")
    print("halt active")


def cmd_clear_halt(cfg: Config, a: argparse.Namespace) -> None:
    from app.risk.circuit_breaker import CircuitBreaker
    br = CircuitBreaker(_db(cfg), a.mode)
    if not br.is_halted():
        print("no active halt")
        return
    print(f"active halt: {br.status()}")
    if input("Type CLEAR to confirm you reviewed the cause: ").strip() != "CLEAR":
        sys.exit("not cleared")
    br.clear(a.operator, a.reason)
    print("halt cleared")


def cmd_gates(cfg: Config, a: argparse.Namespace) -> None:
    from app.monitoring.reports import evaluate_gates
    db = _db(cfg)
    if a.run_tests:
        res = {}
        for name in ("test_risk", "test_orders", "test_recovery", "test_strategy", "test_fees"):
            p = subprocess.run([sys.executable, "-m", "pytest", "-q", f"tests/{name}.py"], cwd=ROOT,
                               capture_output=True, text=True)
            res[name] = p.returncode == 0
            print(f"  {name}: {'pass' if res[name] else 'FAIL'}")
        db.set_state("last_test_run", res)
    gates = evaluate_gates(db, cfg)
    met = sum(g["ok"] for g in gates)
    print(f"\nLive trading authorization checklist: {met}/{len(gates)} requirements met\n")
    for g in gates:
        print(f"  [{'x' if g['ok'] else ' '}] {g['label']}\n        {g['detail']}")
    print("\nEven with every box checked, v1 cannot trade mainnet: the mainnet adapter is a separate, "
          "reviewed future module.")


def cmd_attest(cfg: Config, a: argparse.Namespace) -> None:
    from app.monitoring.reports import GATES
    keys = {k for k, _, kind in GATES if kind.startswith("attest")}
    if a.gate not in keys:
        sys.exit(f"gate must be one of {sorted(keys)}")
    db = _db(cfg)
    att = db.get_state("attestations") or {}
    att[a.gate] = {"operator": a.operator, "note": a.note, "ts": now_ms()}
    db.set_state("attestations", att)
    db.log_event("attestation", {"gate": a.gate, "operator": a.operator, "note": a.note})
    print(f"recorded attestation for {a.gate}")


def main(argv: list[str] | None = None) -> None:
    p = argparse.ArgumentParser(prog="app.main", description="Hyperliquid AI trader (v1: paper/testnet only)")
    sub = p.add_subparsers(dest="cmd", required=True)
    f = sub.add_parser("fetch")
    f.add_argument("--source", choices=["hyperliquid", "binance"], default="hyperliquid")
    f.add_argument("--days", type=int, default=210)
    f.add_argument("--universe", action="store_true", help="fetch the whole coin universe, not just BTC/ETH")
    b = sub.add_parser("backtest")
    b.add_argument("--source", choices=["hyperliquid", "binance"], default="hyperliquid")
    b.add_argument("--half-spread-bps", type=float, default=1.0)
    b.add_argument("--csv")
    b.add_argument("--strategy", choices=["pullback", "ema_cross_4h", "ema_cross_1d"], default="pullback")
    b.add_argument("--exit-mode", choices=["fixed", "trailing", "trailing_trend"],
                   help="override strategy.exit_mode for this run")
    sg = sub.add_parser("signals")
    sg.add_argument("--ai", action="store_true", help="also ask Claude to review any candidate")
    sub.add_parser("paper")
    sub.add_parser("lab", help="paper-trade all strategy books side by side on live data")
    sub.add_parser("research", help="recompute synchrony index and backtest all variants")
    sub.add_parser("xs", help="EXP-005: cross-sectional momentum/reversal backtests")
    sub.add_parser("testnet")
    for name in ("status", "report"):
        sp = sub.add_parser(name)
        sp.add_argument("--mode", default="paper")
        if name == "report":
            sp.add_argument("--weekly", action="store_true")
    h = sub.add_parser("halt")
    h.add_argument("--mode", default="paper")
    h.add_argument("--reason", required=True)
    c = sub.add_parser("clear-halt")
    c.add_argument("--mode", default="paper")
    c.add_argument("--operator", required=True)
    c.add_argument("--reason", required=True)
    g = sub.add_parser("gates")
    g.add_argument("--run-tests", action="store_true")
    at = sub.add_parser("attest")
    at.add_argument("gate")
    at.add_argument("--operator", required=True)
    at.add_argument("--note", required=True)

    a = p.parse_args(argv)
    setup_logging()
    cfg = load_config()
    {"fetch": cmd_fetch, "backtest": cmd_backtest, "signals": cmd_signals, "paper": cmd_run, "testnet": cmd_run,
     "status": cmd_status, "lab": cmd_lab, "research": cmd_research, "xs": cmd_xs, "report": cmd_report, "halt": cmd_halt, "clear-halt": cmd_clear_halt,
     "gates": cmd_gates, "attest": cmd_attest}[a.cmd](cfg, a)


if __name__ == "__main__":
    main()
