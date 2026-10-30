# X1 Terminal build report

## Implemented

- Imported HypeTerminal's main-branch source via its GitHub tarball on 2026-10-29; preserved LICENSE and upstream README. Import source: https://github.com/vipineth/hypeterminal/archive/refs/heads/main.tar.gz. This is an archive import, without upstream Git history.
- Retained the monorepo, market/chart/order-book components, Hyperliquid SDK hooks, and existing order types.
- Added X1 name and visible upstream attribution; retained upstream layout and theme in this initial implementation.
- Replaced wallet selection with Phantom and X1 only; disabled automatic injected-wallet discovery and WalletConnect.
- Added the X1 base64-signature → keccak256 → Ethereum account adapter, acknowledgment, derived-address display, typed-data signing, manual reconnect, and session cleanup. Phantom is scoped to its Ethereum provider.
- Changed agent key persistence to sessionStorage. Disabled the inherited mobile key-transfer route.
- Made testnet the default with the existing network switch preserved.
- Added environment-configured builder address, fee 50 (0.05%), shared approval screen, and rejection of setup/orders while the builder address is unconfigured. The shared order hook overrides caller builder parameters.
- Converted app startup to a static Vite/React/TanStack Router SPA; added root environment loading and Vercel configuration.

## Verification

- Production static build passed: `npm run --prefix apps/terminal build`.
- Final app TypeScript check passed: `npm run --prefix apps/terminal typecheck`.
- Focused automated tests passed: 31 tests across wallet selection, signature derivation, typed-data signature verification, explicit X1 connect, session storage, signing compatibility, network defaults, builder configuration, builder injection, and missing-builder rejection.
- The full upstream suite has not been certified for this fork. In particular, inherited mobile-sync tests describe an intentionally disabled feature.
- Dependency installation in this sandbox used a temporary flattened npm dependency tree with legacy peer resolution because pnpm's network fetches were restricted. The source retains upstream's pnpm lockfile and workspace layout for normal installation. Reproduce the frozen pnpm install in CI/Vercel before release.
- No live browser with wallet extensions was available. No signed actions or orders were submitted.
- No Vercel CLI or linked project was available; no preview deployment was created. README.md includes exact steps for a new, separate project.

## Required testnet acceptance checks

- Install Phantom and X1 extensions. Check the modal contains exactly those choices, including when other wallets are installed.
- Verify Phantom connects its Ethereum account, reconnects without prompting after reload, and stays disconnected after an explicit disconnect.
- Verify both X1 global provider spellings with the real extension; confirm `signMessage` accepts UTF-8 bytes and returns a 64-byte base64 signature. Confirm the same wallet/message returns identical bytes across repeated connects and browser restarts. This recovery property must hold before funding.
- Confirm X1 requires Connect after reload, produces the same 0x account, displays the withdrawal warning, and clears account state on native account changes/disconnect.
- Configure and fund an eligible testnet builder. Confirm the setup screen completes both approvals, displays rejection errors, and resumes correctly after partial approval. Check `maxBuilderFee` and approved agent state onchain.
- Confirm testnet markets, candles, order book, and account balances load. These data paths are retained from upstream but were not observed live in a browser here.
- Place a minimum-size testnet limit order and a market order. Inspect signed order payloads for the configured builder and `f: 50`; verify fills, cancellation, and fee collection. Confirm the agent cannot withdraw.
- Confirm disconnect and tab closure remove private key persistence. Inspect storage and network requests for key leakage.
- Deploy to a new Vercel preview. Test `/`, `/perp`, `/spot`, and a deep market URL on direct navigation/reload, then repeat wallet checks over HTTPS.

## Reference limits

The public Vero page was reviewed, but its app.js could not be retrieved through the available web tool at either the root or the market-relative URL. The implementation follows the wallet behavior specified in the brief; exact Vero behavioral parity is not claimed. The builder-code example repository was reviewed at its public repository page; actual approval integration reuses HypeTerminal's existing SDK-backed approval flow.

## Deferred

The X1 bridge, XNT rewards/rebates, xDEX swaps, Privy, trader feeds, and copy trading remain outside this build. Mainnet trading and production funding should wait for the real-wallet and testnet checks above.

## X1 signature compatibility fix

