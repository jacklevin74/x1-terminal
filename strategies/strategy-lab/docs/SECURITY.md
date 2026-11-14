# Security

## What this application can and cannot do

| Capability | v1 |
|---|---|
| Read public market data | yes |
| Simulate orders (paper) | yes |
| Place/cancel orders on Hyperliquid **testnet** | yes, with an approved agent wallet |
| Place orders on mainnet | **no**: no code path exists, and the adapter refuses the mainnet URL |
| Withdraw, transfer, deposit, approve agents | **no**: not implemented (a test asserts this) |
| Change risk limits at runtime | no: config is frozen and validated against hard limits in code |

## Credentials

- **Never** give the application, Claude, or any prompt your main wallet's seed phrase or private key.
- Trading uses a dedicated Hyperliquid **agent wallet** approved by the account owner. Agent wallets
  can sign orders but cannot withdraw funds. Revoke it from the Hyperliquid UI at any time.
- The agent key lives in a file outside the repository. The adapter refuses to load it if the file is
  readable by group or others (`chmod 600`).
- `ANTHROPIC_API_KEY` and Telegram credentials live in `.env`, which is git-ignored.
- Separate credentials per environment. Do not reuse a testnet agent key for mainnet.
- Claude receives only indicator values, rule checks, equity and risk budget. A test checks that the
  snapshot contains no key, secret or token fields.
- Errors from Telegram are logged by exception type only, because the request URL contains the bot token.

## Operational

- Run the trader as an unprivileged user (the Dockerfile does this).
- Keep `data/trader.db` backed up: it holds the audit log, the halt state, and the paper exchange state.
- After any halt, read the `events` table (or the dashboard) before running `clear-halt`.
- Before any future mainnet module, complete the 9-item checklist in `python -m app.main gates` and
  have that module reviewed separately. Meeting the gates does not by itself enable anything.
