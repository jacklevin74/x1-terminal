# Strategy Lab: Firefly and Relative Strength

Two Hyperliquid perp strategies, with their backtester, live paper-trading lab and dashboard.
This is a standalone Python project. It does not touch the X1 Terminal app, its build or its CI.

**Paper trading only.** Nothing here can place a mainnet order: the only exchange adapter for real
orders refuses every URL except Hyperliquid testnet, and withdrawals or transfers are not implemented.

| Strategy | Idea | Evidence so far |
|---|---|---|
| **Firefly** (EXP-003) | BTC/ETH 4H trend following that only takes trades when ~30 large coins move in sync (Kuramoto order parameter above its 180-day median). | Binance 2021–26: +0.17R per trade over 46 trades, positive in validation (+0.50R, 13 trades) and out-of-sample (+0.25R, **6 trades**), +$3.70 on $100. Passes its pre-registered test, but on too few trades to call it an edge. |
| **Relative Strength** (EXP-005) | Weekly cross-sectional momentum across 30 Hyperliquid coins: long the 3 best 28-day performers, short the 3 worst, equal size, 3× daily-ATR stops. | +163% on Binance 2020–26 and +30% on Hyperliquid 2024–26, with **65% drawdowns**. Profit comes from a few coin manias (top 5 trades +$518, the other 1,012 trades −$355). |

Both are labelled as experiments, not proven edges. Full rules (written before testing) and results
are in [docs/experiments.md](docs/experiments.md). Note EXP-004 there: the same Firefly rules applied
to 31 coins lost money, which weakens the synchrony idea. The forward paper test decides.

The lab also runs two **comparison books** for Firefly, because they are how you tell whether the
synchrony filter helps: *control* (the same trades with no filter) and *placebo* (only when the
market is *not* in sync). If Firefly is right, firefly > control > placebo.

## Run it

Python 3.12. From this folder:

```bash
python3.12 -m venv .venv
.venv/bin/pip install -r requirements.txt
cp .env.example .env              # optional: only DASHBOARD_PASSWORD is needed for the lab
.venv/bin/pytest -q               # 159 tests, no network needed
```

### Backtests

```bash
# History for all ~38 universe coins (1h/4h/1d): synchrony and Relative Strength need every coin
.venv/bin/python -m app.main fetch --universe --source binance --days 1825
.venv/bin/python -m app.main fetch --universe --source hyperliquid --days 210
.venv/bin/python -m app.main research   # Firefly vs control vs placebo, with validation / out-of-sample splits
.venv/bin/python -m app.main xs         # Relative Strength (EXP-005) variants
```

Binance spot is a longer **proxy** history; Hyperliquid only serves ~5,000 candles per interval
(about 7 months of 1h data). Coins a venue doesn't list are skipped with a warning. The 5-year
Binance download takes several minutes. Without `--universe`, `fetch` downloads only BTC/ETH.

### Live paper trading

```bash
.venv/bin/python -m app.main lab        # foreground
scripts/start.sh                         # or: lab + dashboard in the background (logs in data/)
scripts/stop.sh
```

The lab paper-trades four $100 accounts on live Hyperliquid **mainnet** market data (REST +
WebSocket; no keys needed): `firefly`, `control`, `placebo` and `momentum`. Each has its own risk
engine state, circuit breaker and trade journal in `data/trader.db` (SQLite).

Schedule (UTC):
- every hour at :01, evaluates Firefly books; every 4 h, recomputes the synchrony index
- every 15 s, checks stops and positions
- every hour at :00, accrues funding
- Mondays 00:10, rebalances Relative Strength
- daily 00:20, re-runs both backtests so the dashboard stays current

### Dashboard

```bash
.venv/bin/streamlit run dashboard/app.py --server.port 7700
```

Set `DASHBOARD_PASSWORD` in `.env` before exposing it beyond localhost. The **Strategy Lab** page
shows the scoreboard, each book's positions and trades, the live synchrony index, and the backtests.

### Docker

```bash
docker build -t strategy-lab .
docker run --env-file .env -v "$PWD/data:/app/data" strategy-lab        # runs the lab
```

## Costs and fills

Fees are Hyperliquid base tier (0.045% taker, 0.015% maker), plus hourly funding and 5 bps
slippage (more for altcoins). Paper fills use top-of-book quotes, so they are realistic only at
small size. Risk limits are in `config.yaml` and validated against hard limits in `app/config.py`
at startup (max 2× leverage, ≤1% risk per trade, persistent halt on a 5% drawdown).

## Layout

```
app/
  strategy/firefly.py      Firefly signal (EMA cross gated by synchrony)
  strategy/synchrony.py    Kuramoto order parameter over the coin universe
  lab_xs.py                Relative Strength paper book
  backtest/portfolio.py    Relative Strength backtester
  research.py, xs_research.py   backtest runners behind `research` and `xs`
  lab.py                   live paper lab (scheduler + books)
  trader.py                per-book trading loop (signals → risk engine → paper orders)
  data/ risk/ execution/ storage/ monitoring/   shared infrastructure
  ai/                      optional Claude review gate (off in the lab)
dashboard/                 Streamlit dashboard
tests/                     unit tests
docs/experiments.md        pre-registered rules and results
docs/SECURITY.md           credential handling
```
