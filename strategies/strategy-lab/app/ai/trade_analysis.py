"""The AI gate between a strategy candidate and the risk engine.

Claude can only veto. A trade proceeds to the risk engine only when the
strategy produced a candidate AND (if AI is enabled) Claude returned
TRADE_CANDIDATE. When AI is required and unavailable, the gate fails closed.
"""
from __future__ import annotations

import logging
from dataclasses import dataclass
from typing import Any, Protocol

from app.ai.claude_client import AiUnavailable, TradeAnalysis
from app.config import Config
from app.storage.models import AccountState, Signal

log = logging.getLogger(__name__)


class Analyst(Protocol):
    def analyze(self, snapshot: dict) -> tuple[TradeAnalysis, dict]: ...


@dataclass
class GateResult:
    proceed: bool
    decision: str                # TRADE_CANDIDATE | NO_TRADE | INVALID_DATA | AI_UNAVAILABLE | AI_DISABLED
    analysis: TradeAnalysis | None
    meta: dict[str, Any]
    error: str | None = None


def build_snapshot(sig: Signal, acct: AccountState, cfg: Config, mode: str) -> dict[str, Any]:
    snap = dict(sig.snapshot)
    snap["rule_checks"] = sig.checks
    snap["account"] = {"equity": round(acct.equity, 4),
                       "risk_budget": round(acct.equity * cfg.risk.risk_per_trade, 4),
                       "open_positions": len(acct.open_positions)}
    snap["execution"] = {"mode": mode, "maximum_leverage": cfg.trading.max_leverage}
    return snap


def ai_gate(analyst: Analyst | None, sig: Signal, acct: AccountState, cfg: Config, mode: str) -> GateResult:
    if not cfg.ai.enabled or analyst is None:
        if cfg.ai.required_for_entry:
            return GateResult(False, "AI_UNAVAILABLE", None, {}, "AI review is required but not configured")
        return GateResult(True, "AI_DISABLED", None, {})
    snapshot = build_snapshot(sig, acct, cfg, mode)
    try:
        analysis, meta = analyst.analyze(snapshot)
    except AiUnavailable as e:
        log.warning("Claude unavailable: %s", e)
        return GateResult(not cfg.ai.required_for_entry, "AI_UNAVAILABLE", None, {"snapshot": snapshot}, str(e))
    meta["snapshot"] = snapshot
    return GateResult(analysis.decision == "TRADE_CANDIDATE", analysis.decision, analysis, meta)
