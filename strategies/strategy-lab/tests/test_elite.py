"""EXP-014 ensemble and EXP-015 weighted portfolio."""
from app.backtest.simulator import FillParams
from app.elite import (WP_COIN_CAP, WP_GROSS_CAP, WP_MAX_ALLOC, EnsembleBook, WeightedBook, allocations,
                       ensemble_votes, pick_diverse, portfolio_targets)
from app.storage.models import MarketInfo


def test_votes_one_per_trader():
    v = ensemble_votes([{"BTC": 5e6, "ETH": -1}, {"BTC": 10}, {"BTC": 3}, {"BTC": -1, "ETH": -2}])
    assert v["BTC"]["longs"] == 3 and v["BTC"]["shorts"] == 1 and v["BTC"]["side"] == 1
    assert v["BTC"]["share"] == 0.75 and v["ETH"]["side"] == -1 and v["ETH"]["agree"] == 2


def test_allocations_inverse_dd_and_capped():
    al = allocations([{"address": "a", "dd": 0.01}, {"address": "b", "dd": 0.2}, {"address": "c", "dd": 0.4},
                      {"address": "d", "dd": 0.4}])
    assert abs(sum(al.values()) - 1) < 1e-9 and max(al.values()) <= WP_MAX_ALLOC + 1e-9
    assert al["a"] >= al["b"] > al["c"] == al["d"]


def test_targets_proportional_with_caps():
    t = portfolio_targets([(0.5, 1000.0, {"BTC": 1000.0, "ETH": -100.0}), (0.5, 1000.0, {"SOL": 5000.0})], 100.0)
    assert t["BTC"] == WP_COIN_CAP * 100            # 0.5 x 100% x $100 = $50 -> capped at $25
    assert t["SOL"] == WP_COIN_CAP * 100            # 0.5 x 500% -> capped
    assert "ETH" not in t                           # 0.5 x -10% x $100 = $5 < $10 minimum
    big = portfolio_targets([(1.0, 100.0, {c: 30.0 for c in "ABCDEFGH"})], 100.0)
    assert sum(abs(v) for v in big.values()) <= WP_GROSS_CAP * 100 + 1e-9


def test_pick_diverse_skips_correlated():
    up = [float(i % 3) for i in range(30)]
    pool = [{"address": "a", "daily": up}, {"address": "b", "daily": up}, {"address": "c", "daily": up[::-1]}]
    assert [p["address"] for p in pick_diverse(pool, 3)] == ["a", "c"]


PX = {c: 10.0 for c in ["BTC", "ETH", "SOL", "XRP"]}


def mk(cls, cfg, db, traders, books, mp):
    b = cls(cfg, db, info=None, fp=FillParams(cfg.fees.taker, cfg.fees.maker, 0.0005, 0.0), coins=list(PX))
    b.quote = lambda c: (PX[c], PX[c]) if c in PX else None
    b.ex.quote_fn = b.quote
    b.ex.depth_fn = lambda c: ([(b.quote(c)[0], 1e9)], [(b.quote(c)[1], 1e9)])
    b.infos.update({c: MarketInfo(c, 2, 10, 10.0, 0.0, True) for c in PX})
    b._set("traders", {"list": traders})
    import app.elite as E
    mp.setattr(E, "positions", lambda s, a: books[a])
    mp.setattr(E.time, "sleep", lambda x: None)
    return b


def test_ensemble_enters_on_agreement_and_exits(cfg, db, monkeypatch):
    tr = [{"address": str(i)} for i in range(6)]
    books = {str(i): (1e5, {"BTC": 1.0} if i < 4 else {"BTC": -1.0, "ETH": 1.0}) for i in range(6)}
    b = mk(EnsembleBook, cfg, db, tr, books, monkeypatch)
    b.step()
    pos = b.ex.get_positions()
    assert set(pos) == {"BTC"} and pos["BTC"].size > 0      # 4L/2S = 67%: in; ETH only 2 votes
    for i in range(2):
        books[str(i)] = (1e5, {})                            # 2L/2S -> share 50%, no majority
    b.step()
    assert not b.ex.get_positions()


