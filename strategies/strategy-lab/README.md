# Strategy Lab

A side-by-side paper-trading lab for Hyperliquid perps: 23 strategies, each in its own simulated
$100 account on live market data, with a backtester and a Streamlit dashboard. This is a standalone
Python project. It does not touch the X1 Terminal app, its build or its CI.

**Paper trading only.** Nothing here can place a mainnet order: the only exchange adapter for real
orders refuses every URL except Hyperliquid testnet, and withdrawals or transfers are not implemented.

## Strategies

Rules for each one were written down before testing; see [docs/experiments.md](docs/experiments.md).
Plain-language descriptions are also in `app/strategy_info.py` and on the dashboard.

**Copy top traders** (positions of profitable Hyperliquid wallets, found by a leaderboard scan)

| Book | Strategy | Idea |
|---|---|---|
| `consensus` | Consensus follow (EXP-007) | Follows a coin when almost all of 244 profitable traders holding it are on the same side. |
| `consensus-tp` | Consensus + take-profit (EXP-008) | Same, with a trailing stop once a trade is up 3%. |
| `consensus-fade` | *Consensus fade (control)* | The opposite side of every Consensus trade. |
| `copy` | Shadow copy (EXP-006) | Averages the positions of the few traders that pass the strictest leaderboard rules. |
| `ensemble` | Majority-vote ensemble (EXP-014) | Trades a coin only when most of 15 elite traders agree. |
| `ensemble-wide` | Wide ensemble (EXP-021) | Every trader in the pool votes, at most 3 per trading style. |
| `ensemble-tp` | Ensemble + take-profit (EXP-022) | Majority vote plus a +3% / 2% trailing take-profit. |
| `weighted` | Weighted portfolio (EXP-015) | Copies 6 traders, more weight to smaller drawdowns, no two alike. |
| `weighted-ff` | Weighted + funding filter (EXP-018) | Skips copies paying extreme funding. |
| `weighted-tp` | Weighted + take-profit (EXP-022) | Weighted portfolio plus the trailing take-profit. |
| `hrp` | HRP portfolio (EXP-016) | 8 traders weighted by Hierarchical Risk Parity. |
| `experts` | Expert weighting (EXP-017) | Learns hourly which of 15 traders are currently good (aggregating algorithm). |
| `hybrid` | Hybrid stack (EXP-019) | Style-diverse traders, HRP weights, consensus, funding filter and a synchrony regime filter. |
| `weighted-random` | *Random control (EXP-020)* | Weighted rules on 6 randomly drawn traders. If it keeps up, trader selection adds nothing. |

**Market signals and trend following**

| Book | Strategy | Idea |
|---|---|---|
| `funding` | Funding contrarian (EXP-013 C3) | Shorts coins where longs pay the most funding, buys where shorts pay most. Passed a 5-year backtest (+27.6%/yr). |
| `momentum` | Relative Strength (EXP-005) | Weekly: long the 3 best 28-day performers, short the 3 worst. Backtest +163% with 65% drawdowns. |
| `firefly` | Firefly (EXP-003) | BTC/ETH 4H trend trades only while ~30 coins move in sync (Kuramoto filter). |
| `control`, `placebo` | *Firefly controls* | Same trades without the filter / only when the market is *not* in sync. |
| `fasttrend` | Fast trend (EXP-024) | 4H trend filter plus a 1H breakout on BTC/ETH. |
| `pullback-trail`, `pullback-fixed` | Pullback (EXP-001, original) | Buy dips in an uptrend. Failed their backtests; kept as reference. |
| `mm` | Market making (EXP-011) | Simplified Avellaneda-Stoikov quotes on BTC/ETH. |

*Italic* books are controls. They exist so you can tell skill from luck: a strategy only means
something if it beats its control.

### Live paper results (snapshot, 2026-11-14)

