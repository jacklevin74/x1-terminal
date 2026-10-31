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

The derived key and trading-only agent keys use sessionStorage, never localStorage or a backend. Reloading the page restores the cached X1-derived account without another signature. A native-wallet account mismatch, corrupted cache, or explicit disconnect discards that session. When the tab’s session storage is gone, reconnecting requires signing again. The inherited mobile key-transfer route is disabled.

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
