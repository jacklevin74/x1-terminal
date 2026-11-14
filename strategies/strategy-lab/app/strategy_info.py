"""Plain-language description of every paper account, shown on the Strategy Lab page.

Keys are book names (paper account mode = "paper-<book>"). Keep each field to a sentence or two.
"""
from __future__ import annotations

FAMILIES = {
    "copy": "Copy top traders",
    "signal": "Market signal",
    "trend": "Trend following",
    "mm": "Market making",
}

INFO: dict[str, dict[str, str]] = {
    "funding": {
        "name": "Funding contrarian", "family": "signal", "exp": "EXP-013 C3",
        "what": "Bets against crowded trades. When longs pay a high funding rate to hold a coin, the crowd is "
                "leaning long, so it shorts that coin; it buys the coins where shorts pay the most.",
        "when": "Every 3 days it ranks 31 coins by their average funding over the last 3 days.",
        "exits": "Positions are swapped at the next 3-day rebalance. A 25% stop is only a safety net.",
        "sizing": "10 positions of 10% of the account each: 5 long, 5 short, so market moves mostly cancel out.",
        "evidence": "The only one of six candidates that passed the 5-year backtest: +27.6%/yr, positive in every "
                    "period, funding income every year. Last 7 months of the backtest were -4%. A +5% take-profit "
                    "version failed its backtest (EXP-023), so this one has none.",
    },
    "ensemble": {
        "name": "Majority-vote ensemble", "family": "copy", "exp": "EXP-014",
        "what": "Watches 15 elite traders and only trades a coin when most of them agree on the direction.",
        "when": "Every 5 minutes. Enters when at least 3 traders hold the coin on the same side and they are at "
                "least two thirds of the traders holding it.",
        "exits": "When agreement falls below half, fewer than 2 remain, or the majority flips. Stop 10%.",
        "sizing": "Up to 6 equal positions (1/6 of the account each). Whole account stops at $85.",
        "evidence": "Forward test only: traders' past positions cannot be replayed without bias.",
    },
    "weighted": {
        "name": "Weighted portfolio", "family": "copy", "exp": "EXP-015",
        "what": "Copies 6 traders at once, scaled to our account size. Traders who have had smaller drawdowns get "
                "a bigger share; traders who trade alike are not picked together.",
        "when": "Every minute it compares our positions with the traders' combined positions.",
        "exits": "Closes when the traders close or flip; resizes only when 2x off target. Stop 15%.",
        "sizing": "Our size = their size x (our share of capital / their equity). Max 25% of the account per coin, "
                  "1.5x the account in total. Whole account stops at $85.",
        "evidence": "Forward test only.",
    },
    "hrp": {
        "name": "HRP portfolio", "family": "copy", "exp": "EXP-016",
        "what": "Like the weighted portfolio, but capital is split across 8 traders with Hierarchical Risk Parity: "
                "traders are grouped by how alike their daily results are, then each group gets less money the "
                "more volatile it is. One bad trader or one crowded style can't dominate.",
        "when": "Every minute (positions); weights recomputed after each leaderboard scan, every 2 days.",
        "exits": "Same as the weighted portfolio. Stop 15%.",
        "sizing": "Same caps: 25% per coin, 1.5x in total, account stop at $85.",
        "evidence": "Forward test only.",
    },
    "experts": {
        "name": "Expert weighting", "family": "copy", "exp": "EXP-017",
        "what": "Treats 15 traders as experts and learns who is currently good: every hour each expert's weight "
                "grows or shrinks with the profit its positions made. Inactive traders are put to sleep and keep "
                "their weight; traders who move together share one vote.",
        "when": "Positions every minute, weights every hour.",
        "exits": "Same as the weighted portfolio. Stop 15%.",
        "sizing": "Our exposure = weighted average of the experts' exposure, same caps.",
        "evidence": "Forward test only. Method: the 'aggregating algorithm' from online learning.",
    },
    "weighted-ff": {
        "name": "Weighted + funding filter", "family": "copy", "exp": "EXP-018",
        "what": "The weighted portfolio, but it refuses copies that pay extreme funding (a long above +25%/yr or a "
                "short below -25%/yr). Those crowded trades are the ones most likely to get squeezed.",
        "when": "Every minute.",
        "exits": "Same as the weighted portfolio. Stop 15%.",
        "sizing": "Same as the weighted portfolio.",
        "evidence": "Forward test only. Compare it directly with 'Weighted portfolio' to see what the filter adds.",
    },
    "hybrid": {
        "name": "Hybrid stack", "family": "copy", "exp": "EXP-019",
        "what": "Everything combined: 12 traders picked across different styles (at most 3 per group), weighted "
                "by HRP; trades only coins where most of that weight agrees; skips trades fighting extreme "
                "funding; halves risk when the market is not moving in sync (Kuramoto filter).",
        "when": "Every 2 minutes.",
        "exits": "When weighted agreement falls below 50% or flips. Stop 10%.",
        "sizing": "Each idea risks 0.5% to 2% of the account depending on agreement, at most 8% across all ideas "
                  "and 1x the account in total. Account stop at $85.",
        "evidence": "Forward test only.",
    },
    "weighted-random": {
        "name": "Random control", "family": "copy", "exp": "EXP-020",
        "what": "The weighted portfolio's exact rules, but its 6 traders are drawn at random from all 79 active "
                "profitable traders instead of picked by our filters and ranking.",
        "when": "Every minute; a new random draw after each leaderboard scan.",
        "exits": "Same as the weighted portfolio. Stop 15%.", "sizing": "Same as the weighted portfolio.",
        "evidence": "Control group: if it does as well as the selected-trader strategies, our selection adds nothing.",
    },
    "ensemble-wide": {
        "name": "Wide ensemble", "family": "copy", "exp": "EXP-021",
        "what": "The majority vote, but every trader in the pool votes, with at most 3 from any group of traders "
                "who trade alike, so one style cannot outvote the rest.",
        "when": "Every 5 minutes.", "exits": "Same as the majority-vote ensemble. Stop 10%.",
        "sizing": "Same as the majority-vote ensemble.",
        "evidence": "Compare with the 15-trader ensemble: are more independent voters better than fewer top ones?",
    },
    "weighted-tp": {
        "name": "Weighted + take-profit", "family": "copy", "exp": "EXP-022",
        "what": "The weighted portfolio plus profit taking: once a position is up 3%, a stop follows 2% behind "
                "the best price. After it fires, the coin is not bought back until the traders let go of it.",
        "when": "Every minute.", "exits": "Trailing take-profit, plus every weighted-portfolio exit.",
        "sizing": "Same as the weighted portfolio.",
        "evidence": "Compare with the weighted portfolio over the same dates.",
    },
    "ensemble-tp": {
        "name": "Ensemble + take-profit", "family": "copy", "exp": "EXP-022",
        "what": "The majority-vote ensemble plus the same trailing take-profit (+3% activates, 2% trail).",
        "when": "Every 5 minutes.", "exits": "Trailing take-profit, plus every ensemble exit.",
        "sizing": "Same as the majority-vote ensemble.",
        "evidence": "Compare with the majority-vote ensemble over the same dates.",
    },
    "copy": {
        "name": "Shadow copy", "family": "copy", "exp": "EXP-006",
        "what": "Copies the few traders that pass the strictest leaderboard rules (directional, slow, 90+ day "
                "record), averaging their positions.",
        "when": "Every minute. Traders that empty their account, go quiet for 7 days or fail a new scan are dropped.",
        "exits": "When the traders close or flip. Stop 10%.",
        "sizing": "Up to 6 positions, 1.5x the account in total.",
        "evidence": "Forward test only.",
    },
    "consensus": {
        "name": "Consensus follow", "family": "copy", "exp": "EXP-007",
        "what": "Kuramoto synchrony applied to 244 profitable traders: follows a coin when almost all of the "
                "traders holding it are on the same side.",
        "when": "Every 5 minutes: at least 8 holders and 87.5%+ on one side.",
        "exits": "When agreement drops below 75/25, fewer than 5 hold it, or the majority flips. Stop 10%.",
        "sizing": "Up to 6 equal positions.",
        "evidence": "Forward test only.",
    },
    "consensus-tp": {
        "name": "Consensus + take-profit", "family": "copy", "exp": "EXP-008",
        "what": "Same trades as Consensus follow, plus profit taking: once a trade is up 3%, a stop follows 2% "
                "behind the best price.",
        "when": "Same as Consensus follow.",
        "exits": "Trailing stop, plus every Consensus exit.",
        "sizing": "Same as Consensus follow.",
        "evidence": "Forward test. Compare with Consensus follow from 2026-11-11 on.",
    },
    "consensus-fade": {
        "name": "Consensus fade (control)", "family": "copy", "exp": "EXP-007",
        "what": "Takes the opposite side of every Consensus trade. If this one wins, following the crowd is wrong.",
        "when": "Same as Consensus follow.", "exits": "Same.", "sizing": "Same.",
        "evidence": "Control group for Consensus follow.",
    },
    "mm": {
        "name": "Market making", "family": "mm", "exp": "EXP-011",
        "what": "Keeps a buy and a sell limit order on BTC and ETH and earns the gap between them. When it builds "
                "up a position it shifts both prices to unload it.",
        "when": "Every 2 seconds.",
        "exits": "Profit is taken by the opposite order filling. Stops and flattens below $85.",
        "sizing": "$12 orders, at most 3 orders' worth held per coin.",
        "evidence": "Forward only. Simulated fills are pessimistic: an order fills only when the price moves "
                    "through it.",
    },
    "momentum": {
        "name": "Relative strength", "family": "signal", "exp": "EXP-005",
        "what": "Each Monday buys the 3 coins that rose most over 28 days and shorts the 3 that fell most.",
        "when": "Weekly.", "exits": "Next Monday's rebalance, or a 3x daily-range stop.",
        "sizing": "6 equal positions.",
        "evidence": "Backtest profit came almost entirely from 5 coin manias; risky (65% drawdowns).",
    },
    "firefly": {
        "name": "Firefly", "family": "trend", "exp": "EXP-003",
        "what": "BTC/ETH trend following, but only while the whole market moves in sync (Kuramoto filter).",
        "when": "Rarely: about once every 6 weeks in the backtest.",
        "exits": "Trailing stop or the trend reversing.", "sizing": "Risks 0.5% of the account per trade.",
        "evidence": "Passed its backtest on few trades (+$3.70 on $100 over 5 years).",
    },
    "control": {
        "name": "Trend control", "family": "trend", "exp": "EXP-003",
        "what": "Same trend trades as Firefly with no synchrony filter.",
        "when": "A few times a month at most.", "exits": "Same as Firefly.", "sizing": "Same as Firefly.",
        "evidence": "Control group for Firefly.",
    },
    "placebo": {
        "name": "Trend placebo", "family": "trend", "exp": "EXP-003",
        "what": "Same trend trades, but only when the market is NOT in sync. Should do worst if Firefly is right.",
        "when": "Rarely.", "exits": "Same as Firefly.", "sizing": "Same as Firefly.",
        "evidence": "Control group for Firefly.",
    },
    "pullback-trail": {
        "name": "Pullback + trailing stop", "family": "trend", "exp": "EXP-001",
        "what": "Buys dips inside a BTC/ETH uptrend (sells rallies in a downtrend).",
        "when": "Rarely.", "exits": "Trailing stop.", "sizing": "Risks 0.5% of the account per trade.",
        "evidence": "Failed its backtest; kept as a reference.",
    },
    "pullback-fixed": {
        "name": "Pullback, fixed target", "family": "trend", "exp": "original",
        "what": "The original strategy: pullback entries with a fixed 2:1 profit target.",
        "when": "Rarely.", "exits": "Target at 2x the risk, or the stop.", "sizing": "Risks 0.5% per trade.",
        "evidence": "Failed its backtest; kept as a reference.",
    },
}