Balance on a $100 start, including open positions at market prices. These books had been running for
**2 to 5 days**, and most of the gains are open positions, so this shows what is working so far, not an edge.

| Book | Days | Balance | Closed trades |
|---|---|---|---|
| consensus-tp | 2.3 | $107.23 | 16 |
| consensus | 5.3 | $105.59 | 1 |
| ensemble-wide | 1.7 | $104.48 | 0 |
| *weighted-random* | 1.7 | *$103.95* | 2 |
| copy | 5.3 | $103.89 | 12 |
| experts | 1.7 | $103.64 | 22 |
| weighted-ff | 1.7 | $102.52 | 4 |
| ensemble-tp | 1.7 | $102.06 | 2 |
| ensemble | 1.7 | $101.70 | 0 |
| hrp | 1.7 | $101.31 | 6 |
| firefly, control, placebo, pullback-*, fasttrend | 0.5–5.4 | $100.00 | 0 |
| hybrid | 1.7 | $99.90 | 1 |
| funding | 2.1 | $99.66 | 0 |
| weighted | 1.7 | $99.61 | 20 |
| weighted-tp | 1.7 | $99.54 | 19 |
| mm | 2.1 | $99.32 | 0 |
| momentum | 5.3 | $97.41 | 0 |
| *consensus-fade* | 5.3 | *$94.16* | 3 |

The random control beating most copy books, and consensus-fade mirroring consensus, both suggest
that much of the early gain is the market's direction rather than trader selection.

## Run it

Python 3.12. From this folder:

```bash
python3.12 -m venv .venv
.venv/bin/pip install -r requirements.txt
cp .env.example .env              # optional: only DASHBOARD_PASSWORD is needed for the lab
.venv/bin/pytest -q               # 206 tests, no network needed
```

### Live paper lab

```bash
.venv/bin/python -m app.main lab        # foreground
scripts/start.sh                         # or: lab + dashboard in the background (logs in data/)
scripts/stop.sh
```

The lab uses live Hyperliquid **mainnet** market data (REST + WebSocket; no keys needed). Each book
keeps its own risk state, circuit breaker and trade journal in `data/trader.db` (SQLite). On first
start it scans the Hyperliquid leaderboard for the copy-trader books (rescanned every 2 days), so
those books start trading once the scan finishes.

### Backtests

```bash
# History for all ~38 universe coins (1h/4h/1d)
.venv/bin/python -m app.main fetch --universe --source binance --days 1825
.venv/bin/python -m app.main fetch --universe --source hyperliquid --days 210
.venv/bin/python -m app.main research   # Firefly family, pullback, 4H cross, Swarm
.venv/bin/python -m app.main xs         # Relative Strength variants
```

Binance spot is a longer **proxy** history; Hyperliquid only serves ~5,000 candles per interval.
Coins a venue doesn't list are skipped with a warning. Copy-trader strategies have no backtest:
traders' past positions can't be replayed without bias, so they are forward-tested only.

### Dashboard

```bash
.venv/bin/streamlit run dashboard/app.py --server.port 7700
```

Set `DASHBOARD_PASSWORD` in `.env` before exposing it beyond localhost. The **Strategy Lab** page
shows the scoreboard, a luck check per strategy, each book's positions and followed traders, and the research.

### Docker

```bash
docker build -t strategy-lab .
docker run --env-file .env -v "$PWD/data:/app/data" strategy-lab        # runs the lab
```

## Costs and fills

Fees are Hyperliquid base tier (0.045% taker, 0.015% maker), plus hourly funding and slippage.
Paper fills use top-of-book quotes or the live order book, so they are realistic only at small size.
Risk limits are in `config.yaml` and validated against hard limits in `app/config.py` at startup.

## Also included

The original single-strategy trader (`python -m app.main paper` / `testnet`) with its optional
Claude review gate, write-ahead order manager, restart reconciliation and live-authorization
checklist (`gates`). See `docs/SECURITY.md` for credential handling.
