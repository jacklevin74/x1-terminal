"""EXP-009..012: OU fit + Monte Carlo exits, Hurst, luck check, maker entries, new books, market maker."""
import math
import time

import numpy as np

from app.backtest.simulator import FillParams
from app.lab_books import MeanRevBook, PaperBook
from app.lab_mm import MarketMaker
from app.montecarlo import fit_ou, hurst, mc_levels, sign_flip_pvalue
from app.storage.models import MarketInfo


def ou_path(n=3000, b=0.95, sd=0.01, seed=1):
    rng = np.random.default_rng(seed)
    x = np.zeros(n)
    for i in range(1, n):
        x[i] = b * x[i - 1] + rng.normal(0, sd)
    return x


def test_fit_ou_recovers_half_life():
    ou = fit_ou(ou_path())
    assert abs(ou.b - 0.95) < 0.02
    assert 10 < ou.half_life < 17                       # true: ln2 / -ln 0.95 = 13.5 bars
    assert fit_ou(np.cumsum(np.ones(200))) is None      # trending line: not mean-reverting


def test_mc_levels_needs_positive_edge():
    ou = fit_ou(ou_path())
    lv = mc_levels(ou, 2.5, cost_tp=0.0003, cost_stop=0.0016, cost_time=0.0016)
    assert lv is not None and lv.ev > 0 and lv.tp_z < 2.5 < lv.stop_z and 0 < lv.p_tp <= 1
    assert mc_levels(ou, 2.5, cost_tp=1.0, cost_stop=1.0, cost_time=1.0) is None   # costs kill it
    assert mc_levels(ou, -2.5, 0.0003, 0.0016, 0.0016) is not None                 # symmetric long side


def test_hurst_tells_trend_from_reversion():
    rng = np.random.default_rng(2)
    walk = np.cumsum(rng.normal(0, 0.01, 2000))
    assert 0.42 < hurst(walk) < 0.58
    trend = np.cumsum(np.convolve(rng.normal(0, 0.01, 2100), np.ones(20) / 20, "valid")[:2000])
    assert hurst(trend) > 0.6
    assert hurst(ou_path(2000, b=0.5)) < 0.3


def test_luck_check():
    assert sign_flip_pvalue([1.0] * 5, [0.0] * 5) is None                  # too few trades
    assert sign_flip_pvalue([1.0] * 20, [0.0] * 20) < 0.001                 # every call right
    rng = np.random.default_rng(3)
    g = list(rng.normal(0, 1, 40))
    assert 0.02 < sign_flip_pvalue(g, [0.01] * 40) < 0.98


PX = {"SOL": 150.0}


def book(cfg, db, cls=MeanRevBook):
    b = cls(cfg, db, info=None, fp=FillParams(cfg.fees.taker, cfg.fees.maker, 0.0005, 0.0), coins=["SOL"])
    b.quote = lambda c: (PX[c] - 0.01, PX[c] + 0.01) if c in PX else None
    b.ex.quote_fn = b.quote
    b.ex.depth_fn = lambda c: ([(b.quote(c)[0], 1e9)], [(b.quote(c)[1], 1e9)])
    b.infos.update({"SOL": MarketInfo("SOL", 2, 20, 10.0, 0.0, True)})
    return b


def test_maker_entry_fills_only_after_trade_through(cfg, db):
    PX["SOL"] = 150.0
    b = book(cfg, db)
    now = int(time.time() * 1000)
    b._set("pending", {"SOL": {"long": True, "px": 149.0, "stop": 140.0, "target": 155.0, "expires": now + 3_600_000,
                               "deadline": now + 3_600_000, "meta": {}}})
    b.poll()
    assert not b.ex.get_positions()                      # ask 150.01 > 149: not filled
    PX["SOL"] = 148.0                                    # ask 148.01 < 149: traded through
    b.poll()
    t = b.pm.open_trades()[0]
    assert t["entry"] == 149.0 and t["direction"] == "long"
    fills = b.ex.get_fills(0)
    assert abs(fills[0].fee - 149.0 * fills[0].size * cfg.fees.maker) < 1e-9     # maker fee
    kinds = {o.kind for o in b.ex.get_open_orders()}
    assert kinds == {"stop", "take_profit"}
    PX["SOL"] = 155.5                                    # bid trades through the 155 target
    b.poll()
    closed = db.trades(b.mode, "closed")
    assert closed and closed[0]["exit_reason"] == "target" and closed[0]["net_pnl"] > 0
    PX["SOL"] = 150.0


