"""Firefly Consensus: order parameter, entry/exit rules, follow vs fade."""
from app.backtest.simulator import FillParams
from app.consensus import ConsensusBook, order_parameter
from app.storage.models import MarketInfo

PX = {"SOL": 150.0, "ETH": 3000.0, "BTC": 100_000.0, "NEAR": 2.0}


def test_order_parameter():
    assert order_parameter([1] * 9 + [-1]) == (10, 9, 1, 0.8, 1)
    assert order_parameter([1, -1, 1, -1]) == (4, 2, 2, 0.0, 0)
    assert order_parameter([-1] * 27 + [1])[3] > 0.9


def book(cfg, db, follow=True):
    b = ConsensusBook(cfg, db, info=None, fp=FillParams(cfg.fees.taker, cfg.fees.maker, 0.0005, 0.0), follow=follow)
    b.quote = lambda c: (PX[c], PX[c]) if c in PX else None
    b.ex.quote_fn = b.quote
    szd = {"SOL": 2, "ETH": 4, "BTC": 5, "NEAR": 1}            # Hyperliquid size decimals
    b.infos.update({c: MarketInfo(c, szd[c], 20, 10.0, 0.0, True) for c in PX})
    return b


def sig(n, longs):
    _, lo, sh, r, side = order_parameter([1] * longs + [-1] * (n - longs))
    return {"n": n, "longs": lo, "shorts": sh, "r": r, "side": side}


def test_enters_only_strong_consensus(cfg, db):
    b = book(cfg, db)
    b.step({"SOL": sig(27, 1), "ETH": sig(57, 3), "NEAR": sig(6, 0), "BTC": sig(64, 17)})
    pos = b.ex.get_positions()
    assert set(pos) == {"SOL", "ETH"}            # NEAR: N < 8; BTC: R = 0.47 < 0.75
    assert pos["SOL"].size < 0 and pos["ETH"].size < 0
    assert all(o.kind == "stop" for o in b.ex.get_open_orders())


def test_fade_takes_the_other_side(cfg, db):
    b = book(cfg, db, follow=False)
    b.step({"SOL": sig(27, 1)})
    assert b.ex.get_positions()["SOL"].size > 0


def test_exits_when_synchrony_breaks_or_flips(cfg, db):
    b = book(cfg, db)
    b.step({"SOL": sig(27, 1), "ETH": sig(57, 3)})
    b.step({"SOL": sig(27, 10), "ETH": sig(57, 3)})       # SOL R falls to 0.26 -> exit; ETH held
    assert set(b.ex.get_positions()) == {"ETH"}
    b.step({"ETH": sig(57, 50)})                          # majority flips long -> exit (re-entry long allowed)
    pos = b.ex.get_positions()
    assert "ETH" in pos and pos["ETH"].size > 0
    assert {t["exit_reason"] for t in db.trades(b.mode, "closed")} == {"signal_exit"}


def test_hold_band_between_exit_and_entry(cfg, db):
    b = book(cfg, db)
    b.step({"SOL": sig(27, 1)})
    first = b.pm.open_trades()[0]["id"]
    b.step({"SOL": sig(27, 6)})                           # R = 0.56: below entry, above exit -> keep
    assert b.pm.open_trades()[0]["id"] == first


def tp_book(cfg, db):
    b = book(cfg, db)
    b2 = ConsensusBook(cfg, db, info=None, fp=FillParams(cfg.fees.taker, cfg.fees.maker, 0.0005, 0.0),
                       follow=True, take_profit=True)
    b2.quote, b2.ex.quote_fn = b.quote, b.quote
    b2.infos.update(b.infos)
    return b2


def test_take_profit_trails_and_locks_gain(cfg, db):
    PX["SOL"] = 150.0
    b = tp_book(cfg, db)
    assert b.mode == "paper-consensus-tp"
    s = {"SOL": sig(27, 1)}                               # strong short consensus
    b.step(s)
    t = b.pm.open_trades()[0]
    assert t["stop"] > 160                                 # initial 10% stop
    PX["SOL"] = 147.0                                      # +2%: not yet active
    b.poll()
    assert b.pm.open_trades()[0]["stop"] == t["stop"]
    PX["SOL"] = 140.0                                      # +6.7%: trail 2% above best
    b.poll()
    assert abs(b.pm.open_trades()[0]["stop"] - 142.8) < 0.1
    PX["SOL"] = 143.0                                      # bounces through the trailed stop
    b.poll()
    closed = db.trades(b.mode, "closed")
    assert len(closed) == 1 and closed[0]["exit_reason"] == "trail_stop" and closed[0]["net_pnl"] > 0
    b.step(s)                                              # crowd still short: no re-entry
    assert not b.ex.get_positions()
    b.step({"SOL": sig(27, 10)})                           # signal breaks -> cooldown released
    b.step(s)                                              # strong again -> re-enter
    assert b.ex.get_positions()["SOL"].size < 0
    PX["SOL"] = 150.0


def test_plain_follow_book_never_trails(cfg, db):
    PX["SOL"] = 150.0
    b = book(cfg, db)
    b.step({"SOL": sig(27, 1)})
    stop = b.pm.open_trades()[0]["stop"]
    PX["SOL"] = 130.0
    b.poll()
    assert b.pm.open_trades()[0]["stop"] == stop
    PX["SOL"] = 150.0
