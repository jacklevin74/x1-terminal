"""The live momentum paper book: rebalance logic against a fake feed and stored daily candles."""
from types import SimpleNamespace

import numpy as np

from app.backtest.simulator import FillParams
from app.lab_xs import MomentumBook
from app.storage.database import now_ms
from app.storage.models import MarketInfo

DAY = 86_400_000


class FakeFeed:
    def __init__(self, px):
        self.px = px

    def quote(self, m):
        p = self.px.get(m)
        return SimpleNamespace(bid=p, ask=p, age=1.0) if p else None

    raw_quote = quote


def setup_book(cfg, db, n=18):
    coins = [f"C{k}" for k in range(n)]
    today = now_ms() // DAY * DAY
    px = {}
    for k, c in enumerate(coins):
        drift = (k - n / 2) * 0.004                   # C17 strongest, C0 weakest
        closes = 100 * np.exp(drift * np.arange(80))
        rows = [{"t": today - (80 - i) * DAY, "close_t": today - (79 - i) * DAY, "o": v, "h": v * 1.01,
                 "l": v * 0.99, "c": v, "v": 1.0} for i, v in enumerate(closes)]
        db.upsert_candles("hyperliquid", c, "1d", rows)
        px[c] = float(closes[-1])
    book = MomentumBook(cfg, db, info=None, feed=FakeFeed(px), coins=coins,
                        fp=FillParams(cfg.fees.taker, cfg.fees.maker, 0.0005, 0.0))
    book.refresh_metadata = lambda: book.infos.update({c: MarketInfo(c, 3, 10, 10.0, 0.0, True) for c in coins})
    book.refresh_metadata()
    return book, coins


def test_rebalance_opens_three_longs_three_shorts_with_stops(cfg, db):
    book, coins = setup_book(cfg, db)
    s = book.rebalance()
    assert set(s["longs"]) == {"C17", "C16", "C15"} and set(s["shorts"]) == {"C0", "C1", "C2"}
    pos = book.ex.get_positions()
    assert {m for m, p in pos.items() if p.size > 0} == {"C17", "C16", "C15"}
    assert {m for m, p in pos.items() if p.size < 0} == {"C0", "C1", "C2"}
    stops = {o.market for o in book.ex.get_open_orders() if o.kind == "stop" and o.reduce_only}
    assert stops == set(pos)
    gross = sum(abs(p.size) * p.entry_px for p in pos.values())
    assert gross <= 100 * 1.0 + 1e-6


def test_rebalance_keeps_unchanged_legs_and_rotates_others(cfg, db):
    book, coins = setup_book(cfg, db)
    book.rebalance()
    first_ids = {t["market"]: t["id"] for t in book.pm.open_trades()}
    # C14 overtakes C15: change its recent closes so its 28-day return jumps
    today = now_ms() // DAY * DAY
    db.upsert_candles("hyperliquid", "C14", "1d", [{"t": today - DAY, "close_t": today, "o": 5000, "h": 5050,
                                                    "l": 4950, "c": 5000, "v": 1}])
    book.feed.px["C14"] = 5000.0
    s = book.rebalance()
    after = {t["market"]: t["id"] for t in book.pm.open_trades()}
    assert "C14" in after and "C15" not in after
    assert after["C17"] == first_ids["C17"] and after["C0"] == first_ids["C0"]   # untouched positions kept
    closed = [t for t in db.trades(book.mode, "closed")]
    assert [t["market"] for t in closed] == ["C15"] and closed[0]["exit_reason"] == "rebalance"


def test_halted_book_does_not_trade(cfg, db):
    book, _ = setup_book(cfg, db)
    book.breaker.trip("test")
    assert book.rebalance() == {"skipped": "halted"} and book.ex.get_positions() == {}
