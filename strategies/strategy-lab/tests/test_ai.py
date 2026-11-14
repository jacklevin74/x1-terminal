import dataclasses
from types import SimpleNamespace

import pytest

from app.ai.claude_client import AiUnavailable, ClaudeAnalyst, TradeAnalysis
from app.ai.trade_analysis import ai_gate, build_snapshot
from app.storage.models import Direction, Signal
from tests.conftest import account


def sig():
    s = Signal(market="BTC", direction=Direction.LONG, timestamp_ms=1, expires_ms=2, trend="bullish", pullback=True,
               confirmation=True, entry=100, stop=98, target=104, reward_risk=2)
    s.snapshot = {"symbol": "BTC", "timeframes": {}}
    s.checks = {"x": True}
    return s


def analysis(decision="TRADE_CANDIDATE", conf=0.7):
    return TradeAnalysis(decision=decision, confidence=conf, conditions_passed=["a"], conditions_failed=[],
                         invalidation_conditions=["b"], concerns=[], reasoning="ok")


class FakeAnalyst:
    def __init__(self, result=None, exc=None):
        self.result, self.exc, self.calls = result, exc, []

    def analyze(self, snapshot):
        self.calls.append(snapshot)
        if self.exc:
            raise self.exc
        return self.result, {}


def test_trade_candidate_proceeds(cfg):
    g = ai_gate(FakeAnalyst(analysis()), sig(), account(), cfg, "paper")
    assert g.proceed and g.decision == "TRADE_CANDIDATE"


@pytest.mark.parametrize("d", ["NO_TRADE", "INVALID_DATA"])
def test_claude_can_veto(cfg, d):
    assert not ai_gate(FakeAnalyst(analysis(d)), sig(), account(), cfg, "paper").proceed


def test_fails_closed_when_unavailable(cfg):
    g = ai_gate(FakeAnalyst(exc=AiUnavailable("down")), sig(), account(), cfg, "paper")
    assert not g.proceed and g.decision == "AI_UNAVAILABLE"


def test_fails_closed_when_not_configured(cfg):
    assert not ai_gate(None, sig(), account(), cfg, "paper").proceed


def test_rules_only_mode_when_ai_disabled_and_not_required(cfg):
    c = dataclasses.replace(cfg, ai=dataclasses.replace(cfg.ai, enabled=False, required_for_entry=False))
    assert ai_gate(None, sig(), account(), c, "paper").proceed


def test_snapshot_has_no_secrets_or_sizing_controls(cfg):
    snap = build_snapshot(sig(), account(), cfg, "paper")
    text = str(snap).lower()
    for banned in ("api_key", "private", "secret", "seed", "token"):
        assert banned not in text
    assert set(snap["account"]) == {"equity", "risk_budget", "open_positions"}


def test_schema_has_no_size_or_leverage_fields():
    fields = set(TradeAnalysis.model_fields)
    assert not fields & {"size", "leverage", "notional", "risk", "quantity"}


# -- client response handling (SDK mocked) -----------------------------------
def fake_client(resp=None, exc=None):
    def parse(**kw):
        if exc:
            raise exc
        return resp
    return SimpleNamespace(messages=SimpleNamespace(parse=parse))


def resp(stop_reason="end_turn", parsed=None):
    return SimpleNamespace(model="claude-opus-5-5", stop_reason=stop_reason, parsed_output=parsed,
                           usage=SimpleNamespace(input_tokens=1, output_tokens=1))


def analyst_with(client, cfg):
    a = ClaudeAnalyst.__new__(ClaudeAnalyst)
    a.cfg, a.server_fallbacks, a.client = cfg.ai, False, client
    return a


def test_client_returns_parsed(cfg):
    out, meta = analyst_with(fake_client(resp(parsed=analysis())), cfg).analyze({})
    assert out.decision == "TRADE_CANDIDATE" and meta["stop_reason"] == "end_turn"


@pytest.mark.parametrize("r", [resp("refusal", analysis()), resp("max_tokens", analysis()), resp(parsed=None),
                               resp(parsed=analysis(conf=1.5))])
def test_client_bad_responses_raise(cfg, r):
    with pytest.raises(AiUnavailable):
        analyst_with(fake_client(r), cfg).analyze({})


def test_client_api_errors_raise_unavailable(cfg):
    import anthropic
    import httpx2 as httpx
    err = anthropic.APIConnectionError(request=httpx.Request("POST", "https://api.anthropic.com"))
    with pytest.raises(AiUnavailable):
        analyst_with(fake_client(exc=err), cfg).analyze({})
