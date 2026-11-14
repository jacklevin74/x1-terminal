"""Configuration loading and validation.

Config is loaded once from config.yaml (+ .env for secrets) into frozen
dataclasses. Nothing at runtime can change risk or safety values; Claude never
sees or edits this object.
"""
from __future__ import annotations

import logging
import os
from dataclasses import dataclass, field
from pathlib import Path

import yaml
from dotenv import load_dotenv

ROOT = Path(__file__).resolve().parent.parent

HL_MAINNET_URL = "https://api.hyperliquid.xyz"
HL_TESTNET_URL = "https://api.hyperliquid-testnet.xyz"
HL_MAINNET_WS = "wss://api.hyperliquid.xyz/ws"
HL_TESTNET_WS = "wss://api.hyperliquid-testnet.xyz/ws"

# Hard ceilings the config file cannot exceed. Raising these means editing code
# that gets reviewed, not a YAML value.
HARD_MAX_LEVERAGE = 2
HARD_MAX_RISK_PER_TRADE = 0.01
# Owner-approved 2026-11-08 (EXP-004): the synchrony universe. Default config still trades BTC/ETH only.
from app.data.universe import UNIVERSE as _UNIVERSE  # noqa: E402

HARD_ALLOWED_ASSETS = set(_UNIVERSE)
HARD_MAX_OPEN_POSITIONS = 3


class ConfigError(ValueError):
    pass


@dataclass(frozen=True)
class AccountCfg:
    starting_balance: float
    currency: str


@dataclass(frozen=True)
class TradingCfg:
    mode: str
    allowed_assets: tuple[str, ...]
    margin_mode: str
    max_leverage: float
    max_open_positions: int


@dataclass(frozen=True)
class RiskCfg:
    risk_per_trade: float
    max_weekly_loss: float
    max_drawdown: float
    max_trades_per_week: int
    max_correlated_positions: int
    max_cost_fraction_of_risk: float
    min_liquidation_buffer: float
    funding_hold_hours: int
    max_api_errors: int
    max_ws_reconnects_per_hour: int


@dataclass(frozen=True)
class FeesCfg:
    taker: float
    maker: float
    assume_taker_entries: bool


@dataclass(frozen=True)
class StrategyCfg:
    trend_timeframe: str
    setup_timeframe: str
    confirmation_timeframe: str
    daily_ema_fast: int
    daily_ema_slow: int
    setup_ema_fast: int
    setup_ema_slow: int
    atr_period: int
    pullback_lookback_bars: int
    pullback_atr_tolerance: float
    swing_lookback: int
    volume_period: int
    volume_multiplier: float
    stop_atr_buffer: float
    target_r: float
    minimum_reward_risk: float
    minimum_net_reward_risk: float
    max_stop_atr: float
    signal_ttl_minutes: int
    max_hold_hours: int
    cooldown_hours: int
    exit_mode: str
    trail_atr_mult: float
    trail_activate_r: float
    trailing_max_hold_hours: int


@dataclass(frozen=True)
class ExecutionCfg:
    require_protective_stop: bool
    require_reduce_only_exit: bool
    max_slippage_bps: float
    assumed_slippage_bps: float
    reject_stale_data: bool
    stale_after_seconds: int
    max_spread_bps: float


@dataclass(frozen=True)
class AiCfg:
    enabled: bool
    required_for_entry: bool
    model: str
    effort: str
    max_tokens: int


@dataclass(frozen=True)
class PaperCfg:
    poll_seconds: int
    evaluation_minute: int


@dataclass(frozen=True)
class AlertsCfg:
    telegram_enabled: bool


@dataclass(frozen=True)
class SafetyCfg:
    live_trading_enabled: bool
    require_owner_authorization: bool
    withdrawals_enabled: bool
    automatic_leverage_increases: bool


@dataclass(frozen=True)
class StorageCfg:
    database: str


@dataclass(frozen=True)
class Secrets:
    anthropic_api_key: str | None = field(default=None, repr=False)
    telegram_bot_token: str | None = field(default=None, repr=False)
    telegram_chat_id: str | None = field(default=None, repr=False)
    hl_testnet_account_address: str | None = None
    hl_testnet_agent_key_file: str | None = None


@dataclass(frozen=True)
class Config:
    account: AccountCfg
    trading: TradingCfg
    risk: RiskCfg
    fees: FeesCfg
    strategy: StrategyCfg
    execution: ExecutionCfg
    ai: AiCfg
    paper: PaperCfg
    alerts: AlertsCfg
    safety: SafetyCfg
    storage: StorageCfg
    secrets: Secrets

    @property
    def db_path(self) -> Path:
        p = Path(self.storage.database)
        return p if p.is_absolute() else ROOT / p


