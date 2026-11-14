# Strategy experiments log

Rules and parameters are written here BEFORE a test is run. Results are appended after.
Changing a variant after seeing its validation/out-of-sample results makes those periods in-sample;
any such change must be logged as a new experiment.

---

## EXP-003: "Firefly"  -  Kuramoto market-synchrony filter  -  registered 2026-11-08, before testing

**Idea.** In the Kuramoto model, coupled oscillators (fireflies, clocks) drift into sync; the
order parameter R in [0, 1] measures how synchronized they are. Treat each of ~38 large coins as an
oscillator. When the market moves in sync (high R: herding, one shared story), trends persist and
trend-following works. When it is out of sync (low R: rotation, chop), trend entries get whipsawed.
Firefly takes trend entries only when the swarm is synchronized.

**Synchrony index (fully causal, no look-ahead):**
- Universe: the fixed 38-coin list in `app/data/universe.py`; 4H candles.
- Per coin: band-pass oscillation x = EMA6(log price) - EMA30(log price) (cycles of ~1-5 days).
- Phase theta = atan2(x / s_x, dx / s_dx), where dx is the 1-bar change of x and s_x, s_dx are trailing
  180-bar standard deviations. For a sine wave this recovers its phase using past data only (no
  Hilbert transform, which would use future bars).
- R(t) = |mean over coins of exp(i theta)|, using coins with data at t (minimum 10). Smoothed with EMA6.
- "Synchronized" = smoothed R at or above its own trailing 1080-bar (180-day) median.

**Trading rules (BTC and ETH, as before):**
- Entry: 4H EMA20/50 crossover with the daily EMA200 filter (EXP-002 X1), next 1H open.
- Initial stop 2 x 4H ATR14. Exits: initial stop; chandelier trail (3 x 4H ATR after +1R, EXP-001 B);
  opposite crossover; 60-day time stop. All risk-engine rules unchanged.

| Variant | Synchrony filter |
|---|---|
| F0: control | none (X1 entries + trailing/reverse exits) |
| **F1: Firefly** | enter only when synchronized |
| F2: placebo | enter only when NOT synchronized |

**What would support the idea:** F1 beats F0, and F0 beats F2, in expectancy per trade. If F2 does
as well as F1, synchrony carries no information and the idea is rejected.

**Success criterion (unchanged):** positive expectancy after costs in both the validation and
out-of-sample Binance segments, and not negative on Hyperliquid data.

**Caveat recorded in advance:** this is the fourth strategy family tested on the same history; the
exits reuse the best parts of EXP-001/002, which were chosen after seeing those results. A pass
earns forward paper trading, nothing more.

### EXP-003 results  -  run 2026-11-08

Binance proxy data, 2021-09 to 2026-11 (37 coins in the synchrony index; synced 48% of the time):

| Variant | Trades | Avg / trade | PF | Development (60%) | Validation (20%) | Out-of-sample (20%) | Max DD | Net on $100 |
|---|---|---|---|---|---|---|---|---|
| F0 control | 115 | +0.08R | 1.13 | +0.07R (67) | +0.56R (22) | **-0.32R (26)** | 5.1% | +$4.11 |
| **F1 Firefly** | 46 | **+0.17R** | 1.38 | -0.01R (27) | **+0.50R (13)** | **+0.25R (6)** | 3.1% | +$3.70 |
| F2 placebo | 74 | +0.01R | 1.00 | +0.11R (38) | +0.48R (14) | -0.46R (22) | 6.5% | +$0.08 |

Hyperliquid data, 2026-04 to 2026-11 (31 coins): F0 -0.36R (16 trades), **F1 +0.08R (7)**, F2 -0.63R (12).

**Verdict: F1 meets the pre-registered criterion** (positive in validation and out-of-sample, not
negative on Hyperliquid) and the ordering F1 > F0 > F2 matches the hypothesis.

**But the evidence is weak, and this is recorded so nobody over-reads it:**
- The pass rests on 13 validation and **6** out-of-sample trades. Six trades can be luck.
- In the development period (27 trades) Firefly was flat (-0.01R).
- The exploratory breakdown of control trades by synchrony at entry is not monotonic (the least
  synced fifth did well, the middle did badly). A real effect would more likely rise steadily with R.
- This is the fourth strategy family tried on the same history.
- Size of the result: +$3.70 on $100 over five years. At 0.5% risk per trade, even a real edge
  makes cents per trade.

**Decision:** Firefly earns forward paper trading (the lab), alongside the control and placebo, so
the comparison continues on data nobody has seen. Live money is not justified by this result.

---

## EXP-004: "Firefly Swarm"  -  Firefly on the whole coin universe  -  registered 2026-11-08, before testing

**Why:** Firefly (EXP-003) produced ~9 trades a year because it traded only BTC and ETH. The synchrony
signal is market-wide, so the natural extension is to take Firefly entries on every coin in the index.
Limits approved by the owner on 2026-11-08 for this strategy.