The local X1 extension source (`/Users/yakovlevin/dev/backpack/x1-wallet/packages/extension/src/provider.js`) returns `{ signature: Uint8Array }`; the mobile provider in `backpack/android/App.js` returns the signature directly. The original base64-only assumption caused `atob` to throw for extension signatures. The adapter now accepts direct/wrapped bytes and base64, validates 64-byte length, and hashes the same bytes without changing account derivation. Regression tests reproduce the original failure, verify equivalent derived keys for supported formats, and reject malformed responses before persisting a key.

## Native ETH deposit integration

Added a mainnet ETH deposit screen inside Deposit, using Unit’s public Ethereum → Hyperliquid address endpoint for the connected account. The UI verifies a two-of-three quorum of Unit’s published P-256 guardian signatures, shows the verified address and Ethereum-mainnet QR code, allows copying, and optionally requests a native ETH transfer from Phantom. X1-derived accounts can receive an external-wallet transfer. Switching accounts remounts the form and prevents the old deposit address from remaining visible. The route is blocked in testnet mode. Native ETH minimum validation is 0.007 ETH based on Unit’s published documentation. Fees and ETA come from Unit’s estimate endpoint with an explicit unavailable state if it fails. Ethereum receipt confirmation is distinguished from final Unit credit. No automatic sale of ETH or perps funding is performed.

Production build passed. Focused tests include real P-256 signature verification, quorum enforcement, malformed/unverified responses, API failures, account-address binding, account-switch cleanup, amount precision/minimum, fee validation, and route selection. Live Unit API/CORS access and a real-wallet deposit could not be exercised in this environment; no funds were sent. The existing browser preview must be refreshed to load the rebuilt assets.

## Unit address casing verification fix

Reproduced a verification failure using a real public Unit attestation from its Operations documentation: the signature verifies over EIP-55/checksummed address text, but fails over lowercase text for the same accounts. The verifier now tests equivalent original, checksummed, and lowercase representations of the requested recipient and returned deposit address. The two-trusted-guardian threshold and rejection of modified addresses remain intact. A regression test uses the published signature and public key, including negative tests for changed recipients/deposit addresses. This reproduces a concrete format mismatch independently of mocks. The screenshot account’s live Unit response was not accessible from this session; its exact response is still needed if the error persists after refresh.

## Vercel deployment preparation

Final production build and app TypeScript checks passed; 44 focused tests passed. Installed and attempted Vercel CLI deployment to the separate project `x1-terminal-20261029`. Vercel rejected the attempt with “No existing credentials found”; CLI login did not establish authentication in this session. No deployment URL or project creation was confirmed. Added `npm run deploy:vercel` to authenticate interactively on the user’s Mac and deploy with explicit public builder/mainnet build settings. A Vercel integration is available but was not connected at the time of preparation.

## Vercel CVE-2026-102989 dependency cleanup

Vercel blocked the initial production attempt because the imported package manifest still listed unused `@tanstack/react-start@1.168.25`. The terminal has used Vite/TanStack Router SPA startup since the initial implementation and has no imports from TanStack Start or Nitro. Removed both unused direct dependencies, pruned 56 orphaned package snapshots with pnpm’s official lockfile tooling, and confirmed no React Start or Start server core package remains in the deployment lockfile. `pnpm install --lockfile-only --frozen-lockfile --offline --ignore-scripts` passes. No vulnerability bypass environment variable was set. A new deployment is required; the initially printed URL does not demonstrate successful publication.

After dependency cleanup, the production static build, app TypeScript check, and 44 focused tests passed with the unused framework removed from the installed dependency tree as well. The frozen offline lockfile consistency check also passed again.

## Native SOL deposits

Added Deposit → SOL · Solana using Unit’s `/gen/solana/hyperliquid/sol/:recipient` endpoint and Solana-specific processing fee estimates. Reused the two-trusted-guardian quorum, with both current and legacy payload formats; Ethereum recipient casing remains compatible while Solana deposit-address casing is preserved exactly. Added a Solana Pay QR code and copy button. The Phantom send flow uses `window.phantom.solana`, builds a native SOL transfer to the verified address, checks a mainnet RPC and balance including network fees, and tracks submission separately from chain confirmation and final Unit credit. Mainnet-only, account-change cleanup, 0.12 SOL minimum, and nine-decimal precision checks are included. No SOL-to-USDC automatic swap and no X1-to-Solana bridge were added.

