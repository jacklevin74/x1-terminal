"""Hyperliquid TESTNET execution adapter (official Python SDK).

v1 scope: testnet only. The constructor refuses any URL other than the testnet
endpoint, independently of configuration, so this module cannot place mainnet
orders. A mainnet adapter is a separately reviewed future module.

Credentials: a dedicated *agent* wallet approved by the account owner on
https://app.hyperliquid-testnet.xyz/API. Agent wallets can trade but cannot
withdraw. Its private key is read from a file outside the repo (chmod 600),
never from config, prompts or logs. No transfer/withdraw method is exposed.
"""
from __future__ import annotations

import json
import logging
import os
import stat
from pathlib import Path
from typing import Any

from app.config import HL_MAINNET_URL, HL_TESTNET_URL
from app.data.market_metadata import round_price
from app.execution.adapter import (ExchangeAdapter, ExchangeOrder, ExchangePosition, Fill, OrderAck)

log = logging.getLogger(__name__)


class TestnetOnlyError(RuntimeError):
    __test__ = False   # not a pytest test class


def load_agent_key(path: str) -> str:
    p = Path(path).expanduser()
    mode = p.stat().st_mode
    if mode & (stat.S_IRWXG | stat.S_IRWXO):
        raise PermissionError(f"{p} must not be readable by group/others (chmod 600)")
    raw = p.read_text().strip()
    if raw.startswith("{"):
        raw = json.loads(raw)["private_key"]
    return raw if raw.startswith("0x") else "0x" + raw


def parse_order_response(resp: Any) -> OrderAck:
    """Hyperliquid exchange responses -> OrderAck. Shape:
    {"status":"ok","response":{"type":"order","data":{"statuses":[{"filled":{...}}|{"resting":{...}}|{"error":"..."}]}}}
    """
    if not isinstance(resp, dict) or resp.get("status") != "ok":
        return OrderAck("error", error=str(resp), raw=resp)
    try:
        st = resp["response"]["data"]["statuses"][0]
    except (KeyError, IndexError, TypeError):
        return OrderAck("error", error=f"unexpected response shape: {resp}", raw=resp)
    if "filled" in st:
        f = st["filled"]
        return OrderAck("filled", oid=int(f["oid"]), filled_size=float(f["totalSz"]), avg_px=float(f["avgPx"]),
                        raw=resp)
    if "resting" in st:
        return OrderAck("resting", oid=int(st["resting"]["oid"]), raw=resp)
    if "error" in st:
        return OrderAck("rejected", error=st["error"], raw=resp)
    return OrderAck("error", error=f"unknown status {st}", raw=resp)


class HyperliquidTestnetAdapter(ExchangeAdapter):
    mode = "testnet"
    supports_protective_orders = True

    def __init__(self, account_address: str, agent_key_file: str, markets: tuple[str, ...], leverage: int,
                 sz_decimals: dict[str, int], base_url: str = HL_TESTNET_URL):
        if base_url.rstrip("/") != HL_TESTNET_URL or base_url.rstrip("/") == HL_MAINNET_URL:
            raise TestnetOnlyError("v1 execution adapter is testnet-only; mainnet is not implemented")
        if os.environ.get("HL_ALLOW_MAINNET"):
            raise TestnetOnlyError("HL_ALLOW_MAINNET has no effect in v1")
        from eth_account import Account
        from hyperliquid.exchange import Exchange
        from hyperliquid.info import Info
        from hyperliquid.utils.types import Cloid

        self._Cloid = Cloid
        self.address = account_address
        self.sz_decimals = sz_decimals
        wallet = Account.from_key(load_agent_key(agent_key_file))
        self.info = Info(base_url, skip_ws=True)
        self.exchange = Exchange(wallet, base_url, account_address=account_address)
        for m in markets:
            r = self.exchange.update_leverage(leverage, m, is_cross=False)
            if not (isinstance(r, dict) and r.get("status") == "ok"):
                raise RuntimeError(f"could not set isolated {leverage}x leverage on {m}: {r}")

    def _cloid(self, c: str):
        return self._Cloid.from_str(c)

    # -- reads ------------------------------------------------------------
    def get_equity(self) -> float:
        st = self.info.user_state(self.address)
        return float(st["marginSummary"]["accountValue"])

    def get_positions(self) -> dict[str, ExchangePosition]:
        st = self.info.user_state(self.address)
        out = {}
        for ap in st.get("assetPositions", []):
            p = ap["position"]
            sz = float(p["szi"])
            if abs(sz) > 0:
                out[p["coin"]] = ExchangePosition(p["coin"], sz, float(p["entryPx"]))
        return out

    def get_open_orders(self) -> list[ExchangeOrder]:
        out = []
        for o in self.info.frontend_open_orders(self.address):
            is_trigger = bool(o.get("isTrigger"))
            kind = "stop" if is_trigger and "Stop" in o.get("orderType", "") else (
                "take_profit" if o.get("reduceOnly") else "limit")
            out.append(ExchangeOrder(o.get("cloid"), int(o["oid"]), o["coin"], o["side"] == "B", float(o["sz"]),
                                     float(o["limitPx"]) if o.get("limitPx") else None,
                                     float(o["triggerPx"]) if is_trigger and o.get("triggerPx") else None,
                                     bool(o.get("reduceOnly")), kind))
        return out

    def get_fills(self, since_ms: int) -> list[Fill]:
        out = []
        for f in self.info.user_fills(self.address):
            if int(f["time"]) < since_ms:
                continue
            out.append(Fill(f.get("cloid"), int(f["oid"]), f["coin"], f["side"] == "B", float(f["sz"]),
                            float(f["px"]), float(f.get("fee", 0)), int(f["time"]), {"dir": f.get("dir")}))
        return out

    # -- orders -----------------------------------------------------------
    def place_entry(self, market: str, is_buy: bool, size: float, limit_px: float, cloid: str) -> OrderAck:
        r = self.exchange.order(market, is_buy, size, limit_px, {"limit": {"tif": "Ioc"}},
                                reduce_only=False, cloid=self._cloid(cloid))
        return parse_order_response(r)

    def place_stop(self, market: str, is_buy: bool, size: float, trigger_px: float, cloid: str) -> OrderAck:
        # Stop-market: limit_px is the worst acceptable price once triggered (10% through the trigger).
        worst = round_price(trigger_px * (1.1 if is_buy else 0.9), self.sz_decimals[market])
        r = self.exchange.order(market, is_buy, size, worst,
                                {"trigger": {"triggerPx": trigger_px, "isMarket": True, "tpsl": "sl"}},
                                reduce_only=True, cloid=self._cloid(cloid))
        return parse_order_response(r)

    def place_take_profit(self, market: str, is_buy: bool, size: float, limit_px: float, cloid: str) -> OrderAck:
        r = self.exchange.order(market, is_buy, size, limit_px, {"limit": {"tif": "Gtc"}},
                                reduce_only=True, cloid=self._cloid(cloid))
        return parse_order_response(r)

    def cancel(self, market: str, cloid: str) -> bool:
        r = self.exchange.cancel_by_cloid(market, self._cloid(cloid))
        return isinstance(r, dict) and r.get("status") == "ok"

    def close_position(self, market: str, cloid: str) -> OrderAck:
        r = self.exchange.market_close(market, slippage=0.02, cloid=self._cloid(cloid))
        return parse_order_response(r)