**Rules (identical to EXP-003 except where stated):**
- Markets: every universe coin with data (Binance: 38 coins; Hyperliquid: the ~31 listed there).
- Entries/exits: 4H EMA20/50 cross with daily EMA200 filter; synchrony filter; initial stop 2 x 4H ATR;
  trailing chandelier 3 x 4H ATR after +1R; opposite cross; 60-day time stop. Daily EMA200 uses each
  coin's own daily candles.
- Portfolio limits: **max 3 open positions**, never two in the same coin, BTC and ETH not both at once.
  **Max 8 entries per week.** Risk per trade 0.5% (unchanged), so at most 1.5% of equity at risk.
  Total margin of open positions may not exceed equity. A new entry is rejected if a stop-out of all
  open positions plus the new one would breach the 2% weekly loss limit. 5% drawdown halt unchanged.
- If several coins signal on the same bar, they are taken in the fixed order of the universe list
  until the limits are reached (no ranking by any indicator).
- Costs: BTC/ETH as before (1 bp half-spread, 5 bps slippage, Hyperliquid funding history).
  Altcoins: **3 bps half-spread, 10 bps slippage per side** (also used in sizing), funding a constant
  0.0025%/hour (longs pay, shorts receive; twice the BTC baseline). Exchange metadata (size decimals,
  max leverage, maintenance margin) from Hyperliquid for every coin; a coin whose max leverage is
  below 2x is skipped.

| Variant | Synchrony filter |
|---|---|
| S0: swarm control | none |
| **S1: Firefly Swarm** | synced only |
| S2: swarm placebo | not synced only |