Added `@solana/web3.js@1.98.4` as an explicit direct dependency, reusing the version/resolution already in the upstream pnpm lockfile. Frozen offline lockfile consistency check passes; removed TanStack Start packages remain absent. Production build and app TypeScript check pass. All 58 focused tests pass, including real P-256 SOL payloads, incorrect address/recipient rejection, API failures, account-switch cleanup, native transaction instruction decoding, insufficient balance, wrong network, wallet rejection, and failed chain confirmation. A real Phantom extension, live Unit API/CORS, and actual SOL deposit have not been tested in this environment; no funds were sent.

## SOL RPC rate-limit handling

Investigated the reported Vercel “429 Too Many Requests - null” error. The native SOL sender used the default Solana Labs public endpoint and the SDK’s automatic 429 retries. Changed the no-configuration default to PublicNode’s documented mainnet RPC (`https://solana-rpc.publicnode.com`), preserving the `VITE_SOLANA_RPC_URL` override. Disabled SDK rate-limit retries. Added explicit pre-submission guidance (wait or copy the verified address and send from Phantom) and post-submission guidance that retains the transaction signature and warns against resending while confirmation is unavailable. Both rate-limit paths have regression tests. The exact failing browser request was not captured; if the error occurs outside the SOL send flow, its request URL must be inspected separately. Shared public endpoints can still be rate-limited; a dedicated browser-accessible mainnet RPC can be configured in Vercel’s build environment for production traffic.

## Position gain/loss cards

Added a share/view icon beside PNL on desktop position rows and mobile cards. It opens an original X1-branded gain/loss image showing market, optional DEX, side, leverage, ROE, unrealized dollar PNL, entry price, mark price, and UTC snapshot time. The SVG uses escaped text and no external image/font resources; PNG export draws it to a 2400×1520 canvas. Positive/negative data use green/red styling. Values refresh with the underlying position feed while open; download captures the current render. Build and app TypeScript checks pass, with four focused tests for actual values, ratio-to-percent conversion, losses, missing data, and escaping. Browser PNG export and visual layout remain untested in this sandbox.

## X1 wallet SOL funding and positions table

Completed X1-native balance/amount controls for Solana deposits, reusing the verified Unit destination flow. Balance reads use Solana mainnet and the wallet’s native public key, without another Hyperliquid key derivation or message signature. Quick amounts use exact lamport arithmetic; Max leaves the estimated sending fee plus a 5,000-lamport reserve. Before broadcasting an X1-signed transaction, the app verifies its message and signatures, source identity, destination, amount, and mainnet blockhash. It broadcasts through the configured mainnet RPC instead of X1’s chain-specific sign-and-send endpoint. The expected Solana source is pinned to the last balance read and revalidated before signing. Account changes stop in-progress preparation, and a known transaction signature is retained before broadcast to avoid encouraging duplicate sends after RPC errors. Phantom’s existing funding path also gets the balance and amount controls.

Redesigned desktop positions around the supplied reference: column order, plain market/leveraged labels, DEX tags, side colors/edge stripe, separate position value, inline PNL/ROE with share-card link, margin mode inline, borderless compact rows, value sorting, and visible Limit/Market/Reverse actions. Added a confirmed Close All flow that stops on error or wallet change. Trailing is explicitly disabled because it is not implemented; isolated-margin editing was not added.

All 76 focused tests pass, including X1 source-balance reads without signing, exact native transfer decoding, transaction tampering rejection, source-account changes, rejected signatures, submission rate limits, amount/Max UI wiring, and sequential close safety. Final app TypeScript and production build checks were rerun after layout cleanup. Actual X1 extension approval, live balances/deposits, live order execution, screenshot-level visual comparison, and the browser PNG download remain unverified in this sandbox. No funds were sent and no live orders were submitted by the assistant.

## Compact positions columns

Removed the fixed 110rem minimum width and percentage-based column allocation from the desktop Positions table. Columns now size to their content rather than stretching across the panel. Reduced horizontal cell padding from 12px to 6px, body text from 13px to 12px, header text to 11px, row height, action gaps, and DEX/share-icon padding. All columns and actions remain available; horizontal scrolling is needed only when actual content exceeds the panel. This is a presentation change with no order or deposit behavior changes.

