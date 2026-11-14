"""Safety guarantees that must hold regardless of configuration."""
import inspect
from pathlib import Path

import pytest
import yaml

from app.config import ConfigError, load_config
from app.execution import hyperliquid_client
from app.execution.hyperliquid_client import (HyperliquidTestnetAdapter, TestnetOnlyError, load_agent_key,
                                              parse_order_response)
from app.monitoring.alerts import Notifier

ROOT = Path(__file__).resolve().parent.parent


def write_cfg(tmp_path, **overrides):
    raw = yaml.safe_load((ROOT / "config.yaml").read_text())
    for dotted, v in overrides.items():
        sect, key = dotted.split(".")
        raw[sect][key] = v
    p = tmp_path / "c.yaml"
    p.write_text(yaml.safe_dump(raw))
    return p


@pytest.mark.parametrize("override", [
    {"trading.max_leverage": 5}, {"trading.mode": "mainnet"}, {"safety.live_trading_enabled": True},
    {"safety.withdrawals_enabled": True}, {"risk.risk_per_trade": 0.05}, {"trading.allowed_assets": ["BTC", "PEPE"]},
    {"trading.margin_mode": "cross"}, {"execution.require_protective_stop": False},
    {"safety.automatic_leverage_increases": True}, {"trading.max_open_positions": 4},
])
def test_config_hard_limits(tmp_path, override):
    with pytest.raises(ConfigError):
        load_config(write_cfg(tmp_path, **override))


def test_default_config_is_paper_and_disabled():
    c = load_config(ROOT / "config.yaml")
    assert c.trading.mode == "paper" and not c.safety.live_trading_enabled and not c.safety.withdrawals_enabled


def test_config_is_immutable():
    c = load_config(ROOT / "config.yaml")
    with pytest.raises(Exception):
        c.risk.risk_per_trade = 0.5


def test_adapter_refuses_mainnet():
    with pytest.raises(TestnetOnlyError):
        HyperliquidTestnetAdapter("0x0", "/nonexistent", ("BTC",), 2, {"BTC": 5},
                                  base_url="https://api.hyperliquid.xyz")


def test_no_withdraw_or_transfer_code_paths():
    src = inspect.getsource(hyperliquid_client).lower()
    for word in ("withdraw(", "usd_transfer", "spot_transfer", "usd_class_transfer", "vault_usd_transfer",
                 "send_asset", "approve_agent"):
        assert word not in src


def test_agent_key_file_must_be_private(tmp_path):
    k = tmp_path / "k"
    k.write_text("0x" + "11" * 32)
    k.chmod(0o644)
    with pytest.raises(PermissionError):
        load_agent_key(str(k))
    k.chmod(0o600)
    assert load_agent_key(str(k)).startswith("0x")


def test_parse_order_responses():
    ok = {"status": "ok", "response": {"type": "order", "data": {"statuses": [
        {"filled": {"totalSz": "0.0002", "avgPx": "100000", "oid": 7}}]}}}
    a = parse_order_response(ok)
    assert a.status == "filled" and a.filled_size == 0.0002 and a.oid == 7
    rest = {"status": "ok", "response": {"type": "order", "data": {"statuses": [{"resting": {"oid": 8}}]}}}
    assert parse_order_response(rest).status == "resting"
    err = {"status": "ok", "response": {"type": "order", "data": {"statuses": [{"error": "Insufficient margin"}]}}}
    assert parse_order_response(err).status == "rejected"
    assert parse_order_response({"status": "err", "response": "bad"}).status == "error"
    assert parse_order_response(None).status == "error"


def test_alerts_persist_when_delivery_fails(db, monkeypatch):
    import requests

    def boom(*a, **k):
        raise requests.ConnectionError("telegram down")
    monkeypatch.setattr(requests, "post", boom)
    n = Notifier(db, "paper", "token", "chat", enabled=True)
    n.notify("critical", "test", "position not protected")
    pending = db.pending_alerts()
    assert len(pending) == 1 and pending[0]["attempts"] == 1
    assert "token" not in (pending[0]["last_error"] or "")

    class Ok:
        status_code = 200
    monkeypatch.setattr(requests, "post", lambda *a, **k: Ok())
    assert n.flush() == 1 and db.pending_alerts() == []
