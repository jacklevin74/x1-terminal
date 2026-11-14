import pytest

from app.backtest.performance import max_consecutive_losses, max_drawdown, summarize
from app.backtest.simulator import (SimPosition, check_bar_exit, check_quote_exit, entry_price_from_open,
                                    funding_payment, gross_pnl)
from app.data.market_metadata import parse_markets, round_price, round_size_down
from app.risk.position_sizing import CostModel


def pos(direction="long", entry=100.0, stop=98.0, target=104.0, size=1.0):
    return SimPosition("BTC", direction, size, entry, stop, target, 0, 2.0)


def test_round_trip_cost():
    c = CostModel(fee_rate=0.00045, slippage=0.0005, funding_per_hour=0.0000125, funding_hours=72)
    assert c.round_trip_cost_pct == pytest.approx(2 * 0.00045 + 2 * 0.0005 + 0.0009)


def test_entry_pays_spread_and_slippage(fp):
    assert entry_price_from_open(100, "long", fp) == pytest.approx(100 * (1 + fp.slippage))
    assert entry_price_from_open(100, "short", fp) == pytest.approx(100 * (1 - fp.slippage))


def test_stop_is_taker_with_slippage(fp):
    ex = check_bar_exit(pos(), o=100, h=101, l=97, fp=fp)
    assert ex.reason == "stop" and ex.price == pytest.approx(98 * (1 - fp.slippage))
    assert ex.fee == pytest.approx(ex.price * fp.taker_fee)


def test_gap_through_stop_fills_at_open(fp):
    ex = check_bar_exit(pos(), o=96, h=97, l=95, fp=fp)
    assert ex.price == pytest.approx(96 * (1 - fp.slippage))


def test_target_is_maker_and_needs_trade_through(fp):
    assert check_bar_exit(pos(), o=100, h=104, l=99, fp=fp) is None      # touch only: no fill
    ex = check_bar_exit(pos(), o=100, h=104.5, l=99, fp=fp)
    assert ex.reason == "target" and ex.price == 104 and ex.fee == pytest.approx(104 * fp.maker_fee)


def test_stop_assumed_first_when_both_in_range(fp):
    assert check_bar_exit(pos(), o=100, h=105, l=97, fp=fp).reason == "stop"


def test_short_exits(fp):
    p = pos("short", stop=102, target=96)
    assert check_bar_exit(p, o=100, h=102.5, l=99, fp=fp).reason == "stop"
    assert check_bar_exit(p, o=100, h=101, l=95.9, fp=fp).reason == "target"
    assert check_quote_exit(p, bid=102.1, ask=102.2, fp=fp).reason == "stop"


def test_funding_sign():
    assert funding_payment(pos("long"), 100, 0.0001) == pytest.approx(0.01)     # longs pay positive funding
    assert funding_payment(pos("short"), 100, 0.0001) == pytest.approx(-0.01)   # shorts receive it


def test_gross_pnl():
    assert gross_pnl(pos("long", entry=100), 110) == 10
    assert gross_pnl(pos("short", entry=100), 110) == -10


def test_summary_net_of_costs():
    trades = [{"net_pnl": 1.0, "r_multiple": 2.0, "fees": 0.1, "funding": 0.05, "exit_reason": "target"},
              {"net_pnl": -0.5, "r_multiple": -1.0, "fees": 0.1, "funding": 0.0, "exit_reason": "stop"},
              {"net_pnl": -0.5, "r_multiple": -1.0, "fees": 0.1, "funding": 0.0, "exit_reason": "stop"}]
    s = summarize(trades, 100)
    assert s["expectancy_usd"] == pytest.approx(0.0)
    assert s["profit_factor"] == pytest.approx(1.0)
    assert s["total_fees"] == pytest.approx(0.3)
    assert s["max_consecutive_losses"] == 2


def test_drawdown():
    assert max_drawdown([100, 110, 99, 120]) == (11, pytest.approx(0.1))
    assert max_consecutive_losses([1, -1, -1, 2, -1]) == 2


# -- exchange precision / minimums -----------------------------------------
def test_size_rounding_never_rounds_up():
    assert round_size_down(0.123456789, 5) == 0.12345
    assert round_size_down(0.00001999, 5) == 0.00001


def test_price_rounding_rules():
    assert round_price(100123.7, 5) == 100124          # integers always allowed, 5+ digits
    assert round_price(3456.789, 4) == 3456.8          # 5 significant figures
    assert round_price(3456.789, 4, "down") == 3456.7
    assert round_price(1.234567, 2) == 1.2346          # max decimals = 6 - szDecimals = 4


def test_metadata_parsing_and_verification():
    meta = {"universe": [{"name": "BTC", "szDecimals": 5, "maxLeverage": 40},
                         {"name": "ETH", "szDecimals": 4, "maxLeverage": 25}]}
    ctxs = [{"funding": "0.0000125"}, {"funding": "-0.00001"}]
    m = parse_markets(meta, ctxs, ("BTC", "ETH"))
    assert m["BTC"].verified and m["BTC"].maintenance_margin_rate == pytest.approx(1 / 80)
    assert m["ETH"].funding_rate_hourly == pytest.approx(-0.00001)
    with pytest.raises(ValueError):
        parse_markets(meta, ctxs[:1], ("BTC", "ETH"))
    with pytest.raises(ValueError):
        parse_markets({"universe": [{"name": "BTC", "szDecimals": 5, "maxLeverage": 40, "isDelisted": True},
                                    meta["universe"][1]]}, ctxs, ("BTC", "ETH"))
