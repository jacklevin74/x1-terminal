# Strategy experiments log

Rules and parameters are written here BEFORE a test is run. Results are appended after.
Changing a variant after seeing its validation/out-of-sample results makes those periods in-sample;
any such change must be logged as a new experiment.

---

## EXP-001: Let winners run (trailing exits)  -  registered 2026-11-08, before testing

**Hypothesis:** the fixed 2R target cuts off the large trend moves that trend-following depends on.
Replacing it with a trailing exit should raise average R per trade.

Entries, initial stop, position sizing and all risk-engine rules are unchanged from the baseline.
The entry gate still requires a nominal 2R target to clear min gross R:R 2.0 / net 1.5; in trailing
variants that target is used only for the gate and no take-profit order is placed.

| Variant | Exit rules |
|---|---|
| A: baseline | Fixed target at 2R; initial stop; 10-day time stop |
| B: trailing | No target. Initial stop until price has moved +1R in favor. After that, a chandelier stop: highest high (long) / lowest low (short) since entry minus/plus **3 x 4H ATR14**, moving only in the trade's favor and never looser than the initial stop. Time stop **60 days**. |
| C: trailing + trend exit | Variant B, plus: exit at the close of any daily candle that closes on the wrong side of the **daily EMA50** (below it for longs, above it for shorts). |

**No-look-ahead rule:** the stop level used inside a 1H bar is computed only from bars that
closed before it. The trend exit fills at the 1H close that coincides with the daily close (taker,
with slippage).

**Success criterion (decided in advance):** a variant is worth paper-trading only if it has
positive expectancy after costs in BOTH the validation and out-of-sample segments of the Binance
proxy data, and is not negative on the Hyperliquid data. Development-segment results alone do not count.

**Multiple-testing note:** two new variants are tested, so the chance that one passes by luck is
higher than for a single test. A pass means "worth paper-trading", not "has an edge".

### EXP-001 results  -  run 2026-11-08

Expectancy per trade in R (1R = planned loss), after fees, funding and slippage.

| Data / segment | A: fixed 2R | B: trailing | C: trailing + trend exit |
|---|---|---|---|
| Binance, all (189-198 trades) | -0.07R, PF 0.89 | **+0.05R, PF 1.07** | +0.03R, PF 1.05 |
| Binance, development (60%) | +0.07R | +0.13R | +0.12R |
| Binance, validation (20%) | -0.29R | **+0.06R** | -0.01R |
| Binance, out-of-sample (20%) | -0.24R | **-0.18R** | -0.17R |
| Binance, max drawdown | 11.5% | 7.5% | 6.6% |
| Hyperliquid, all (15-17 trades) | -0.22R | -0.01R | -0.06R |

**Verdict: neither variant meets the pre-registered criterion.** B passes validation but fails
out-of-sample; C fails both. Trailing exits clearly beat the fixed 2R target (better in every
segment, smaller drawdown), so the exit change is an improvement, but the system as a whole still
shows no edge in the most recent year. `strategy.exit_mode` stays `fixed` in config. B is the
preferred exit for any future experiment.

The out-of-sample segment (2025-10 to 2026-11) has now been looked at for EXP-001. Later experiments
should treat it as seen data and validate on new data (live paper trading) instead.

---

## EXP-002: EMA crossover  -  registered 2026-11-08, before testing

**Hypothesis:** a plain moving-average crossover catches trends earlier and holds them longer than the
pullback entry, giving positive expectancy after costs.

Note: all historical data has been viewed at least once (EXP-001 used the same segments). These
rules were not fitted to it, but this is the third strategy tested on the same history, so a pass is
weaker evidence than a first test would be.

Common to both variants:
- Signal: EMA20 crosses EMA50 on a **completed** candle of the variant's timeframe.
  Up-cross = long, down-cross = short. Entry at the next 1H open (same fills/costs as before).
- Initial stop: 2 x ATR14 of the variant's timeframe from the entry price. Sizing, all risk-engine
  rules, weekly limits and the $10 minimum order are unchanged (a nominal 2R target is used only
  for the entry gate; no take-profit is placed).
