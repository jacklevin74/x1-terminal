"""Backtests for EXP-009 (OU mean reversion) and EXP-010 (Hurst regime switch) on stored candles.

Same signal functions as the paper books. Simplifications (stated in docs/experiments.md):
- each trade is sized at 1/max_positions of $100 and trades are not limited by open-slot count;
- mean reversion is evaluated every 4th hour (the paper book checks every hour) to keep run time sane;
- intrabar: if a bar touches both stop and target, the stop is assumed first;
- maker entries fill only if the next bar trades through the limit; take-profits need a trade-through.
Results are per-trade net returns on notional, split 60/20/20 by time.

    python -m app.research_new [binance|hyperliquid]
"""
from __future__ import annotations

import math
import sys

import numpy as np
import pandas as pd

from app.backtest.simulator import FillParams
from app.config import load_config
from app.lab_books import (H_BARS, MR_FIT_BARS, hurst_signal, mr_signal)
from app.storage.database import Database

SLIP = 0.001


def frames(db: Database, source: str, interval: str) -> dict[str, pd.DataFrame]:
    out = {}
    for (m,) in db._conn.execute("SELECT DISTINCT market FROM candles WHERE source=? AND interval=?",
                                 (source, interval)).fetchall():
        df = pd.DataFrame(db.load_candles(source, m, interval)).set_index("t")
        if len(df) > 500:
            out[m] = df
    return out


def simulate(df: pd.DataFrame, i: int, long: bool, entry: float, stop: float, target: float | None,
             max_bars: int, maker: bool, fp: FillParams) -> tuple[float, str] | None:
    """Walk forward from bar i+1. Returns (net return on notional, exit reason) or None if a maker
    entry never filled on bar i+1."""
    h, lo, c = df["h"].values, df["l"].values, df["c"].values
    j = i + 1
    if j >= len(df):
        return None
    if maker:
        if not ((lo[j] < entry) if long else (h[j] > entry)):
            return None
        fee_in = fp.maker_fee
    else:
        entry = c[i] * (1 + SLIP if long else 1 - SLIP)
        fee_in = fp.taker_fee
    sgn = 1 if long else -1
    for k in range(j, min(len(df), j + max_bars)):
        if (lo[k] <= stop) if long else (h[k] >= stop):
            px = stop * (1 - SLIP if long else 1 + SLIP)
            return sgn * (px / entry - 1) - fee_in - fp.taker_fee, "stop"
        if target is not None and ((h[k] > target) if long else (lo[k] < target)):
            return sgn * (target / entry - 1) - fee_in - fp.maker_fee, "target"
    k = min(len(df), j + max_bars) - 1
    px = c[k] * (1 - SLIP if long else 1 + SLIP)
    return sgn * (px / entry - 1) - fee_in - fp.taker_fee, "time"


def run_meanrev(fr: dict[str, pd.DataFrame], fp: FillParams) -> pd.DataFrame:
    btc = fr["BTC"]["c"]
    rows = []
    for m, df in fr.items():
        if m == "BTC":
            continue
        df = df[df.index.isin(btc.index)]
        x = (np.log(df["c"]) - np.log(btc.reindex(df.index))).values
        busy_until = -1
        for i in range(MR_FIT_BARS, len(df) - 1, 4):
            if i <= busy_until:
                continue
            sig = mr_signal(x[: i + 1], fp, seed=i)
            if not sig:
                continue
            ou, lv, z0 = sig["ou"], sig["levels"], sig["z0"]
            sgn = 1 if z0 > 0 else -1
            px = df["c"].values[i]
            to_px = lambda z: px * math.exp((z - z0) * ou.sigma_eq)       # noqa: E731  (BTC held fixed)
            res = simulate(df, i, sig["long"], px, to_px(sgn * lv.stop_z), to_px(sgn * lv.tp_z),
                           lv.horizon, True, fp)
            if res:
                rows.append({"t": df.index[i], "coin": m, "ret": res[0], "exit": res[1]})
                busy_until = i + lv.horizon
    return pd.DataFrame(rows)


def run_hurst(fr: dict[str, pd.DataFrame], fp: FillParams) -> pd.DataFrame:
    rows = []
    for m, df in fr.items():
        h, lo, c = df["h"].values, df["l"].values, df["c"].values
        busy_until = -1
        for i in range(H_BARS, len(df) - 1):
            if i <= busy_until:
                continue
            sig = hurst_signal(h[: i + 1], lo[: i + 1], c[: i + 1])
            if not sig:
                continue
            bars = sig["days"] * 6
            if sig["maker"]:
                res = simulate(df, i, sig["long"], sig["ref"], sig["stop"], sig["target"], bars, True, fp)
            else:
                res = simulate(df, i, sig["long"], c[i], sig["stop"], sig["target"], bars, False, fp)
            if res:
                rows.append({"t": df.index[i], "coin": m, "ret": res[0], "exit": res[1], "regime": sig["regime"]})
                busy_until = i + bars
    return pd.DataFrame(rows)


def report(name: str, tr: pd.DataFrame, notional: float) -> None:
    if tr.empty:
        print(f"{name}: no trades")
        return
    tr = tr.sort_values("t").reset_index(drop=True)
    t0, t1 = tr["t"].min(), tr["t"].max()
    cuts = [t0 + (t1 - t0) * f for f in (0.6, 0.8)]
    seg = np.where(tr["t"] < cuts[0], "dev 60%", np.where(tr["t"] < cuts[1], "val 20%", "oos 20%"))
    print(f"\n{name}: {len(tr)} trades, {pd.to_datetime(t0, unit='ms').date()} .. {pd.to_datetime(t1, unit='ms').date()}")
    print(f"  all: avg {tr.ret.mean() * 100:+.3f}% / trade, win {(tr.ret > 0).mean():.0%}, "
          f"net on $100 at ${notional:.0f}/trade: ${tr.ret.sum() * notional:+.2f}")
    for s in ("dev 60%", "val 20%", "oos 20%"):
        r = tr.ret[seg == s]
        print(f"  {s}: {len(r)} trades, avg {r.mean() * 100:+.3f}%, net ${r.sum() * notional:+.2f}")
    print("  exits:", tr["exit"].value_counts().to_dict())
    if "regime" in tr:
        for g, r in tr.groupby("regime"):
            print(f"  {g}: {len(r)} trades, avg {r.ret.mean() * 100:+.3f}%, win {(r.ret > 0).mean():.0%}")


def main() -> None:
    source = sys.argv[1] if len(sys.argv) > 1 else "binance"
    cfg = load_config()
    db = Database(cfg.db_path)
    fp = FillParams(cfg.fees.taker, cfg.fees.maker, SLIP, 0.0)
    report(f"EXP-010 Hurst ({source} 4h)", run_hurst(frames(db, source, "4h"), fp), 100 / 6)
    report(f"EXP-009 mean reversion ({source} 1h)", run_meanrev(frames(db, source, "1h"), fp), 100 / 5)


if __name__ == "__main__":
    main()
