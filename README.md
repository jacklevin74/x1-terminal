# X1 Terminal

X1-branded Hyperliquid terminal, based on [HypeTerminal](https://github.com/vipineth/hypeterminal). The upstream MIT [license](LICENSE) and [README](README.upstream.md) are preserved. Read [x1-terminal-brief.md](x1-terminal-brief.md) for scope and [BUILD-REPORT.md](BUILD-REPORT.md) for verification and remaining work.

## Run locally

Use Node 22.19+ and pnpm 10.34.9 (declared in package.json).

```sh
npm install -g pnpm@10.34.9
pnpm install --frozen-lockfile --ignore-scripts
cp .env.example .env
pnpm dev
```

Set `VITE_BUILDER_ADDRESS` in the root `.env` to your public Ethereum builder address. Never enter a private key. Without a valid nonzero builder address, markets remain available but setup and order submission are blocked. Vite reads environment files from the repository root.

Testnet is the default. Settings and the testnet banner allow switching networks; switching reloads the app. `VITE_HYPERLIQUID_TESTNET=false` changes the default to mainnet for new sessions.

```sh
pnpm typecheck
pnpm build
pnpm --filter @hypeterminal/terminal test -- src/lib/tests/x1-provider.test.ts src/lib/tests/x1-config.test.ts src/lib/tests/x1-orders.test.ts src/lib/tests/wagmi-config.test.ts src/lib/tests/wallet-modal.test.tsx src/lib/tests/agent-snapshot-cache.test.ts src/lib/tests/l1-agent-signing.test.ts
```

The static output is `apps/terminal/dist`. This fork starts with Vite and TanStack Router directly, retaining upstream React components, routes, and Hyperliquid hooks. It does not need a production Node server or TanStack Start prerendering.

## Wallets and approvals

Only Phantom and X1 Wallet are offered. Phantom uses `window.phantom.ethereum`, Ethereum accounts, and EIP-712 signing; Wagmi reconnects previously authorized accounts without an interactive connect prompt. Other injected wallets and WalletConnect are disabled.

X1 is detected at `window.x1_wallet`, falling back to `window.x1Wallet`. Before connecting, the user acknowledges the derived-account model. The wallet signs the UTF-8 message `x1-terminal-hyperliquid-key-v1`. The returned signature may be raw bytes or base64, either directly or inside `{ signature }`. It is normalized to exactly 64 bytes, hashed with keccak256, and used as an Ethereum private key. The account address is displayed in the wallet menu and setup screen. Withdrawals are signed by that derived key. Identical signatures must be returned across reconnects; verify that behavior with the actual X1 extension before funding an account.

The X1-derived wallet key uses sessionStorage only. Trading-only agent keys are saved in localStorage on this device (with sessionStorage fallback) and reused only while their on-chain approvals remain valid. Neither key is sent to a backend. Reloading the page restores the cached X1-derived account without another signature. A native-wallet account mismatch, corrupted cache, or explicit disconnect discards that session. When the tab’s session storage is gone, reconnecting requires signing again. The inherited mobile key-transfer route is disabled.

Choose “Trading setup” in the account menu or “Enable Trading” in order entry. One screen explains both approvals, then performs `approveBuilderFee` (0.05%) and `approveAgent` sequentially, skipping existing approvals after checking `maxBuilderFee` and agent status. Every order through the shared exchange hook includes `{ b: VITE_BUILDER_ADDRESS, f: 50 }`, overriding caller-supplied builder parameters. The address is normalized to lowercase.

Hyperliquid requires the builder to hold at least 100 USDC of perps account value to collect fees. Protocol fee caps are 0.1% for perps and 1% for spot. Builder fees do not apply to spot buys; see the [protocol documentation](https://hyperliquid.gitbook.io/hyperliquid-docs/trading/builder-codes).

## Position PNL cards

In Positions, click the share/view icon beside a position’s PNL (also available on mobile). The X1-branded card displays its market, DEX where applicable, long/short side, leverage, return on equity, unrealized dollar PNL, entry price, and current mark price. The values update while the card is open. **Download PNG** saves a 2400×1520 image of the current snapshot. The card contains no wallet address or private account credentials, and viewing/downloading it does not submit an order.

## Native ETH deposits inside X1 Terminal

Open **Deposit** and select **ETH** on mainnet. The terminal requests a Unit ETH deposit address for the connected Hyperliquid account and verifies attestations from at least two pinned Unit guardians before displaying it. Copy the displayed Ethereum deposit address. Phantom users can enter an ETH amount and approve the native transfer directly in the terminal. X1-derived accounts can receive funds sent from another Ethereum wallet or exchange to the generated address.

Only native ETH on Ethereum mainnet is accepted by this route. The current documented minimum is 0.007 ETH; smaller deposits cannot be processed. Unit processing fees and Ethereum sending gas apply. The UI fetches fee and arrival estimates, and distinguishes an Ethereum receipt from final Hyperliquid credit. ETH arrives in Hyperliquid **spot**; it is not automatically converted to USDC. Use the terminal’s existing spot trading interface to sell ETH if USDC is required.

The address follows the connected trading account, not `VITE_BUILDER_ADDRESS`. Changing accounts clears the previous address and transfer state. Testnet is blocked for this mainnet route. The separate **USDC · Arbitrum** option and **Bridge** tab remain available.

Unit API details: [address generation](https://docs.hyperunit.xyz/developers/api/generate-address), [guardian verification](https://docs.hyperunit.xyz/developers/api/generate-address/guardian-signatures), [fee estimates](https://docs.hyperunit.xyz/developers/api/estimate-fees). No API key is needed. If address generation or signature verification fails, the UI shows an error and retry control rather than an unverified address.

## Native SOL deposits

Open **Deposit** and select **SOL** to copy its Unit address. For an amount-based wallet transfer, open the dropdown beside the header **Deposit** button and choose **Deposit from wallet**. Unit generates a native Solana address for the connected Ethereum-format Hyperliquid account. The app verifies at least two trusted guardian attestations before displaying it. Solana addresses are case-sensitive; unlike Ethereum addresses, they are never lowercased during signature verification.

The main Deposit modal shows the verified address for an external Solana wallet or exchange. When connected with Phantom, **Send SOL with Phantom** connects `window.phantom.solana`, builds a native SOL transfer, checks mainnet and sufficient balance for the amount plus network fee, then requests approval. The Phantom Solana source address can differ from the Hyperliquid recipient account; it does not change the trading account. The minimum is 0.12 SOL with at most nine decimal places. Unit processing fees and Solana network fees apply. SOL arrives in Hyperliquid spot and is not automatically swapped to USDC.

The optional public build variable `VITE_SOLANA_RPC_URL` configures a browser-accessible mainnet RPC for the send button; the default is `https://solana-rpc.publicnode.com`. A cluster check rejects devnet/testnet endpoints. Public RPCs can rate-limit browser traffic; copying the deposit address works independently of RPC access. This URL is bundled into browser code and must not contain server-only secrets. Changing the connected Hyperliquid account clears the previous address and transfer state.

## Deploy as a separate Vercel project

For the configured mainnet build, run `npm run deploy:vercel` from this checkout on your Mac. It signs in to Vercel if necessary and deploys production to the separate project `x1-terminal-20261029`, supplying the configured public builder address and mainnet selection at build time. It does not upload `.env` or credentials. Successful deployment prints the live URL. The following dashboard steps are the alternative for configuring a new project manually.


1. Push this repository to a new GitHub repository.
2. In Vercel, choose **Add New → Project**, import that repository, and give it a new project name. Do not link an existing project.
3. Use the repository root as Root Directory and **Other** for the framework. The included `vercel.json` declares the install command, build command, static output, and SPA rewrite.
4. Select Node 22.x or newer. Add `VITE_BUILDER_ADDRESS` and `VITE_HYPERLIQUID_TESTNET=true` to Preview and Production environment settings. These are build-time public values; redeploy after changing them.
5. Deploy. Branch pushes create preview deployments. Open the preview and complete the real-wallet checklist in BUILD-REPORT.md on testnet before enabling mainnet.

CLI alternative, from a checkout with Vercel CLI installed:

```sh
vercel login
vercel link
# Select Create a new project, rather than linking an existing project.
vercel env add VITE_BUILDER_ADDRESS preview
vercel env add VITE_HYPERLIQUID_TESTNET preview
vercel deploy
```

No X1 deposit bridge, XNT rewards, xDEX, Privy, or copy trading is implemented in this build. Upstream deposit/withdrawal interfaces remain; the proposed X1 bridge is separate future work.

## X1 wallet SOL balance and deposit

With X1 Wallet connected, open the dropdown beside the header **Deposit** button and choose **Deposit from wallet → SOL · Solana**. The SOL balance loads automatically. The terminal reads native SOL at the wallet’s public key from Solana mainnet and displays the source address, balance, and maximum spendable amount. Enter an amount or choose Max, which leaves the estimated network fee plus a 5,000-lamport reserve. Click **Deposit** and approve signing. The wallet signs the transfer; the terminal verifies that the signed transaction still matches the reviewed source, destination, amount, and mainnet blockhash before broadcasting through the validated mainnet RPC. It does not use X1’s chain for broadcast. The receiving account remains the connected derived Hyperliquid address. The flow rechecks source account and balance before sending, and blocks amounts below Unit’s 0.12 SOL minimum. Phantom uses the same balance and amount controls.

## Desktop positions layout

The desktop Positions table now uses Market, Size, Position Value, Entry Price, Mark Price, PNL (ROE %), Liq. Price, Margin, Funding, and Close All/actions columns. Leverage and DEX tags sit beside the plain market name; PNL and ROE share one line with the PNL-card link. Position Value can be sorted. Limit, Market, and Reverse actions are exposed directly. Close All requires confirmation and processes market closes sequentially, stopping after a failure or account change. Trailing is disabled because a trailing-stop engine is not implemented. TP/SL remains accessible from the market row’s hover/focus control. Narrow screens can scroll the full desktop table horizontally; the dedicated mobile card layout remains available.

## SOL amount entry and refresh reconnect

The main Deposit dialog always displays the verified SOL destination address with a copy button. When SOL is selected, it also automatically loads the connected native wallet’s balance and displays Amount, Max, and Deposit directly in the same dialog. The destination remains visible while an amount is entered. The destination is Unit’s address for the connected Hyperliquid account, not the wallet’s source address.

X1 accounts reconnect across page refreshes from the tab’s existing session key, without a new message signature. The application observes native account changes and discards mismatched or invalid cached sessions. Explicit Disconnect clears the session and stays disconnected after refresh. Wallet initialization events trigger another reconnect check when the extension injects late. Derived private keys remain in sessionStorage only; they are not persisted across closed sessions.

### Restricted-jurisdiction notice

Vercel deployments check `/api/jurisdiction` before mounting trading providers. The endpoint uses Vercel’s `x-vercel-ip-country` header and blocks US access with the configured restriction message. Additional ISO country codes can be supplied in the server-only `RESTRICTED_COUNTRIES` environment variable (comma-separated); US is always included. Responses are not cached. Existing connected X1 accounts can still export their derived key from the notice screen.

Local Vite does not supply IP-country headers. A missing location endpoint, unknown country, or ordinary fetch failure is not treated as proof of a restricted location; upstream service eligibility restrictions still apply. Deploy the function and frontend together for the country-based notice.

### Local builder analytics JSON API

The JSON endpoint reads local files only. It makes no RPC calls or remote archive requests. Local files are the storage, not a way to discover traders: populate them with a CSV/JSON export from a builder-fill source or indexer. No real trader records are bundled or fabricated.

```bash
npm run analytics:import -- /absolute/path/to/fills.csv
npm run analytics:dev
```

Open **http://localhost:8788/analytics** for the table, or `http://localhost:8788/api/builder-users` for raw JSON. The leaderboard shows one row per address, ranked by realized PNL descending: Rank, Address, Fills, Volume, Realized PNL and Fees. Totals are sums of recorded values without currency conversion. Search by address, copy addresses, and refresh manually or automatically every 30 seconds. Recorded fees remain visible when another fill lacks a fee, marked with an asterisk; all-missing fees display as unavailable. Asset/quote breakdowns and additional fee columns are not shown. Restart an already-running analytics server once after this update. Imported files are reread on every request; further imports do not require restart. The Vite dev server proxies this API to port 8788 after restart.

Data lives under ignored `data/analytics/fills/`, configurable with `BUILDER_ANALYTICS_DATA_DIR`. CSV, JSON, and `.csv.lz4` files are supported. The importer validates all inputs and writes normalized JSON atomically. Reimporting identical data does not duplicate it. Overlapping fills with the same trader and trade ID are deduplicated. Fills without a trade ID are retained because identical-looking executions may be distinct trades.

CSV columns are `time,user,coin,px,sz,closed_pnl,builder_fee` plus optional `tid`. See the header-only [template](examples/analytics/fills.csv). JSON accepts an array or `{ "fills": [...] }`, with fields `time`, `user`, `coin`, `px`, `sz`, `closedPnl`, `builderFee` and optional `tid`. Use decimal strings for amounts and ISO UTC or millisecond timestamps. Include `builder` on records when available; records explicitly assigned to a different builder are excluded. Attribution without that field is supplied by the imported file, not independently verified.

For consolidated totals by currency, optionally create `data/analytics/quotes.json` mapping markets to quote/collateral tokens, for example `{ "BTC": "USDC", "HYPE": "USDC" }`. Unknown currencies remain in `users[].byMarket` and are excluded from `byQuoteToken` totals. No currencies are mixed or converted to USD. PNL means imported closed PNL, excluding funding and open positions; missing exchange fees remain null.

Optional query parameters: inclusive UTC `from`/`to`, `address`, `limit` (1–500, default 100), `offset`. Without dates, all local records are included. `coverage.files` lists loaded/invalid files. `missing_local_data` means nothing has been imported, not zero users. All counts cover only local records.

For automatic collection, put `QUICKNODE_SQL_API_KEY` in the ignored `.env` and run:

```bash
npm run analytics:collect
# Or keep updating every five minutes in a separate terminal:
npm run analytics:collect -- --watch
```

The collector reads QuickNode SQL Explorer's `hyperliquid_builder_fills` and checks attributed `hyperliquid_fills` when that table is empty. It follows 1000-row pages, and atomically replaces one local JSON snapshot per builder/UTC day. Reruns refresh snapshots rather than appending duplicates. A failed or incomplete day preserves its previous snapshot. The local API never calls SQL or RPC. `collection` in the JSON response records source, dataset, collection time, current run state and any failed date; SQL indexing can lag and today's data is provisional.

By default the collector backfills from `BUILDER_ANALYTICS_START_DATE` (2026-10-29) through today, up to 31 days per run. For older history, run successive explicit windows, for example `npm run analytics:collect -- --from 2026-10-29 --to 2026-10-30`. Watch mode refreshes yesterday and today after the initial successful backfill. The official archive returned 403 for the tested files; this collector uses the separate SQL API instead. EVM RPC URL tokens do not authorize SQL Explorer. Sources: [builder archives](https://hyperliquid.gitbook.io/hyperliquid-docs/trading/builder-codes), [QuickNode SQL API](https://www.quicknode.com/docs/sql-explorer/using-rest-api).

Local data remains ignored by Git. `npm run deploy:vercel` prepares a credential-free data snapshot under `server/analytics/published`, uploads it through the explicit Vercel ignore rules, and bundles it into the read-only API. The build copies the standalone page into the terminal output and serves it at `/analytics`. Deployed data reflects the collection time of that snapshot; collect again and redeploy to update it. No SQL credential is required in Vercel for snapshot serving. Git-triggered deployments do not contain ignored local snapshots unless a separate build job supplies them. `npm run test:analytics` verifies local imports, no-network reads, exact totals, filtering and deduplication.

### Update the deployed leaderboard without redeploying

Remote updates use a **private Vercel Blob store**. The collector stays on your Mac; only a sanitized data snapshot is published. The browser never receives SQL, publish, or storage credentials.

One-time setup:

1. In the Vercel project's **Storage** tab, create/connect a **private Blob store** to Production using the default `BLOB_READ_WRITE_TOKEN` variable.
2. Run `npm run analytics:remote-setup -- https://YOUR-PRODUCTION-DOMAIN`. This saves the remote URL locally and syncs a generated publish token to Vercel through CLI stdin. The token is never printed or passed as a command argument.
3. Run `npm run deploy:vercel` once to install the update endpoint and new environment variables.
4. Run `npm run analytics:sync` to collect and publish the first remote snapshot.

After that, use `npm run analytics:publish` to publish existing local records, or `npm run analytics:sync` to collect first. For continuous updates, run `npm run analytics:collect -- --watch --publish` in a separate terminal. The page refreshes within its normal 30-second polling interval after a successful publish.

`POST /api/analytics-update` requires the configured bearer publish token and accepts a validated snapshot up to 3MB. It rejects another builder's records, incomplete collections, stale timestamps, and concurrent write conflicts. Uploads use private Blob storage with conditional writes; reading the deployed leaderboard fetches the latest private snapshot without relying on Vercel's temporary filesystem. Until the first publish, the deployed bundled snapshot remains the fallback. If remote storage is unavailable, the API reports an error and the page retains the last loaded data rather than silently serving an older bundle.

Local analytics continues reading local files unless `ANALYTICS_USE_REMOTE=true` is explicitly set. `ANALYTICS_REMOTE_URL` and `ANALYTICS_PUBLISH_TOKEN` belong in the ignored local `.env`; Vercel requires `ANALYTICS_PUBLISH_TOKEN` and the connected Blob store's `BLOB_READ_WRITE_TOKEN`. No SQL key is needed in Vercel. See [Vercel Blob private storage](https://vercel.com/docs/vercel-blob/security).

### Use Neon for remote analytics

In Vercel, connect a Neon database to this project's **Production** environment with
`DATABASE_URL`. Alternatively set `ANALYTICS_DATABASE_URL` to a dedicated Neon
connection string. Keep this variable server-only, without a `VITE_` prefix.
Neon takes precedence over Blob when configured; Blob storage is not required.
The first publish automatically creates `x1_analytics_snapshots` (the database role
must have CREATE TABLE permission). Uploads atomically replace the snapshot only
when its collection timestamp is at least as new as the existing one.

Run `npm run analytics:remote-setup -- https://x1-terminal-20261029.vercel.app`
if the publish token has not been configured, then `npm run deploy:vercel` and
`npm run analytics:publish`. Subsequent updates use `npm run analytics:sync`.
The collector remains local; no QuickNode credentials are needed in Vercel.

To refresh the deployed bundled analytics without remote storage, run `npm run analytics:deploy`. This collects new fills first, then packages and deploys the snapshot. A Git push updates code but does not collect trades or upload ignored local analytics files. The page Refresh button reloads the deployed snapshot; it does not run the collector.

Trading approval now persists per account and network on this device. Expired or revoked agents require approval again; explicit Disconnect removes saved trading keys. Missing trading signers open the approval modal rather than leaving an unexplained wallet-required error. Mobile users can reconnect/unlock their wallet from that modal.

### API wallets and agent trading

Open `/API` (also available in the connected account menu). Enter a unique name
and an API wallet address, or Generate a new agent key. Save the generated
`.env.agent` file before authorizing. Keys are generated locally, are not sent to
the terminal server, and are not recoverable after leaving the page. A trading
key can cause trading losses even though it cannot withdraw funds. Authorizing
uses the connected owner wallet, with a separate 0.05% builder-fee approval when
needed. Expiry can be 7, 30, 90 or 180 days. Remove revokes the selected named
agent after wallet confirmation; the terminal's own trading key is separate.

Keep `.env.agent` private (it is ignored by Git). Set local file permissions with
`chmod 600 .env.agent`. Never use the owner's private key in the agent script.

```sh
node --env-file=.env.agent apps/terminal/scripts/x1-agent.mjs status
node --env-file=.env.agent apps/terminal/scripts/x1-agent.mjs order --file examples/api-order.json
# Only after reviewing/editing the sample order:
node --env-file=.env.agent apps/terminal/scripts/x1-agent.mjs order --file examples/api-order.json --execute
node --env-file=.env.agent apps/terminal/scripts/x1-agent.mjs cancel --file examples/api-cancel.json
```

Order and cancel commands preview by default. `--execute` submits the request.
The order example is a BTC post-only limit buy; edit price, size, side and asset
ID for your intended trade. Cancel example IDs are placeholders. Account queries
use `X1_ACCOUNT_ADDRESS`, never the agent address. Each order attaches the X1
builder address with fee `f: 50` (0.05%), on top of exchange fees. The script
checks agent expiry and fee approval before submitting. It does not automatically
retry a trade after an error or ambiguous response. Use a separate agent per
trading process to avoid nonce collisions. Both mainnet and testnet are supported
via `X1_NETWORK`. The provided client targets the configured owner, not vaults or
subaccounts. No HTTP service accepting private keys is exposed.

For bots, import `createX1AgentClient` from
`apps/terminal/scripts/x1-agent-client.mjs`; its `order` and `cancel` methods
require `{execute:true}` to submit. The client exposes no withdrawal methods.

On `/API`, use **Export private key** for a newly generated key, or **Export key**
next to an authorized wallet when its secret is available on this device. The
export dialog requires acknowledging the trading risk before revealing, copying,
or downloading `.env.agent`. Revealed keys hide on blur, when the tab is hidden,
or after 60 seconds. Public API-wallet entries whose secrets are not held locally
cannot be exported; use their original backup or authorize a fresh key.

The `/API` page also has a separate **X1 trading fee** panel. Connect the owner
account used by the bot, check its network and the displayed builder address,
then **Approve 0.05% fee** (or Reapprove). The panel signs only
`approveBuilderFee`, does not create or replace an agent, and verifies the cap
with a fresh account-specific `maxBuilderFee` request. Refresh fee status is
read-only. Approval is verified only when the returned cap is at least `50`:
Hyperliquid fee units are tenths of a basis point, so `50` means `0.05%`, not
`0.5%`. This does not modify the builder wallet's account mode or balance.
