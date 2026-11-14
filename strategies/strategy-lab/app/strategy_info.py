"""Plain-language description of every paper account, shown on the Strategy Lab page.

Keys are book names (paper account mode = "paper-<book>"). Keep each field to a sentence or two.
"""
from __future__ import annotations

FAMILIES = {'trend': 'Trend following', 'signal': 'Market signal'}

INFO: dict[str, dict[str, str]] = {'firefly': {'name': 'Firefly',
             'family': 'trend',
             'exp': 'EXP-003',
             'what': 'BTC/ETH trend following, but only while the whole market moves in sync (Kuramoto '
                     'filter).',
             'when': 'Rarely: about once every 6 weeks in the backtest.',
             'exits': 'Trailing stop or the trend reversing.',
             'sizing': 'Risks 0.5% of the account per trade.',
             'evidence': 'Passed its backtest on few trades (+$3.70 on $100 over 5 years).'},
 'control': {'name': 'Trend control',
             'family': 'trend',
             'exp': 'EXP-003',
             'what': 'Same trend trades as Firefly with no synchrony filter.',
             'when': 'A few times a month at most.',
             'exits': 'Same as Firefly.',
             'sizing': 'Same as Firefly.',
             'evidence': 'Control group for Firefly.'},
 'placebo': {'name': 'Trend placebo',
             'family': 'trend',
             'exp': 'EXP-003',
             'what': 'Same trend trades, but only when the market is NOT in sync. Should do worst if Firefly '
                     'is right.',
             'when': 'Rarely.',
             'exits': 'Same as Firefly.',
             'sizing': 'Same as Firefly.',
             'evidence': 'Control group for Firefly.'},
 'momentum': {'name': 'Relative strength',
              'family': 'signal',
              'exp': 'EXP-005',
              'what': 'Each Monday buys the 3 coins that rose most over 28 days and shorts the 3 that fell '
                      'most.',
              'when': 'Weekly.',
              'exits': "Next Monday's rebalance, or a 3x daily-range stop.",
              'sizing': '6 equal positions.',
              'evidence': 'Backtest profit came almost entirely from 5 coin manias; risky (65% drawdowns).'}}
