# Brief: X1 Terminal, a Hyperliquid trading front end for X1 users

## Goal
Build an X1-branded trading terminal, like Phantom's in-wallet perps, on top of the open-source **HypeTerminal** (https://github.com/vipineth/hypeterminal). Orders go to Hyperliquid with our **builder code**, so we earn a fee on every trade. Later we'll add XNT rewards and the X1 deposit bridge.

## Base
- Fork or import HypeTerminal. Keep its license and attribution.
- HypeTerminal is a pnpm monorepo:
  - `apps/terminal` is the app (TanStack Start, Vite, React 19).
  - `packages/hl-react` holds the Hyperliquid hooks: transports, signing, trading keys.
  - `packages/ui` holds the UI components.
  - It's all built on `@nktkas/hyperliquid`.
- Reference for the onboarding steps: https://github.com/Solynor/create-builder-codes-dapp (builder fee approval and trading-key approval).

## 1. Wallet connect (model it on Vero: https://staging-vero.x1.xyz/btc/15m/)
- Copy Vero's connect modal, connected-wallet menu, disconnect and auto-reconnect behavior. Study its public `app.js`.
- Offer **only Phantom and the X1 wallet**. No Backpack, Meteora or other wallets.
- **Phantom:** sign all Hyperliquid actions, which use Ethereum-style EIP-712 signatures, with its Ethereum provider `window.phantom.ethereum`. Phantom also supports silent reconnect with `connect({onlyIfTrusted:true})`.
- **X1 wallet:**
  - Detect it as `window.x1_wallet`, falling back to `window.x1Wallet`.
  - It is Solana-style only, so it can't sign Ethereum-style data.
  - Its `signMessage` returns `{signature: base64}`.
  - It has no silent reconnect, so returning users click Connect again.
- **X1 trading key (approved by the user):** this follows Vero's approach.
  - Ask the X1 wallet to `signMessage` a fixed, versioned message, such as `x1-terminal-hyperliquid-key-v1`.
  - Turn the signature into an Ethereum private key in the browser the same way every time, for example the keccak256 hash of the signature bytes.
  - That 0x account becomes the user's Hyperliquid account.
  - Keep the key in sessionStorage only. Never store or send it anywhere else.
  - In the UI, label it as "derived from your X1 signature", show the 0x address, and warn that withdrawals are signed by this derived key.

## 2. Builder codes
- The builder address comes from the env var `VITE_BUILDER_ADDRESS`, which is a placeholder for now.
- Every order includes `builder: { b: <address>, f: 50 }`, which is a 0.05% fee.
- Show **one setup screen** that asks for both approvals: `approveBuilderFee` (max fee at least 0.05%) and `approveAgent` (trading-only key, so trades don't need a signature each time).
- Use Hyperliquid **testnet** by default, with a toggle for mainnet.
- Notes:
  - Fee caps are 0.1% on perps and 1% on spot.
  - The builder address needs at least 100 USDC of perps account value to collect fees.
  - The `maxBuilderFee` info call checks a user's approval.

## 3. Branding
- Light X1 branding in our own design. Don't copy other products' look or logos.

## 4. Deploy
- Build it as a static single-page app deployable on Vercel, as a **new, separate project**. Add `vercel.json` if needed.
- Deploy a preview if possible. Otherwise, document the exact deploy steps.

## Rules
- No secrets, private keys or API keys in the repo. Settings go in environment variables.
- Recommend only Phantom and the X1 wallet.

## Done when
- The app builds and deploys.
- The connect modal shows only Phantom and the X1 wallet.
- Testnet markets, charts and order book load.
- The setup screen (builder fee and trading key) and order entry work, with the builder fee attached to orders.
- The report covers what works, what's untested (wallet flows need a real browser wallet), and how to deploy.

## Later (not in this build)
- Deposit flow: X1 to Solana through our bridge, then Solana to Hyperliquid USDC through Relay. Withdrawals go in reverse.
- XNT rewards: builder fees buy XNT on xDEX and are paid back as rebates based on fees paid. Staking XNT boosts rewards. Points are minted from fees paid, in the style of Papertrade.
- xDEX spot swaps (xdex-router in jacklevin74/xnt-swap) and Privy login.
- Trader feeds and copy trading (Frank, Machi, Lorenzo, Carlos).