**Success criterion (unchanged):** positive expectancy after costs in both the Binance validation and
out-of-sample segments, and not negative on Hyperliquid data. Also reported: trades per year, and
whether S1 > S0 > S2 holds again (if it does not, EXP-003's ordering was likely luck).

*Clarification added before any results were computed:* only coins listed on Hyperliquid (with
Hyperliquid metadata) are traded, in both data sources. The 6 universe coins not listed there stay in
the synchrony index but are never traded, since the strategy could not trade them for real.

*Correction (2026-11-08, after a first run that traded no altcoins):* the registered altcoin cost
assumption (3 bps half-spread = 6 bps spread) collided with the risk engine's live spread guard
(5 bps, set for BTC), so every altcoin signal was rejected for "spread too wide" and the first run
traded only BTC/ETH. Altcoins now get their own spread guard of 15 bps. No strategy rule, cost or
risk parameter was changed; the first run's results are not reported as EXP-004 results.

### EXP-004 results  -  run 2026-11-08 (after the spread-guard correction)

Binance proxy data, 31 tradable coins, 2021-09 to 2026-11:

| Variant | Trades (per year) | Avg / trade | PF | Development | Validation | Out-of-sample | Max DD | Net on $100 |
|---|---|---|---|---|---|---|---|---|
| S1 Firefly Swarm | 193 (37) | **-0.09R** | 0.80 | -0.14R (125) | +0.11R (35) | **-0.11R (33)** | 13.4% | -$8.80 |
| S0 swarm control | 497 (95) | -0.01R | 0.96 | -0.02R (293) | +0.18R (82) | -0.13R (122) | 17.5% | -$5.16 |
| S2 swarm placebo | 376 (72) | -0.05R | 0.89 | 0.00R (208) | -0.10R (66) | -0.12R (102) | 19.9% | -$9.67 |

Hyperliquid data (2026-04 to 2026-11): S1 -0.14R (25 trades), S0 -0.12R (70), S2 -0.10R (58).

Inside S1: BTC/ETH trades +0.23R (39), altcoin trades **-0.17R (154)**. 902 altcoin signals were
rejected because a 0.5% risk with a 2 x ATR stop gives a position below Hyperliquid's $10 minimum.

**Verdict: fails the criterion** (negative out-of-sample and on Hyperliquid), and the predicted
ordering S1 > S0 > S2 does **not** hold: the synchrony filter made results worse than no filter.
With 4x more trades, synchrony shows no measurable value as an entry filter. The most likely reading
of EXP-003 is that Firefly's pass on BTC/ETH (13 + 6 trades) was luck. That BTC/ETH did better than
altcoins here is noted, but it was found by looking at this data and is not evidence by itself.

Not added to the forward-test lab. The existing Firefly/control/placebo books keep running; they
are now the deciding test for the synchrony idea on BTC/ETH.

---

## EXP-005: "Relative Strength"  -  cross-sectional momentum, market-neutral  -  registered 2026-11-08, before testing

**Why a different family:** EXP-001..004 were all trend-timing strategies; they made money only in
the strong trends of 2021-2024. Cross-sectional strategies profit from the gap between strong and weak
coins, which does not require the whole market to trend. Momentum across coins is one of the most
documented effects in crypto research; short-horizon reversal is also documented, so both are tested.

**Universe:** universe coins listed on Hyperliquid (not delisted, max leverage >= 2), including BTC
and ETH, with daily candles. A rebalance needs at least 15 coins with a full lookback.

**Schedule:** rebalance weekly at Monday 00:00 UTC using daily closes through Sunday. Fills at the
Monday open plus half-spread and slippage.

| Variant | Ranking | Positions |
|---|---|---|
| **M1 Momentum** | 28-day return | long top 3, short bottom 3 |
| M2 Reversal | 7-day return | long bottom 3, short top 3 |
| M3 Momentum long-only | 28-day return | long top 3 |

**Sizing and protection:** each position gets a protective stop 3 x daily ATR14 from entry, and is
sized so a stop-out loses 0.5% of equity including round-trip costs. Total gross exposure is capped at
1.5x equity (all positions scaled down together if needed). Positions under $10 notional are skipped.
Stops are checked on each daily high/low (gap through = fill at the open); a stopped position stays
flat until the next rebalance. A coin that stays in the same leg at a rebalance keeps its position and
stop unchanged (no trading); everything else is closed or opened.

**Costs:** taker fee 0.045% both ways. Slippage 5 bps BTC/ETH, 10 bps others; half-spread 1 / 3 bps.
Funding: Hyperliquid hourly history where available; otherwise 0.00125%/h for BTC/ETH and 0.0025%/h
for others (longs pay, shorts receive).

**Success criterion:** positive expectancy after costs in both the Binance validation and
out-of-sample segments (60/20/20 by time), and positive total return on Hyperliquid's own daily data
(2024-05 to 2026-11, about 2.5 years). Monthly returns and maximum drawdown are reported for all.

*Amendment before any real-data run (2026-11-08):* unit tests showed that the registered sizing
(0.5% risk to a 3 x daily-ATR stop) produces ~$5 positions, below Hyperliquid's $10 minimum, so with
$100 it opens nothing. Main sizing changed to the standard for cross-sectional strategies: **equal
notional per position, gross exposure 1.0 x equity** (~$16.7 each with 6 positions), with the 3 x ATR
stop kept as a disaster stop. That implies roughly 1-2% of equity at risk per position, above the
default 0.5%: backtest and paper only, never real money without a new owner decision. The registered
0.5%-risk sizing is still run and reported (expected: almost no trades).

### EXP-005 results  -  run 2026-11-08 (equal-weight sizing, gross 1.0 x equity, $100 start)

| Variant | Data | Trades | Avg / trade | Total return | CAGR | Max DD | Positive months | Worst / best month | Validation | Out-of-sample |
|---|---|---|---|---|---|---|---|---|---|---|
| **M1 Momentum L/S** | Binance 2020-26 | 1017 | +0.06R | **+163%** | +16.6% | **66%** | 50% | -21% / +113% | +0.02R (equity -10%) | +0.13R (equity +36%) |
| **M1 Momentum L/S** | Hyperliquid 2024-26 | 387 | +0.09R | **+30%** | +11.1% | 65% | 47% | -19% / +111% | -0.14R (equity -39%) | -0.03R (equity -28%) |
| M2 Reversal | Binance | 356 | -0.04R | -40% | -7.9% | 62% | - | - | account too small to trade | |
| M2 Reversal | Hyperliquid | 383 | -0.03R | -45% | -21.7% | 52% | - | - | account too small to trade | |
| M3 Momentum long-only | Binance | 477 | +0.14R | -36% | -6.9% | 96% | 45% | -54% / +194% | +0.06R | +0.22R |
| M3 Momentum long-only | Hyperliquid | 181 | +0.18R | -63% | -33% | 93% | 43% | -44% / +194% | -0.28R | -0.09R |
| M1 at the registered 0.5% risk | both | 4 | - | ~0% | - | - | - | - | 1,937 positions below $10 | |

**Concentration:** M1's 5 best trades (ZEC, AXS, SAND, DASH, DOGE manias) made +$518 on Binance; the
other 1,012 trades lost -$355. On Hyperliquid: top 5 +$199, the other 382 -$169. The short leg was
profitable on both (+$110 / +$50), helped by received funding.

**Verdict:** M1 meets the letter of the criterion (positive average R in Binance validation and
out-of-sample, positive total on Hyperliquid) but not its spirit: the profit depends on a handful of
mania trades, drawdowns reach 65%, and on Hyperliquid's own data both test periods lost money in
equity terms. This is the classic momentum profile: rare huge winners, long painful stretches.
Decision: paper-trade M1 in the lab as a high-risk book. No real money: a 65% drawdown on $100 is
-$65, and the result rests on a few events that may not repeat.

---

