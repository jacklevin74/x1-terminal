"""EXP-024 fast trend: signal rules, trailing maths, and the paper book end to end."""
import time

import numpy as np

import app.fast_trend as ft
from app.backtest.simulator import FillParams
from app.lab_books import FastTrendBook
from app.storage.models import MarketInfo

PX = {"BTC": 100.0}


def downtrend_4h(n=220, start=200.0, step=-0.4):
    c = start + step * np.arange(n) + np.sin(np.arange(n)) * 0.5
    return c + 1.0, c - 1.0, c                      # h, l, c


def flat_1h(n=30, px=100.0):
    c = np.full(n, px)
    return c + 0.5, c - 0.5, c


def test_signal_short_breakout_in_downtrend_only():
    h4, l4, c4 = downtrend_4h()
    h1, l1, c1 = flat_1h()
    assert ft.signal(h1, l1, c1, h4, l4, c4) is None                       # no breakout yet
    c1b = c1.copy(); c1b[-1] = 98.0                                       # closes under the 24h low
    sig = ft.signal(h1, l1, c1b, h4, l4, c4)
    assert sig and not sig.long and sig.stop_dist == ft.STOP_ATR * sig.atr
    c1u = c1.copy(); c1u[-1] = 102.0                                      # upside breakout against the trend
    assert ft.signal(h1, l1, c1u, h4, l4, c4) is None
    assert ft.trend_still_aligned(c4, long=False) and not ft.trend_still_aligned(c4, long=True)


def test_trail_waits_for_1r_and_only_tightens():
    # short from 100, 1R = 5, ATR 2 -> trail distance 6
    assert ft.trail_stop(False, 100, 105, 97, 2.0, 5.0) == 105            # +3 < 1R: unchanged
    assert ft.trail_stop(False, 100, 105, 94, 2.0, 5.0) == 100            # 94 + 6
    assert ft.trail_stop(False, 100, 100, 95, 2.0, 5.0) == 100            # never loosens


def test_backtest_has_costs_and_no_same_bar_fill():
    n = 2000
    t1 = np.arange(n) * ft.HOUR
    c = 100 + np.cumsum(np.random.default_rng(1).normal(0, 0.5, n))
    one = {"t": t1, "o": c, "h": c + 0.3, "l": c - 0.3, "c": c}
    idx = np.arange(0, n, 4)
    four = {"t": t1[idx], "o": c[idx], "h": np.maximum.reduceat(c + 0.3, idx), "l": np.minimum.reduceat(c - 0.3, idx),
            "c": c[np.minimum(idx + 3, n - 1)]}
    free, costly = ft.backtest(one, four, 0.0), ft.backtest(one, four, 0.001)
    assert free and len(free) == len(costly)
    assert all(abs((a["ret"] - b["ret"]) - 0.002) < 1e-12 for a, b in zip(free, costly))
    assert all(x["exit_t"] > x["t"] for x in free)


def book(cfg, db):
    b = FastTrendBook(cfg, db, info=None, fp=FillParams(cfg.fees.taker, cfg.fees.maker, 0.0005, 0.0), coins=["BTC"])
    b.quote = lambda c: (PX[c] - 0.01, PX[c] + 0.01) if c in PX else None
    b.ex.quote_fn = b.quote
    b.ex.depth_fn = lambda c: ([(b.quote(c)[0], 1e9)], [(b.quote(c)[1], 1e9)])
    b.infos.update({"BTC": MarketInfo("BTC", 5, 40, 10.0, 0.0, True)})
    return b


def rows(h, l, c):
    return [{"h": a, "l": b_, "c": d} for a, b_, d in zip(h, l, c)]


def test_book_opens_trails_and_labels_trail_stop(cfg, db):
    PX["BTC"] = 98.0
    b = book(cfg, db)
    h4, l4, c4 = downtrend_4h()
    h1, l1, c1 = flat_1h()
    c1[-1] = 98.0
    b.candles = lambda coin, iv, n: rows(h4, l4, c4) if iv == "4h" else rows(h1, l1, c1)
    acts = b.step()
    assert acts and "short" in acts[0]
    t = b.pm.open_trades()[0]
    e = b._state("exits")[str(t["id"])]
    assert t["direction"] == "short" and abs(t["stop"] - (t["entry"] + e["dist"])) < 0.01
    assert t["size"] * t["entry"] <= 100.0 + 1e-6                          # notional capped at 1x equity
    PX["BTC"] = t["entry"] - 2 * e["dist"]                                 # +2R: trail engages
    b.poll()
    t2 = b.pm.open_trades()[0]
    assert t2["stop"] < t["stop"]
    PX["BTC"] = t2["stop"] + 1.0                                           # bounces through the trailed stop
    b.poll()
    b.poll()
    closed = db.trades(b.mode, "closed")
    assert closed and closed[0]["exit_reason"] == "trail_stop" and closed[0]["net_pnl"] > 0
    b.step()                                                               # breakout still there, but ...
    assert not b.pm.open_trades()                                          # ... 4h cooldown blocks re-entry
    PX["BTC"] = 100.0


def test_book_exits_when_4h_trend_turns(cfg, db):
    PX["BTC"] = 98.0
    b = book(cfg, db)
    h4, l4, c4 = downtrend_4h()
    h1, l1, c1 = flat_1h()
    c1[-1] = 98.0
    b.candles = lambda coin, iv, n: rows(h4, l4, c4) if iv == "4h" else rows(h1, l1, c1)
    b.step()
    assert b.pm.open_trades()
    up = np.concatenate([c4, c4[-1] + 3.0 * np.arange(1, 40)])            # sharp rally: EMA20 back over EMA50
    b.candles = lambda coin, iv, n: rows(up + 1, up - 1, up) if iv == "4h" else rows(h1, l1, c1)
    acts = b.step()
    assert any("trend turned" in a for a in acts)
    assert db.trades(b.mode, "closed")[0]["exit_reason"] == "trend_exit"
    PX["BTC"] = 100.0
