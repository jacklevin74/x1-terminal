"""EXP-016..019: HRP, clustering, expert weights, funding filter, hybrid sizing, IOC-through-book fills."""
import numpy as np

from app.allocators import ExpertWeights, clusters, hrp_weights
from app.backtest.simulator import FillParams
from app.elite import HybridBook, funding_ok, hybrid_ideas, idea_risk
from app.execution.paper_exchange import PaperExchange
from app.storage.models import MarketInfo


def three_groups(seed=0, t=200):
    rng = np.random.default_rng(seed)
    a, b = rng.normal(0, 0.01, t), rng.normal(0, 0.03, t)
    return np.column_stack([a + rng.normal(0, 0.002, t), a + rng.normal(0, 0.002, t),
                            b + rng.normal(0, 0.002, t), rng.normal(0, 0.01, t)])


def test_hrp_weights():
    w = hrp_weights(three_groups())
    assert abs(w.sum() - 1) < 1e-9 and (w > 0).all()
    assert w[2] < w[0] and w[2] < w[3]                 # the high-volatility trader gets least
    assert abs(w[0] - w[1]) < 0.05                     # twins split their cluster's share


def test_clusters():
    cl = clusters(three_groups(), 0.5)
    assert cl[0] == cl[1] and len({cl[0], cl[2], cl[3]}) == 3


def test_expert_weights_learn_sleep_and_penalise_clusters():
    ew = ExpertWeights(["a", "b", "c"], eta=10, alpha=0.0)
    for _ in range(5):
        ew.update({"a": 0.02, "b": -0.02}, awake={"a", "b"})
    assert ew.w["a"] > ew.w["b"]
    assert abs(ew.w["c"] - 1 / 3) < 1e-9               # sleeping expert's weight protected
    eff = ew.effective({"a", "b", "c"}, {"a": 0, "b": 0, "c": 1})
    assert abs(sum(eff.values()) - 1) < 1e-9
    plain = ew.effective({"a", "b", "c"}, {"a": 0, "b": 1, "c": 2})
    assert eff["c"] > plain["c"]                       # a and b share a cluster: c gains relatively


def test_funding_filter():
    assert not funding_ok(0.40, long=True) and funding_ok(0.40, long=False)
    assert not funding_ok(-0.40, long=False) and funding_ok(0.10, True) and funding_ok(None, True)


def test_hybrid_ideas_and_risk():
    ideas = hybrid_ideas([(0.5, 1, {"BTC": 1}), (0.3, 1, {"BTC": 1}), (0.2, 1, {"BTC": -1, "ETH": 1})])
    assert ideas["BTC"]["long"] and abs(ideas["BTC"]["share"] - 0.8) < 1e-9 and ideas["BTC"]["agree"] == 2
    assert idea_risk(0.6, 1.0) == 0.005 and abs(idea_risk(1.0, 1.0) - 0.02) < 1e-12
    assert abs(idea_risk(1.0, 0.5) - 0.01) < 1e-12     # unsynchronised market halves risk


def test_ioc_walks_book_and_respects_limit(db):
    fp = FillParams(0.00045, 0.00015, 0.001, 0.0)
    ex = PaperExchange(db, fp, 100.0, lambda c: (99.0, 100.0), book="ioc",
                       depth_fn=lambda c: ([(99.0, 5.0)], [(100.0, 0.1), (100.02, 0.1), (101.0, 9.0)]))
    ack = ex.place_entry("X", True, 0.3, 100.03, "c1")          # limit 3 ticks through
    assert ack.status == "filled" and abs(ack.filled_size - 0.2) < 1e-12   # partial: 0.2 within limit
    assert abs(ack.avg_px - 100.01) < 1e-9
    ex2 = PaperExchange(db, fp, 100.0, lambda c: (99.0, 100.0), book="ioc2",
                        depth_fn=lambda c: ([(99.0, 5.0)], [(100.5, 1.0)]))
    assert ex2.place_entry("X", True, 0.1, 100.03, "c2").status == "rejected"   # book moved away


PX = {c: 10.0 for c in ["BTC", "ETH", "SOL"]}


def test_hybrid_book_sizes_by_conviction(cfg, db, monkeypatch):
    b = HybridBook(cfg, db, info=None, fp=FillParams(cfg.fees.taker, cfg.fees.maker, 0.0005, 0.0), coins=list(PX))
    b.quote = lambda c: (PX[c], PX[c])
    b.ex.quote_fn = b.quote
    b.ex.depth_fn = lambda c: ([(PX[c], 1e9)], [(PX[c], 1e9)])
    b.infos.update({c: MarketInfo(c, 2, 10, 10.0, 0.0, True) for c in PX})
    b._meta_ts = 1e18                                     # skip metadata refresh
    tr = [{"address": str(i), "alloc": 0.2} for i in range(5)]
    b._set("traders", {"list": tr})
    db.set_state("sync:live", {"series": [[0, 0.8, 0.7, True]]})
    books = {str(i): (1e5, {"BTC": 1.0, **({"ETH": -1.0} if i < 3 else {"ETH": 1.0})}) for i in range(5)}
    import app.elite as E
    monkeypatch.setattr(E, "positions", lambda s, a: books[a])
    monkeypatch.setattr(E.time, "sleep", lambda x: None)
    b.step()
    pos = b.ex.get_positions()
    assert pos["BTC"].size > 0 and "ETH" not in pos      # ETH: 60% agree -> 0.5% risk = $5 < minimum
    assert abs(pos["BTC"].size * 10 - 20) < 0.5          # 100% agreement: 2% risk / 10% stop = $20