- Exit: initial stop, or the opposite crossover (market exit at that candle's close), or 60 days.
- 24 h cooldown per market after an exit; one position at a time across BTC and ETH.

| Variant | Timeframe | Trend filter |
|---|---|---|
| X1 | 4H EMA20/50 | Only longs above the daily EMA200, only shorts below it |
| X2 | Daily EMA20/50 | None |

**Success criterion:** same as EXP-001: positive expectancy after costs in both the validation and
out-of-sample Binance segments, and not negative on Hyperliquid data.

### EXP-002 results  -  run 2026-11-08

| Data / segment | X1: 4H EMA20/50 cross + daily EMA200 filter | X2: daily EMA20/50 cross |
|---|---|---|
| Binance, all | 105 trades, **+0.18R**, PF 1.23, win rate 21% | 3 trades (64 of 67 signals rejected) |
| Binance, development (60%) | +0.36R (58 trades) | 1 trade |
| Binance, validation (20%) | **-0.11R** (21 trades) | 2 trades, both stopped |
| Binance, out-of-sample (20%) | +0.03R (26 trades), PF 1.01 | 0 trades |
| Binance, max drawdown / losing streak | 7.7% / 12 in a row | - |
| Hyperliquid, all | -0.24R (16 trades) | 0 trades (8 signals, all rejected) |

**Verdict: neither variant meets the criterion.**
- X1 is the best result so far overall, but it is negative in validation, about breakeven
  out-of-sample, and negative on Hyperliquid data. Most of its profit came from 2021-2024.
- X2 cannot be traded at this account size: a 2 x daily-ATR stop is ~8-10% away, so a $0.50 risk
  gives a ~$5 position, below Hyperliquid's $10 minimum. The risk engine correctly refuses to enlarge it.

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

## EXP-006: "Shadow"  -  copy the best directional Hyperliquid traders  -  registered 2026-11-08

**Selection (app/wallets.py):** from the public leaderboard: account >= $25k, lifetime profit >= $50k
and ROI > 0, profitable this month, lifetime volume <= 200x account. Then per wallet: drop if > 50% of
recent fills are maker fills (market making), > 100 fills/day or median holding time < 1 hour (too
fast to copy), track record < 90 days, P&L drawdown > 60% of account, or positions mostly hedged.
Rank the rest by return on account / max drawdown x consistency x record length. Follow the top 5.

**Copying (app/copy_book.py):** every minute, average the leaders' signed position values as a share
of their own accounts; scale to our equity; cap gross exposure at 1.5x; drop targets below $10; keep
at most 6 positions. Open new targets, close when the leaders exit or flip, rebuild only when more
than 2x off target. Every position has a reduce-only disaster stop 10% from entry. Paper only.

**No backtest is possible:** the leaderboard has no history, and judging today's winners on their
own past is survivorship bias by construction. Leader stats are shown for information only.

**Success criterion (forward, decided now):** after 4 weeks or 40 closed trades, whichever is later,
the copy book must have positive net P&L after fees and funding, and must beat simply holding BTC
over the same period on return per unit of drawdown. Otherwise it is stopped.

*Correction before any copying (2026-11-08):* the first scan's "copyable" list contained wallets with
no perp trading at all (profits from spot holdings such as HYPE, or vaults), spot markets ("@N"
coins) in their stats, and duplicate sub-accounts. Added: lifetime **perp** profit >= $50k, perp
profit this month > 0, >= 10 recent perp fills with the last within 14 days, >= 70% of fills on perps;
all trading stats computed on perp fills only; duplicates (identical P&L history) merged.

---

## EXP-007: "Firefly Consensus"  -  Kuramoto synchrony of profitable traders  -  registered 2026-11-08

**Idea:** treat each profitable trader as an oscillator whose phase in a coin is its position side
(long = 0, short = pi). The Kuramoto order parameter R = |#long - #short| / N measures how aligned
they are. When many independently profitable traders hold the same side, follow them.

**Signal sources (frozen for the test):** from the 998-wallet scan, every wallet with lifetime perp
profit >= $50k, perp profit this month > 0, >= 10 perp fills with the last within 14 days, not a
market maker (> 50% maker fills AND > 50 fills/day), not HFT (> 300 fills/day), not mostly hedged.
244 wallets qualify. Copyability is not required: their positions are read, not copied.

**Signal (every 15 minutes; every 5 minutes from 2026-11-09):** per coin, N = sources holding a position; one vote per wallet
regardless of size (so one whale cannot dominate); R and the majority side as above.

**Trading:** enter the majority side when N >= 8 and R >= 0.75 (at least 87.5% agree). Exit when
R < 0.5, N < 5, or the majority flips. Equal notional per position (gross 1.0 x equity, max 6
positions, highest R x N first), positions under $10 skipped, reduce-only disaster stop 10% from
entry, same costs as other paper books. Perps with max leverage >= 2 only.

| Book | Direction |
|---|---|
| **consensus** | follow the majority |
| consensus-fade | the opposite side (control) |

**No backtest:** reconstructing these wallets' recent positions would be rigged; they are on the
leaderboard because those positions made money. Forward only. Every snapshot is stored, so honest
historical tests become possible as the data accumulates.

**Success criterion:** after 2 weeks and at least 30 closed trades in the follow book: follow net
P&L > 0 after costs and better than fade. Otherwise the idea is rejected.

## EXP-008: "Consensus take-profit"  -  EXP-007 plus a trailing stop  -  registered 2026-11-11, before testing

**Why:** on 2026-11-09 the consensus follow book was up $5.46 (+5.5%) on open positions and gave
nearly all of it back, because the crowd never broke consensus. EXP-008 asks whether locking in
gains beats holding until consensus breaks.

**Rules:** identical to the EXP-007 follow book (same signal, entries, sizing, signal exits, 10%
disaster stop), plus:
- Once a trade is +3% in our favour (at the executable bid/ask), the stop trails 2% behind the best
  price seen and only ever tightens. The first trailed stop locks in about +1% before costs.
- After a trailing-stop exit, that coin is not re-entered until its signal resets (R < 0.5, N < 5,
  or the majority flips), so the book does not buy straight back into the same move.

| Book | Exits |
|---|---|
| consensus | signal exits + 10% stop (EXP-007, unchanged) |
| **consensus-tp** | the same + trailing take-profit |

**Caveat:** consensus-tp starts on 2026-11-11 with a fresh $100 and enters whatever qualifies then,
while consensus holds positions opened on 2026-11-08. Compare the two over the same dates
(from 2026-11-11), not by total equity.

**Success criterion:** after 2 weeks and at least 20 closed trades in consensus-tp: its net P&L
since 2026-11-11 beats the consensus follow book's P&L over the same dates.

---

## EXP-009 / 010 / 011 / 012  -  registered 2026-11-11, before testing

Four additions requested by the owner: strategies with built-in profit taking, maker (limit-order)
fills where they fit, and a Monte Carlo layer. Fees: maker 0.015%, taker 0.045% (Hyperliquid base
tier; a maker fill costs a third of a taker fill). New simulator feature: a **maker entry** is a
resting limit that fills at its own price only after the market trades *through* it (best ask below
our bid, or best bid above our ask). Take-profits were already simulated this way.

### EXP-009: "Mean reversion"  -  Ornstein-Uhlenbeck + Monte Carlo exits (book `meanrev`)

- Every hour, per coin in the 31-coin universe (not BTC): x = log(coin / BTC) on 1h closes.
- Fit an OU process (AR(1)) to the last 720 hours. Trade only if the half-life is 6-72 hours.
- z = (x - mean) / stationary sd. Signal when |z| >= 2: short the coin when z > 0, long when z < 0.
- **Monte Carlo exits:** simulate 2,000 OU paths from z over 3 half-lives; for take-profit z in
  {0, 0.5, 1.0} and stop z in {3.5, 4, 5}, pick the pair with the highest expected net return after
  costs (maker entry; maker take-profit; taker stop and time exit + 0.1% slippage). Skip if no pair has
  positive expected value. Time stop at 3 half-lives.
- Entry: maker limit at the best bid (long) / ask (short), valid 1 hour. Levels are converted to coin
  prices with BTC held at its current price (single-leg trade, no BTC hedge: it carries market risk).
- Size: equity / 5 per trade, max 5 positions + pending orders; highest expected value first.

### EXP-010: "Hurst regime switch" (book `hurst`)

- Every 4 hours, per universe coin: Hurst exponent H of the last 360 4h log closes (variance scaling,
  lags 1-16 bars). Thresholds set from the measured distribution before testing returns: H >= 0.55
  (top ~7%) = trending, H <= 0.43 (bottom ~10%) = mean-reverting, otherwise no trade.
- Trending: EMA10/EMA30 direction, only if they crossed within the last 6 bars. Taker entry, stop
  2 x ATR14, **take-profit 4 x ATR14** (maker), time stop 10 days.
- Mean-reverting: z of close vs its 20-bar mean; |z| >= 2 fades the move with a maker limit 0.25 ATR
  beyond the close (valid 4 h), **take-profit at the 20-bar mean**, stop 1.5 ATR, time stop 3 days.
- Size equity / 6, max 6 positions.

### EXP-011: "Market making"  -  simplified Avellaneda-Stoikov (book `mm`)

- BTC and ETH, every 2 seconds from the live order-book feed. One bid and one ask per coin, $12 each.
- Half-spread = max(2 bps, 1.5 x 1-minute volatility). Quotes centre on a reservation price
  r = mid - (inventory / max inventory) x half-spread, so a long inventory lowers both quotes.
  Max inventory 3 clips per coin; at the limit only the reducing side is quoted. Post-only.
- Fill model, pessimistic on purpose (no queue visibility): a bid fills only if the best ask drops
  below it; an ask only if the best bid rises above it. All fills pay the maker fee.
- Kill switch: below $85 it flattens with taker orders and stops. Hourly funding on inventory.
- No backtest possible (needs tick data). Forward only.

### EXP-012: Monte Carlo layer

1. Exit levels in EXP-009 (above).
2. **Luck check** for every trade-based paper book (dashboard): sign-flip test. Null: no skill at
   choosing long vs short, so each closed trade's gross P&L was equally likely to have the opposite
   sign; costs are paid either way. p = share of 10,000 random-sign versions that did at least as well.
   Shown once a book has 10+ closed trades. p < 0.05 is "unlikely to be luck"; with this many books,
   expect one false positive in twenty.

**Success criteria (EXP-009, 010):** after 4 weeks and 30+ closed trades: net P&L > 0 after costs
and luck-check p < 0.10. **EXP-011:** positive equity after 4 weeks with fees included.
A backtest (`python -m app.research_new`) is run once, after this entry, and its result recorded
below without changing any rule.

### EXP-009 / 010 backtest results  -  run 2026-11-11 (Binance proxy, 2021-10 to 2026-11)

| Strategy | Trades | Avg / trade | Win | Dev 60% | Validation 20% | Out-of-sample 20% | Net on $100 |
|---|---|---|---|---|---|---|---|
| EXP-010 Hurst (all) | 2,301 | **-0.37%** | 38% | -0.56% (1,439) | +0.11% (379) | **-0.18%** (483) | -$141 |
| - revert leg | 2,033 | -0.23% | 39% | | | | |
| - trend leg | 268 | -1.39% | 29% | | | | |
| EXP-009 mean reversion | 1,260 | **-0.39%** | 52% | -0.04% (768) | -1.57% (244) | **-0.31%** (248) | -$98 |

Exits: Hurst 1,363 stops / 663 targets / 275 time; mean reversion 490 targets / 397 stops / 373 time.
(Net on $100 ignores the open-slot limit, so it overstates the size of the losses; the sign is what matters.)

**Verdict: both fail.** Negative in development and out-of-sample. Mean reversion wins more often
than not (52%) but its stops and time exits are larger than its take-profits; the single-leg design
(no BTC hedge) and the alt/BTC trends of 2024-25 are the likely reason. The Hurst trend leg is the
worst part. Rules are not changed after seeing this. Both keep paper trading only because the owner
asked for forward tests; nothing here justifies money.

---

## EXP-013: strategy search  -  six candidates, registered 2026-11-11, before testing

Owner's rule: backtest first, discard anything negative. To keep a six-way search honest, a candidate
**passes only if all of these hold** on Binance 2021-2026 (38 coins, Binance 8h funding, costs below):
1. net positive in development (first 60%), validation (next 20%) **and** out-of-sample (last 20%);
2. unlikely to be luck over the whole sample: sign-flip p < 0.05 (trade strategies) or daily-return
   t-stat > 2 (portfolio strategies);
3. reported, not gated: the Hyperliquid-data period (2026-04 to 2026-11).

Costs: taker 0.045% + 0.05% slippage per side; maker 0.015% where a limit order is stated; funding
paid/received on every open position from Binance history. No parameter is tuned after seeing results.

| # | Name | Rules |
|---|---|---|
| C1 | Time-series momentum (daily, all coins) | Long if 30d and 90d returns both > 0, short if both < 0, else flat. Weight = sign x min(1, 3% / 20d daily vol) / N coins; rebalanced daily; gross <= 1.5. |
| C2 | Donchian breakout (daily, per coin) | Close above prior 55d high -> long; below prior 55d low -> short. Exit on close beyond the prior 20d channel the other way; initial stop 2 x ATR20. $10 per trade. |
| C3 | Funding contrarian (market neutral) | Every 3 days rank coins by trailing 3-day mean funding; short the 5 highest, long the 5 lowest, 0.1 x equity each; hold 3 days. Collects funding and fades crowded sides. |
| C4 | Short-term reversal (cross-section) | Daily: long the 5 worst 1-day performers, short the 5 best, 0.1 x equity each, hold 1 day. |
| C5 | Hedged pairs (EXP-009 fixed) | As EXP-009 signal (OU on log(coin/BTC), half-life 6-72 h, |z| >= 2, checked every 4 h), but **both legs**: coin vs equal-notional BTC. Exit at z = 0.5 (take profit), |z| >= 4 (stop) or 3 half-lives. Taker on all four fills. |
| C6 | Volatility squeeze breakout (4h, per coin) | Bollinger(20, 2) width at its lowest 10% of the last 180 bars on the previous bar, then a close outside the band -> trade the break. Stop 1.5 x ATR14, take-profit 3 x ATR14 (maker), time stop 30 bars. |

Passing candidates go to paper trading; failures are recorded and dropped.

### EXP-013 results  -  run 2026-11-11 (Binance 2021-2026, costs and funding included)

| # | Candidate | Verdict | Whole sample | Dev / Val / OOS | HL period (2026-04..11) |
|---|---|---|---|---|---|
| C1 | Time-series momentum | fail (OOS < 0, t 1.44) | +17.9%/yr, max DD -36% | +134% / +11% / **-12%** | -12% |
| C2 | Donchian breakout | fail (validation < 0) | +10.2%/trade, win 29%, 1,243 trades | +16.7% / **-0.07%** / +1.8% per trade | -2.3%/trade |
| C3 | **Funding contrarian** | **PASS** | **+27.6%/yr, t 2.40**, max DD -33% | +169% / +23% / +33% | -4.3% |
| C4 | Short-term reversal | fail | -96%/yr (costs of daily turnover) | all negative | -35% |
| C5 | Hedged pairs | fail (luck p 0.90) | -0.29%/trade, 1,585 trades | all negative | -0.12%/trade |
| C6 | Squeeze breakout | fail (OOS < 0) | +0.04%/trade, 9,017 trades | +0.04% / +0.61% / **-0.49%** | -0.63%/trade |

**C3 checks (diagnostic only; the registered rules were not changed):**
- Sources per year: price +23.5%, funding received +14.8%, trading costs -10.7%. Funding was positive
  every year (+8% to +28%); price was +124% in 2021 and between -2% and +34% in other full years.
- Neighbouring settings all positive: 3/5/8 coins per side x 1/3/7-day holds = +21% to +28%/yr
  (t 1.5 to 2.9). The result is not a knife-edge parameter choice.
- Caveats: one pass out of six tests (a Bonferroni bar for six would be t > 2.6; C3 is 2.40); the
  most recent 7 months were -4.3%; 33% drawdowns happen. Paper only.

Decision: C3 goes to paper trading as book `funding` (Hyperliquid hourly funding, trailing 3 days,
31-coin universe, legs rounded up to the $10 minimum, 25% disaster stop as a safety net only).
C1, C2, C4, C5, C6 are dropped. EXP-009 and EXP-010 paper books removed from the lab.

---

## EXP-014 / EXP-015: owner-specified copy strategies  -  registered 2026-11-12, forward only

No backtest: a trader's past positions can only be reconstructed for traders chosen *because* those
positions made money (same reason as EXP-007). Both are judged on forward paper results.

**Trader pool (shared):** wallets from the latest leaderboard scan (every 2 days) that pass the EXP-007
signal-source rule, have a 90+ day record, a median hold >= 2 hours when known ("slower traders"),
an account >= $10k, and a P&L drawdown <= 50%. Drawdown here = worst fall of cumulative perp P&L
from its peak / max(peak P&L, account value). (The scan's own drawdown divides by the account value
at the peak and explodes for traders who withdrew profits; Shadow's registered filter is unchanged.)
Score = all-time perp P&L / max(dollar drawdown, 5% of peak). First pool: 36 traders.

### EXP-014 Majority-vote ensemble (book `ensemble`)
- Top 15 of the pool by score. Every 5 minutes read their positions; one vote per trader.
- Enter when >= 3 traders hold the coin on the same side and they are >= 2/3 of the traders holding it.
- Exit when that side drops below 2 traders, below 50%, or the majority flips.
- Equal size equity / 6, max 6 positions (most agreement first), stop 10% per position,
  portfolio stop at $85 (flatten and halt).

### EXP-015 Weighted multi-trader portfolio (book `weighted`)
- 6 traders: best score first, skipping anyone whose last-30-day daily P&L correlates > 0.7 with a
  trader already picked (diversity of styles).
- Allocation by inverse drawdown, normalised, max 35% per trader.
- Every minute: target per coin = sum over traders of allocation x (their position / their equity)
  x our equity (equity-proportional sizing). Caps: 25% of equity per coin, gross 1.5 x equity,
  max 10 positions, $10 minimum. Close when the target disappears or flips; resize only when 2x off.
- Stop 15% per position, portfolio stop at $85. Traders are re-selected after each new scan, so
  wallets that stop qualifying (e.g. unprofitable this month) are replaced.

**Success criteria:** after 4 weeks: net P&L > 0 after costs; ensemble vs weighted vs Shadow compared
over the same dates; luck check p < 0.10 once 30+ trades are closed.

---

## EXP-016..019: allocation methods over the EXP-014 trader pool  -  registered 2026-11-12, forward only

All use the EXP-014 pool and EXP-015 caps (25% of equity per coin, gross 1.5x, max 10 positions,
$10 minimum, 15% stop, $85 portfolio stop) unless stated. Returns of a trader = daily perp P&L /
current account value, last ~30 days.

- **EXP-016 HRP (`hrp`):** top 8 by score; Hierarchical Risk Parity weights (correlation distance
  sqrt((1 - rho) / 2), single-linkage clustering, quasi-diagonal order, recursive bisection by inverse
  cluster variance). Recomputed after each scan (every 2 days). Proportional copying as EXP-015.
- **EXP-017 Expert weighting (`experts`):** top 15; multiplicative weights, eta = 10, on each trader's
  hourly book return (their exposures x coin moves); fixed-share 2% so a cold trader can recover.
  Sleeping experts: no position and no position seen for 72 h -> excluded, weight frozen. Cluster
  penalty: traders with return correlation >= 0.5 form a cluster; effective weight / sqrt(cluster size).
  Our exposure per coin = weighted average exposure x equity.
- **EXP-018 Weighted + funding filter (`weighted-ff`):** EXP-015 unchanged, except a copy is skipped
  when our side pays extreme funding (long above +25%/yr, short below -25%/yr). Direct A/B with EXP-015.
  The pure funding book is EXP-013 C3.
- **EXP-019 Hybrid (`hybrid`):** correlation clusters (rho >= 0.5) with at most 3 traders per cluster,
  12 traders, HRP weights. Idea = coin where >= 3 traders and >= 60% of the HRP weight holding it
  agree; exit below 50%, below 2 traders, or flip. Funding filter as EXP-018. Regime: risk x 0.5 when
  the Kuramoto market index is not synchronised. Sizing: fixed-fractional, 0.5% (60% agreement) to
  2% (100%) of equity at risk per idea at a 10% stop; total risk <= 8%, gross <= 1x; ideas under $7
  skipped, others rounded up to $10.

**Execution (all PaperBook accounts from 2026-11-12, including funding/ensemble/weighted):** entries
are IOC limit orders 3 ticks through the best price, filled against the live Hyperliquid order book;
anything beyond the limit is left unfilled. Closes walk the book. Older accounts keep the flat
0.1% slippage model.

**Success criteria:** after 4 weeks, net P&L > 0; compare against EXP-015 (weighted) over the same dates.

---

## EXP-020..023  -  registered 2026-11-12, before testing

**EXP-020 Random control (`weighted-random`).** EXP-015 rules exactly (inverse-drawdown allocation,
same caps and stops), but the 6 traders are drawn at random from all signal-source wallets of the
latest scan (the 79-wallet stage, before the pool's extra filters and ranking). Seed = scan timestamp,
redrawn after each scan. If it matches the selected-trader strategies, our selection adds nothing.

**EXP-021 Wide ensemble (`ensemble-wide`).** EXP-014 rules exactly, but voters = the whole pool with at
most 3 traders per correlation cluster (rho >= 0.5), instead of the top 15 by score. Tests whether
more independent voters beat fewer top-ranked ones.

**EXP-022 Take-profit twins (`weighted-tp`, `ensemble-tp`).** EXP-015 / EXP-014 unchanged, plus the
EXP-008 trailing take-profit: once a position is +3%, its stop trails 2% behind the best price seen.
After a trailing exit the coin is not re-entered on that side until the strategy stops wanting it
(target gone or flipped / vote exit condition). Compare each with its twin over the same dates.

**EXP-023 Funding contrarian + take-profit (backtest first).** EXP-013 C3 unchanged, plus: a leg is
closed with a maker limit when it is +5% in our favour (daily high/low touch); its slot stays empty
(no funding, no exposure) until the next 3-day rebalance, where it pays a taker re-entry if selected
again. Pass = EXP-013 rules (positive in all three periods, t > 2) **and** better than C3 in at least
2 of the 3 periods. Only then does it get a paper account.

### EXP-023 result  -  run 2026-11-12

| | Whole sample | First 60% | Next 20% | Last 20% | HL period |
|---|---|---|---|---|---|
| C3 funding contrarian | +27.6%/yr, t 2.39 | +169% | +24% | +32% | -4.4% |
| C3 + 5% take-profit | +23.8%/yr, t 2.17 | +228% | **-19%** | +33% | -17.6% |

**Fails** (negative in validation). It beats C3 in 2 of 3 periods, but the pass rule also needs all
three positive. Taking profit at +5% cuts the winning legs while the losers stay open, and the
emptied slots stop collecting funding. Not paper traded; C3 keeps running without a take-profit.

**Correction 2026-11-12 (before any results):** the trader clusters used by EXP-017 (cluster penalty),
EXP-019 (max 3 per cluster) and EXP-021 were built with single linkage, which chains traders together
(A~B~C) and put 27 of the 36 pool traders into one cluster. Changed to complete linkage (every pair in a
cluster correlates >= 0.5): 20 clusters, largest 5; EXP-021 now has 32 voters instead of 12. Those three
books re-selected their traders at 09:04 UTC. HRP keeps single linkage, as in the standard method.

---

## Incident 2026-11-12/13: `weighted-ff` and `weighted-random` halted for ~27 h

On 2026-11-12 10:46 UTC both books emergency-closed a HYPE position and halted with "open position has
no verified protective stop". Cause: a race, not a missing stop. The scheduler runs jobs in parallel
threads, and a book's `poll` (position sync, which checks every open trade has a resting stop) ran in the
middle of the same book's `step` (between cancelling a stop and closing the position, or between
recording a new trade and placing its stop). **Fix:** one re-entrant lock per book in `app/lab.py`,
held by every job that touches that book (step, poll, funding accrual, trader refresh, rebalance).
Halts cleared 2026-11-13 14:11 UTC after the fix. Both books were flat (no new entries) between
those times; compare them with their twins on dates outside that window, or note the gap.

The same race could have hit any book with separate step and poll jobs (consensus, copy, funding,
the elite books); none did.

## EXP-024: "Fast trend"  -  4H trend filter + 1H breakout  -  registered 2026-11-13

**Why:** on 2026-11-13 BTC fell about 4% in 12 hours and no BTC/ETH book traded. The slow books need
daily EMA50 < EMA200 (pullback; BTC's EMA50 was still ~2.7% above its EMA200) or a fresh 4H EMA20/50
cross (firefly/control/placebo; the last one was on 2026-11-05). EXP-024 asks whether a strategy that
reacts within hours to moves inside an established 4H trend has an edge after costs.

**Rules as registered (before testing), BTC and ETH:**
- Trend, last completed 4H bar: bearish if EMA20 < EMA50 and close < EMA50; bullish is the mirror.
- Entry: the last completed 1H close breaks the low (short) / high (long) of the previous 12 1H bars,
  in the trend's direction. Taker entry.
- Stop 1.5 x ATR14(4H). Once +1R, the stop trails 1.5 x ATR behind the best price seen.
- Exit also when the 4H EMA20/50 order turns against the trade, or after 7 days. 4 h re-entry cooldown.
- 1% of equity at risk per trade, notional at most 1x equity, at most 2 positions.

**Pass rule (EXP-013 style):** positive expectancy after costs in the whole sample and in each of the
first 60% / next 20% / last 20% of trades, with t > 2. Costs: 0.045% taker + 5 bps slippage per side.

### EXP-024 result  -  run 2026-11-13 (Binance 1H/4H 2021-09 to 2026-11; Hyperliquid 2026-04 to 2026-11)

| Variant (breakout h / stop ATR / trail ATR / trail starts) | Binance trades | Whole | 60% | 20% | 20% | t | HL whole |
|---|---|---|---|---|---|---|---|
| **registered: 12 / 1.5 / 1.5 / +1R** | 1397 | -0.036R | -0.044R | -0.006R | -0.045R | -1.05 | -0.095R |
| chosen for paper: 24 / 2.5 / 3.0 / +1R | 716 | +0.057R | +0.014R | +0.142R | +0.099R | +1.08 | +0.073R |

**The registered version fails** (negative in every period). Costs are about 0.08R per trade at a
1.5-ATR stop, and the 1.5-ATR trail exits winners at about +1R, so the small gross edge disappears.
A 16-variant grid (breakout 12/24 h x stop 1.5/2.5 ATR x trail 1.5/3 ATR x trail start +1/+2R) found
no variant with t > 2. The variant above is the only one positive in all four Binance periods and
all four Hyperliquid periods, but t = 1.08 after searching 16 variants is consistent with no edge.

**Decision (owner request):** paper-trade the chosen variant as book `fasttrend` from 2026-11-13,
knowing it did not pass. Expect roughly break-even. It runs on the same 5 bps slippage as the BTC/ETH
books. Forward criterion: after 4 weeks and at least 30 closed trades, net P&L > 0 after costs;
otherwise drop it. Code: `app/fast_trend.py` (rules + backtest), `FastTrendBook` in `app/lab_books.py`.