def test_pending_expires_and_time_stop(cfg, db):
    PX["SOL"] = 150.0
    b = book(cfg, db)
    now = int(time.time() * 1000)
    b._set("pending", {"SOL": {"long": False, "px": 151.0, "stop": 160.0, "target": 145.0, "expires": now - 1,
                               "deadline": now, "meta": {}}})
    b.poll()
    assert b._state("pending") == {} and not b.ex.get_positions()
    assert b.open("SOL", False, 150.0, 160.0, 145.0, now - 1, {}, maker=False)
    b.poll()                                             # deadline passed -> time stop
    closed = db.trades(b.mode, "closed")
    assert closed and closed[0]["exit_reason"] == "time"


class Q:
    def __init__(self, bid, ask):
        self.bid, self.ask, self.received_at = bid, ask, time.time()

    @property
    def age(self):
        return 0.0


class Feed:
    def __init__(self):
        self.q = {"BTC": Q(99_999, 100_001), "ETH": Q(2_999.9, 3_000.1)}

    def quote(self, c):
        return self.q.get(c)


def test_market_maker_fills_skews_and_kills(cfg, db):
    f = Feed()
    mm = MarketMaker(db, f, cfg.fees.maker, cfg.fees.taker, 100.0)
    t = 1_000.0
    for k in range(5):                                   # warm up volatility
        f.q["BTC"] = Q(99_999 + k, 100_001 + k)
        mm.step(t + 2 * k)
    bid0 = mm.quotes["BTC"]["bid"]
    assert bid0 < 100_005 < mm.quotes["BTC"]["ask"]
    f.q["BTC"] = Q(bid0 - 30, bid0 - 10)                 # market trades down through our bid
    mm.step(t + 20)
    assert mm.st["inv"]["BTC"] > 0 and mm.st["fills"] == 1
    mid = bid0 - 20
    assert mm.quotes["BTC"]["ask"] - mid < mid - mm.quotes["BTC"]["bid"]      # long: quotes lean lower
    f.q["BTC"] = Q(50_000, 50_002)                       # crash halves the $12 clip ...
    mm.st["cash"] -= 10                                  # ... plus earlier losses: equity < $85
    mm.step(t + 22)
    assert mm.st["stopped"] and mm.st["inv"]["BTC"] == 0 and not mm.quotes


def test_paperbook_is_shared_base():
    assert issubclass(MeanRevBook, PaperBook) and math.isfinite(MeanRevBook.max_positions)


def test_funding_targets_rank():
    from app.lab_books import funding_targets
    mf = {c: i * 1e-5 for i, c in enumerate("ABCDEFGHIJKL")}
    w = funding_targets(mf)
    assert [c for c, lg in w.items() if lg] == list("ABCDE")          # lowest funding: long
    assert sorted(c for c, lg in w.items() if not lg) == list("HIJKL")  # highest: short
    assert funding_targets({"A": 0.1}) == {}


def test_funding_book_rebalances(cfg, db):
    from app.lab_books import FundingBook
    coins = list("ABCDEFGHIJKL")
    b = FundingBook(cfg, db, info=None, fp=FillParams(cfg.fees.taker, cfg.fees.maker, 0.0005, 0.0), coins=coins)
    b.quote = lambda c: (9.99, 10.01)
    b.ex.quote_fn = b.quote
    b.ex.depth_fn = lambda c: ([(b.quote(c)[0], 1e9)], [(b.quote(c)[1], 1e9)])
    b.infos.update({c: MarketInfo(c, 1, 10, 10.0, 0.0, True) for c in coins})
    rates = {c: i * 1e-5 for i, c in enumerate(coins)}

    class Info:
        def funding_history(self, c, start):
            return [(k, rates[c]) for k in range(72)]
    b.info = Info()
    b.step()
    pos = b.ex.get_positions()
    assert len(pos) == 10 and all(p.size * 10 >= 10 for m, p in pos.items() if p.size > 0)
    assert pos["A"].size > 0 and pos["L"].size < 0 and "F" not in pos
    assert b.step() == []                                  # not due again for 3 days
    rates["A"], rates["F"] = 1.0, -1.0                     # A now most crowded long, F most negative
    acts = b.step(force=True)
    pos = b.ex.get_positions()
    assert pos["A"].size < 0 and pos["F"].size > 0 and any("close A" in a for a in acts)