## Simplified native deposit modal

Retained the Transfer tabs and ETH/SOL/USDC selectors at the top, widened the modal slightly, and added a centered asset/title/fee introduction using the existing gray theme. Removed QR-code generation and rendering from ETH and SOL deposits. The SOL main form now focuses on wallet balance, amount, quick selections, and a prominent deposit button; the external-wallet address and Hyperliquid account are available under a compact “Deposit from another wallet” disclosure. Refresh is inside the balance card, fee/ETA information is consolidated in the introduction, and a single compact minimum/network notice sits at the bottom. Signing and verification behavior is unchanged. Production build and app TypeScript checks pass; focused deposit tests include assertions that QR images are absent.

## Native deposit dialog and funding navigation

Replaced the main Deposit modal with a dedicated address-only dialog based on the user’s Hyperliquid screenshots: centered token/title/fee information, Asset selector, Deposit Chain row, verified copy-address row, Done button, and minimum/network notice. No QR, wallet amount form, Withdraw tab, or Bridge tab is shown in this dialog. Kept the gray theme. Added a dropdown beside the header Deposit button for wallet funding, Arbitrum USDC, and bridging. Withdrawal and bridging remain reachable from Perps Overview; their own dialogs no longer have the combined navigation tabs.

The separate wallet-funding dialog retains SOL and ETH transfer flows. SOL balance now loads automatically via a deduplicated query after the Unit destination is verified; no Read Balance button or large balance card remains. It shows an Available line, Amount/Max, and Deposit. The query follows source-wallet account changes and avoids automatic retries/focus polling. No transaction is signed or sent during automatic balance loading. Production build and app TypeScript checks pass. All 36 focused deposit tests pass, including a main-modal test for address selection and no Withdraw/Bridge/Amount controls, plus automatic-balance loading and explicit deposit submission checks. Browser visual comparison remains unverified in this sandbox.

## SOL amount entry in the primary deposit dialog and X1 refresh reconnect

The primary SOL deposit dialog now includes automatic wallet balance loading, Amount/Max, and explicit Deposit approval while always keeping the verified Solana destination/copy control visible. The compact form omits duplicate intro/address/minimum sections, with those rendered once by the main dialog. ETH’s address-only flow remains available. No automatic signing or transfer occurs while loading a balance.

Added session-based X1 account restoration so Wagmi can reconnect to the same derived address after a page reload without another native message signature. Private keys remain in sessionStorage. Owner metadata binds new sessions to the native wallet public key; mismatched accounts, malformed keys, explicit disconnect, and native disconnect events clear cached state. Existing key-only session caches are supported for this upgrade. Late extension initialization triggers the normal Wagmi reconnect checks. Native wallets that retain their public key but are not connected can still have their SOL balance read; signing reconnects that native wallet explicitly when the user clicks Deposit.

Regression tests cover same-address restoration without connect/sign prompts, explicit disconnect across reload, owner mismatch, corrupted cache, late provider injection, amount/Max on the main SOL modal, persistent destination visibility, and explicit submission. The available web tool could read Vero’s public page but not its app.js, so exact implementation parity with Vero is not claimed.

## Solana confirmation expiry reconciliation

Fixed the misleading block-height-expiry error after a transfer has already landed. If normal confirmation fails, the app looks up the existing signature with transaction history enabled. Confirmed/finalized signatures count as successful source transfers; actual on-chain errors remain failures. Missing/processed/unavailable history produces a neutral confirmation-unavailable notice, retains the signature, and does not resend the deposit. Added eight regression cases, including the reported expiry pattern. The build and 90 focused tests passed before the withdrawal-recipient display change.

## Withdrawal destination clarification

The existing `withdraw3` call sends USDC on Arbitrum to the connected Hyperliquid/Ethereum account address. For X1 this is the signature-derived 0x account, not the native Solana/X1 public key or builder address. After the user reported confusion about where a withdrawal went, added an explicit recipient-address panel and derived-account explanation before submission. The actual withdrawal destination and network were not changed. No payout-to-native-chain bridge or derived-account Arbitrum recovery transaction was executed.