def _validate(cfg: Config) -> None:
    errs: list[str] = []
    t, r, s, sf = cfg.trading, cfg.risk, cfg.strategy, cfg.safety
    if t.mode not in ("paper", "testnet"):
        errs.append(f"trading.mode must be paper or testnet in v1 (got {t.mode!r}); mainnet is not implemented")
    if not set(t.allowed_assets) <= HARD_ALLOWED_ASSETS:
        errs.append(f"allowed_assets must be a subset of {sorted(HARD_ALLOWED_ASSETS)}")
    if t.margin_mode != "isolated":
        errs.append("margin_mode must be isolated")
    if not 0 < t.max_leverage <= HARD_MAX_LEVERAGE:
        errs.append(f"max_leverage must be in (0, {HARD_MAX_LEVERAGE}]")
    if not 1 <= t.max_open_positions <= HARD_MAX_OPEN_POSITIONS:
        errs.append(f"max_open_positions must be between 1 and {HARD_MAX_OPEN_POSITIONS}")
    if not 0 < r.risk_per_trade <= HARD_MAX_RISK_PER_TRADE:
        errs.append(f"risk_per_trade must be in (0, {HARD_MAX_RISK_PER_TRADE}]")
    if not 0 < r.max_weekly_loss <= 0.1:
        errs.append("max_weekly_loss must be in (0, 0.1]")
    if not 0 < r.max_drawdown <= 0.2:
        errs.append("max_drawdown must be in (0, 0.2]")
    if s.minimum_net_reward_risk < 1.0 or s.minimum_reward_risk < s.minimum_net_reward_risk:
        errs.append("reward/risk minimums are inconsistent")
    if s.target_r < s.minimum_reward_risk:
        errs.append("strategy.target_r must be >= minimum_reward_risk")
    if s.exit_mode not in ("fixed", "trailing", "trailing_trend", "reverse", "trailing_reverse"):
        errs.append("strategy.exit_mode must be fixed, trailing, trailing_trend, reverse or trailing_reverse")
    if s.exit_mode in ("trailing", "trailing_trend") and not (s.trail_atr_mult > 0 and s.trail_activate_r >= 0):
        errs.append("trailing parameters must be positive")
    if sf.withdrawals_enabled:
        errs.append("withdrawals_enabled must be false (withdrawals are not implemented)")
    if sf.automatic_leverage_increases:
        errs.append("automatic_leverage_increases must be false")
    if sf.live_trading_enabled:
        errs.append("live_trading_enabled must be false in v1 (no mainnet adapter exists)")
    if not cfg.execution.require_protective_stop:
        errs.append("require_protective_stop must be true")
    if errs:
        raise ConfigError("Invalid configuration:\n  - " + "\n  - ".join(errs))


def load_config(path: str | Path | None = None) -> Config:
    load_dotenv(ROOT / ".env")
    path = Path(path or os.environ.get("TRADER_CONFIG", ROOT / "config.yaml"))
    raw = yaml.safe_load(path.read_text())
    tr = dict(raw["trading"])
    tr["allowed_assets"] = tuple(tr["allowed_assets"])
    cfg = Config(
        account=AccountCfg(**raw["account"]),
        trading=TradingCfg(**tr),
        risk=RiskCfg(**raw["risk"]),
        fees=FeesCfg(**raw["fees"]),
        strategy=StrategyCfg(**raw["strategy"]),
        execution=ExecutionCfg(**raw["execution"]),
        ai=AiCfg(**raw["ai"]),
        paper=PaperCfg(**raw["paper"]),
        alerts=AlertsCfg(**raw["alerts"]),
        safety=SafetyCfg(**raw["safety"]),
        storage=StorageCfg(**raw["storage"]),
        secrets=Secrets(
            anthropic_api_key=os.environ.get("ANTHROPIC_API_KEY") or None,
            telegram_bot_token=os.environ.get("TELEGRAM_BOT_TOKEN") or None,
            telegram_chat_id=os.environ.get("TELEGRAM_CHAT_ID") or None,
            hl_testnet_account_address=os.environ.get("HL_TESTNET_ACCOUNT_ADDRESS") or None,
            hl_testnet_agent_key_file=os.environ.get("HL_TESTNET_AGENT_KEY_FILE") or None,
        ),
    )
    _validate(cfg)
    return cfg


def setup_logging(level: str | None = None) -> None:
    level = level or os.environ.get("LOG_LEVEL", "INFO")
    logging.basicConfig(
        level=level,
        format="%(asctime)s %(levelname)-7s %(name)s: %(message)s",
        datefmt="%Y-%m-%dT%H:%M:%S",
    )