def test_weighted_follows_and_kill_switch(cfg, db, monkeypatch):
    tr = [{"address": a, "alloc": 1 / 3} for a in "abc"]
    books = {"a": (1000.0, {"BTC": 600.0}), "b": (1000.0, {"BTC": 600.0}), "c": (1000.0, {"ETH": -900.0})}
    b = mk(WeightedBook, cfg, db, tr, books, monkeypatch)
    b.step()
    pos = b.ex.get_positions()
    assert pos["BTC"].size > 0 and pos["ETH"].size < 0
    books["c"] = (1000.0, {})
    b.step()
    assert "ETH" not in b.ex.get_positions()                 # leader exited
    PX["BTC"] = 2.0                                          # crash: equity < $85
    b.poll()
    b.step()
    assert not b.ex.get_positions() and b._state("kill")["killed"]
    PX["BTC"] = 10.0


def test_weighted_tp_trails_then_cools_down(cfg, db, monkeypatch):
    from app.elite import WeightedTPBook
    PX["BTC"] = 10.0
    tr = [{"address": a, "alloc": 1 / 3} for a in "abc"]
    books = {a: (1000.0, {"BTC": 600.0}) for a in "abc"}
    b = mk(WeightedTPBook, cfg, db, tr, books, monkeypatch)
    b.step()
    assert b.ex.get_positions()["BTC"].size > 0
    PX["BTC"] = 11.0                                       # +10%: trail active, stop -> 10.78
    b.poll()
    assert abs(b.pm.open_trades()[0]["stop"] - 10.78) < 0.01
    PX["BTC"] = 10.7                                       # falls through the trailed stop
    b.poll()
    closed = db.trades(b.mode, "closed")
    assert closed and closed[0]["exit_reason"] == "trail_stop" and closed[0]["net_pnl"] > 0
    b.step()
    assert "BTC" not in b.ex.get_positions()               # leaders still long: cooldown blocks re-entry
    for a in "abc":
        books[a] = (1000.0, {})                            # leaders exit -> cooldown released
    b.step()
    for a in "abc":
        books[a] = (1000.0, {"BTC": 600.0})
    b.step()
    assert b.ex.get_positions()["BTC"].size > 0
    PX["BTC"] = 10.0


def test_plain_weighted_has_no_trailing(cfg, db, monkeypatch):
    PX["BTC"] = 10.0
    tr = [{"address": a, "alloc": 1 / 3} for a in "abc"]
    b = mk(WeightedBook, cfg, db, tr, {a: (1000.0, {"BTC": 600.0}) for a in "abc"}, monkeypatch)
    b.step()
    stop = b.pm.open_trades()[0]["stop"]
    PX["BTC"] = 11.0
    b.poll()
    assert b.pm.open_trades()[0]["stop"] == stop
    PX["BTC"] = 10.0


def test_wide_ensemble_caps_each_cluster(cfg, db):
    import numpy as np
    from app.elite import WideEnsembleBook
    rng = np.random.default_rng(0)
    base = rng.normal(0, 1, 30)
    pool = [{"address": f"same{i}", "score": 10 - i, "dd": 0.1, "account": 1.0,
             "daily": list(base + rng.normal(0, 0.01, 30))} for i in range(5)]
    pool += [{"address": f"own{i}", "score": 1, "dd": 0.1, "account": 1.0, "daily": list(rng.normal(0, 1, 30))}
             for i in range(4)]
    b = WideEnsembleBook(cfg, db, info=None, fp=FillParams(cfg.fees.taker, cfg.fees.maker, 0.0005, 0.0), coins=[])
    picked = [t["address"] for t in b.choose(pool)]
    assert sum(a.startswith("same") for a in picked) == 3 and sum(a.startswith("own") for a in picked) == 4


def test_random_control_is_reproducible(cfg, db, monkeypatch):
    import app.elite as E
    from app.elite import RandomWeightedBook
    src = {"perp_pnl_all": 1e6, "perp_pnl_month": 1, "perp_fills": 100, "last_perp_fill_days": 1,
           "maker_share": 0.1, "fills_per_day": 5, "net_share": 1.0, "gross_lev": 1.0}
    db.set_state("wallets:scan", {"ts": 42, "copyable": [], "rejected": [dict(src, address=f"w{i}") for i in range(20)]})
    monkeypatch.setattr(E, "profile", lambda s, a: {"address": a, "dd": 0.2, "score": 1.0, "account": 1e4, "daily": []})
    monkeypatch.setattr(E.time, "sleep", lambda x: None)
    b = RandomWeightedBook(cfg, db, info=None, fp=FillParams(cfg.fees.taker, cfg.fees.maker, 0.0005, 0.0), coins=[])
    a1 = [t["address"] for t in b.choose([])]
    a2 = [t["address"] for t in b.choose([])]
    assert a1 == a2 and len(a1) == 6 and a1 != [f"w{i}" for i in range(6)]
