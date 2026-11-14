"""Copy-trading paper book: mirrors leader weights with caps, stops and exits."""
from app.backtest.simulator import FillParams
from app.copy_book import GROSS_CAP, CopyBook
from app.storage.models import MarketInfo

PX = {"BTC": 100_000.0, "ETH": 3_000.0, "SOL": 150.0, "DOGE": 0.2}


def make(cfg, db, weights):
    b = CopyBook.__new__(CopyBook)
    CopyBook.__init__(b, cfg, db, info=None, fp=FillParams(cfg.fees.taker, cfg.fees.maker, 0.0005, 0.0))
    b.quote = lambda c: (PX[c], PX[c]) if c in PX else None
    b.ex.quote_fn = b.quote
    b.infos.update({"BTC": MarketInfo("BTC", 5, 40, 10.0, 0.0, True), "ETH": MarketInfo("ETH", 4, 25, 10.0, 0.0, True),
                    "SOL": MarketInfo("SOL", 2, 20, 10.0, 0.0, True), "DOGE": MarketInfo("DOGE", 0, 10, 10.0, 0.0, True)})
    b.state = {"w": weights}
    b.leader_weights = lambda: (b.state["w"], [])
    return b


def test_mirrors_leaders_with_stops(cfg, db):
    b = make(cfg, db, {"BTC": 0.5, "ETH": -0.3, "DOGE": 0.05})   # DOGE -> $5, below the minimum
    b.step()
    pos = b.ex.get_positions()
    assert set(pos) == {"BTC", "ETH"} and pos["BTC"].size > 0 and pos["ETH"].size < 0
    stops = {o.market: o for o in b.ex.get_open_orders() if o.kind == "stop" and o.reduce_only}
    assert set(stops) == {"BTC", "ETH"}
    assert abs(stops["BTC"].trigger_px - 90_000) < 100 and abs(stops["ETH"].trigger_px - 3_300) < 5


def test_gross_exposure_is_capped(cfg, db):
    b = make(cfg, db, {"BTC": 3.0, "ETH": -2.0, "SOL": 1.0})       # leaders at 6x gross
    b.step()
    gross = sum(abs(p.size) * PX[m] for m, p in b.ex.get_positions().items())
    assert gross <= GROSS_CAP * 100 + 1e-6


def test_closes_when_leaders_exit_and_flips(cfg, db):
    b = make(cfg, db, {"BTC": 0.5, "ETH": 0.3})
    b.step()
    b.state["w"] = {"BTC": 0.5, "ETH": -0.3}                       # ETH flips short
    b.step()
    pos = b.ex.get_positions()
    assert pos["ETH"].size < 0 and pos["BTC"].size > 0
    b.state["w"] = {}                                              # leaders flat
    b.step()
    assert b.ex.get_positions() == {} and b.ex.get_open_orders() == []
    reasons = {t["exit_reason"] for t in db.trades(b.mode, "closed")}
    assert reasons == {"leader_exit"}


def test_small_drift_does_not_trade(cfg, db):
    b = make(cfg, db, {"BTC": 0.5})
    b.step()
    first = b.pm.open_trades()[0]["id"]
    b.state["w"] = {"BTC": 0.6}
    b.step()
    assert b.pm.open_trades()[0]["id"] == first                    # no churn for a 20% change
    b.state["w"] = {"BTC": 1.4}
    b.step()
    assert b.pm.open_trades()[0]["id"] != first                    # >2x off target: rebuilt


def test_waits_with_fewer_than_three_leaders(cfg, db):
    from app.copy_book import CopyBook as CB
    b = CB.__new__(CB)
    CB.__init__(b, cfg, db, info=None, fp=FillParams(cfg.fees.taker, cfg.fees.maker, 0.0005, 0.0))
    db.set_state("wallets:scan", {"copyable": [{"address": "0xa"}, {"address": "0xb"}]})
    assert b.leaders() == [] and db.get_state("copy:leaders") is None
    b.pm.sync = lambda: None
    assert "waiting" in b.step()


def test_dead_leaders_are_dropped_and_refilled(cfg, db):
    b = CopyBook.__new__(CopyBook)
    CopyBook.__init__(b, cfg, db, info=None, fp=FillParams(cfg.fees.taker, cfg.fees.maker, 0.0005, 0.0))
    db.set_state("copy:leaders", {"addresses": ["dead", "ok1", "ok2"], "ts": 1})
    db.set_state("wallets:scan", {"ts": 0, "copyable": [{"address": a} for a in ["ok1", "idle", "new1", "dead", "new2", "new3"]]})
    b._leader_health = lambda a: {"dead": "account $0", "idle": "no perp trades"}.get(a)
    changes = b.refresh_leaders(force=True)
    assert b.leaders() == ["ok1", "ok2", "new1", "new2", "new3"]
    assert any("drop dead" in c for c in changes)
    assert set(db.get_state("copy:dropped")) == {"dead", "idle"}
    assert b.refresh_leaders() == []                      # checked < 1 hour ago: no re-check


def test_keeps_copying_two_leaders_but_not_one(cfg, db):
    b = CopyBook.__new__(CopyBook)
    CopyBook.__init__(b, cfg, db, info=None, fp=FillParams(cfg.fees.taker, cfg.fees.maker, 0.0005, 0.0))
    db.set_state("copy:leaders", {"addresses": ["a", "b"], "ts": 1})
    assert b.leaders() == ["a", "b"]
    db.set_state("copy:leaders", {"addresses": ["a"], "ts": 1})
    assert b.leaders() == []


def test_new_scan_drops_leaders_that_no_longer_pass(cfg, db):
    b = CopyBook.__new__(CopyBook)
    CopyBook.__init__(b, cfg, db, info=None, fp=FillParams(cfg.fees.taker, cfg.fees.maker, 0.0005, 0.0))
    b._leader_health = lambda a: None
    db.set_state("copy:leaders", {"addresses": ["keep", "loser"], "ts": 1, "scan_ts": 100})
    db.set_state("copy:dropped", {"comeback": {"ts": 1, "reason": "old"}})
    db.set_state("wallets:scan", {"ts": 50, "analysed": 300, "copyable": [{"address": "keep"}]})
    b.refresh_leaders(force=True)
    assert b.leaders() == ["keep", "loser"]               # scan older than last applied: ignored
    db.set_state("wallets:scan", {"ts": 200, "analysed": 300,
                                  "copyable": [{"address": a} for a in ["keep", "fresh", "comeback"]]})
    b.refresh_leaders(force=True)
    assert b.leaders() == ["keep", "fresh", "comeback"]
    assert "passes the leaderboard scan" in db.get_state("copy:dropped")["loser"]["reason"]
    db.set_state("wallets:scan", {"ts": 300, "analysed": 3, "copyable": []})   # broken scan
    b.refresh_leaders(force=True)
    assert b.leaders() == ["keep", "fresh", "comeback"]
