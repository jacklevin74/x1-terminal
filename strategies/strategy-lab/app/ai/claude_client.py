"""Claude API client for structured trade reviews.

Uses structured outputs (messages.parse with a Pydantic schema), so the reply is
schema-validated JSON. Any failure (API error, refusal, truncation, invalid
values) becomes an AiUnavailable error; callers treat that as "no trade".
"""
from __future__ import annotations

import json
import logging
import time
from typing import Literal

import anthropic
from pydantic import BaseModel, ValidationError

from app.ai.prompts import SYSTEM_PROMPT, user_prompt
from app.config import AiCfg

log = logging.getLogger(__name__)

Decision = Literal["NO_TRADE", "TRADE_CANDIDATE", "INVALID_DATA"]


class TradeAnalysis(BaseModel):
    decision: Decision
    confidence: float
    conditions_passed: list[str]
    conditions_failed: list[str]
    invalidation_conditions: list[str]
    concerns: list[str]
    reasoning: str


class AiUnavailable(RuntimeError):
    pass


class ClaudeAnalyst:
    def __init__(self, cfg: AiCfg, api_key: str | None, server_fallbacks: bool = True):
        self.cfg = cfg
        self.server_fallbacks = server_fallbacks
        # A bare Anthropic() also picks up `ant auth login` profiles when no key is set.
        self.client = anthropic.Anthropic(api_key=api_key) if api_key else anthropic.Anthropic()

    def analyze(self, snapshot: dict) -> tuple[TradeAnalysis, dict]:
        """Returns (analysis, metadata). Raises AiUnavailable on any failure."""
        started = time.time()
        extra: dict = {}
        if self.server_fallbacks:
            # Server-side fallback: if the model declines, the API retries on a fallback model.
            extra = {"extra_headers": {"anthropic-beta": "server-side-fallback-2026-07-01"},
                     "extra_body": {"fallbacks": "default"}}
        try:
            resp = self.client.messages.parse(
                model=self.cfg.model,
                max_tokens=self.cfg.max_tokens,
                system=SYSTEM_PROMPT,
                thinking={"type": "adaptive"},
                output_config={"effort": self.cfg.effort},
                messages=[{"role": "user", "content": user_prompt(json.dumps(snapshot, sort_keys=True))}],
                output_format=TradeAnalysis,
                **extra,
            )
        except anthropic.RateLimitError as e:
            raise AiUnavailable(f"rate limited: {e}") from e
        except anthropic.APIStatusError as e:
            raise AiUnavailable(f"API error {e.status_code}: {e.message}") from e
        except anthropic.APIConnectionError as e:
            raise AiUnavailable(f"connection error: {e}") from e
        except ValidationError as e:
            raise AiUnavailable(f"response failed schema validation: {e}") from e

        meta = {"model": resp.model, "stop_reason": resp.stop_reason, "latency_s": round(time.time() - started, 2),
                "input_tokens": resp.usage.input_tokens, "output_tokens": resp.usage.output_tokens}
        if resp.stop_reason == "refusal":
            raise AiUnavailable(f"model declined the request ({getattr(resp, 'stop_details', None)})")
        if resp.stop_reason == "max_tokens":
            raise AiUnavailable("response truncated at max_tokens")
        analysis = resp.parsed_output
        if analysis is None:
            raise AiUnavailable("no parsed output")
        if not 0.0 <= analysis.confidence <= 1.0:
            raise AiUnavailable(f"confidence out of range: {analysis.confidence}")
        return analysis, meta
