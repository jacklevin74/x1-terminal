# X1 Terminal feature inventory (redesign baseline)

Captured 2026-11-02 from commit 9d6d2c0. The redesign must keep every item. `T = apps/terminal/src`.

## Stack
- Vite 7 SPA, React 19 (compiler), TanStack Router file routes (`T/routes`). Vercel serves `apps/terminal/dist`.
- Tailwind v4, Inter Variable, `.dark` class. Tokens: `T/styles.css`; UI package tokens `packages/ui/src/globals.css` (different type scale).
- Chart colours: `T/lib/chart/kline-styles.ts`, `T/lib/chart/theme-colors.ts`, `public/tradingview-theme.css`. Hard-coded hex in `T/components/trade/positions/position-row.tsx`, `T/lib/chart/trading-lines.ts`.
- Components: `@hypeterminal/ui` (base-ui) + `T/components/ui/*` (cmdk, resizable, sonner, price-input…). Phosphor icons, vaul drawer.
- Charts: KLineCharts 9 default; TradingView self-hosted optional.
- State: Zustand (`T/stores/*`), TanStack Query, Hyperliquid WS/Info.
- Wallets: wagmi 3 (Phantom, X1 derived key), Solana web3, LI.FI, Hyperunit.
- i18n: Lingui en, zh, hi, es, fr, ar.

## Routes
| Path | Scope | File |
|---|---|---|
| `/` | All | `T/routes/index.tsx` |
| `/perp` | Perp | `T/routes/perp.tsx` |
| `/spot` | Spot | `T/routes/spot.tsx` |
| `/builders-perp` | HIP-3 | `T/routes/builders-perp.index.tsx` |
| `/builders-perp/$dex` | one dex | `T/routes/builders-perp.$dex.tsx` |
| `/mobile-agent-sync` | static note | `T/routes/mobile-agent-sync.tsx` |
| `/$` | 404 | `T/components/pages/not-found-page.tsx` |

JurisdictionGate wraps all (`/api/jurisdiction`); restricted screen keeps X1 key export.

## Desktop layout (`T/components/trade/trade-terminal-page.tsx`)
1. TestnetBanner 32px — "Switch to Mainnet".
2. TopNav 44px (`header/top-nav.tsx`).
3. MainWorkspace (`layout/main-workspace.tsx`): TokenSelector + FavoritesStrip; MarketOverview; resizable split analysis 77% / sidebar 23% (`CHART_WITH_SWAPBOX`). Analysis = chart 76% / book 24% (`CHART_WITH_ORDERBOOK`), keyboard-draggable vertical handle (Arrow 24px, Shift 80px, Home), then PositionsPanel. Sidebar = TradePanel + AccountPanel. Sizes in `T/config/layout.ts`.
4. FooterBar 32px.
5. GlobalModals: Deposit, Settings, Spot Swap, Command Menu.

## Checklist

### TopNav
- [ ] Logo "X1 TERMINAL"
- [ ] Scope links (lg+): All, Perp, Spot, Builders; per-scope active colour
- [ ] Disabled Soon: Vaults, Portfolio, Staking, Leaderboard
- [ ] Connected: Deposit button + dropdown (Deposit from wallet, Deposit USDC from Arbitrum, Bridge from other chains)
- [ ] UserMenu: Connect Wallet / account row, Copy address, Trading setup · 0.05% fee, Export derived private key (X1), Disconnect
- [ ] Theme toggle; Settings gear

### Token selector (`T/components/trade/chart/token-selector*`)
- [ ] Trigger: icon, pair, kind badge, caret; popover 44rem desktop, drawer mobile
- [ ] Search with clear; scope tabs All / Perp / Spot / HIP-3 (All route)
- [ ] Chips: Perp All/Trending/New/DeFi/L1/L2/Meme; Spot per quote; HIP-3 per dex
- [ ] Sortable Price, 24h Change, OI, Volume (default desc), Funding; OI/Funding hidden on spot
- [ ] Favourite star (pinned top), max leverage badge, dex tag, funding fire icon
- [ ] Virtualised, keyboard arrows/Enter/Escape; loading, empty, footer count

### FavoritesStrip
- [ ] Empty "Select favorite markets"; chip pair + 24h %; active state; Enter/Space; × on hover

### MarketOverview
- [ ] Mark + 24h %; perp ORACLE, 24H VOL, OPEN INT, FUNDING (tooltip: countdown, 7d/30d/1y)
- [ ] Spot: 24H VOL, TOKEN contract link

### Chart
- [ ] Default | TradingView toggle
- [ ] Intervals 1m 5m 1h(default) 4h 1D; more: 3m 15m 30m 2h 8h 12h 1W 1M
- [ ] Types Candles, Hollow, OHLC, Area; volume
- [ ] Order lines, position entry + liq lines, fill markers (both chart modes)
- [ ] History on scroll, refetch after hidden tab; TradingView timeframes 5y…1d

### Order book (`T/components/trade/orderbook/`)
- [ ] Order Book / Trades tabs
- [ ] Depth: Fast · 5, Depth · 10, 15 (default), 20 with tooltip
- [ ] Six price-grouping options
- [ ] Size/Total header click toggles base/quote (shared with Settings)
- [ ] Depth bars; click price → limit price + Limit type; spread value and %
- [ ] Trades: Time (explorer link), Price, Size; flash; waiting/error states

### Trade panel (`T/components/trade/tradebox/`)
- [ ] Order types: Market, Limit, Stop Market, Stop Limit (perp), TWAP, Scale
- [ ] Cross/Isolated · Nx → MarginModeModal (Cross/Isolated, Current tag, isolated-only disable, leverage 1–max, errors, Confirm → Updated)
- [ ] Side toggle Buy/Long, Sell/Short
- [ ] Available (+ Swap/Deposit link), Position
- [ ] Trigger Price, Limit Price with Mid
- [ ] Size with ≈ conversion, base/USD toggle; slider + 0/25/50/75/100
- [ ] Scale: start, end, 2–20 orders. TWAP: 5m–24h H+M, Randomize timing
- [ ] Reduce Only (forced for triggers), TP/SL (Market/Limit), TIF GTC/IOC/Post Only with tooltip
- [ ] TP quick 25/50/100/200%, SL 5/10/25/50%, est. PNL, R:R bar
- [ ] Validation joined with " • "
- [ ] Button states: Connect Wallet, Switch to Arbitrum, Enable Trading, Sign in wallet, Verifying, Deposit, Place Buy/Sell Order, spinner
- [ ] Summaries: standard (liq, value, margin, slippage → settings, est. fee, builder fee), scale, TWAP
- [ ] Order queue card (pending/success/failed, Dismiss)
- [ ] AccountPanel: equity Spot/Perps; balance, uPNL, cross margin ratio, maintenance, cross leverage; Withdraw, Deposit, Bridge

### Positions panel
- [ ] Tabs with counts: Balances, Positions, Open Orders, TWAP, Trade History, Funding History, Order History; active saved
- [ ] Balances: asset filter, Hide Small (<$1), total; columns incl. Withdraw, Transfer, Contract, Swap; sort USDC value
- [ ] Positions: market (switch on click), size, value (sort), entry, mark, PNL (ROE), liq (warn), margin, funding; TP/SL button; PNL share card + Download PNG; Close: Limit, Market, Trailing (disabled), Reverse; Close All + confirm; TP/SL modal; Limit Close modal
- [ ] Open Orders: Type/Side/Market filters, select + Cancel selected, Cancel All, View All above 15
- [ ] TWAP: progress columns, Cancel
- [ ] Trade History: Type (incl. Liquidated), Side, Role, Market filters; Aggregate; tx links; Closed PNL
- [ ] Funding History: filters; Export CSV; loaded count
- [ ] Order History: filters (incl. Withdrawal), status, order ID; withdrawal merge + retry
- [ ] States: connect, loading, failed, empty

### Funds flows
- [ ] Native deposit ETH/SOL (address copy, retry, min warning, SOL in-wallet send)
- [ ] Deposit from wallet SOL/ETH (Max, status, explorer links, other-wallet section)
- [ ] Arbitrum USDC (wrong-network screen, form, status screens)
- [ ] LI.FI bridge: select asset, amount, confirm (quote ring), executing, success, error
- [ ] Native withdraw: asset, recipient, amount, swap/move helpers, fees, review, track
- [ ] Transfer USDC Perp↔Spot; Send Tokens (mobile); Spot Swap (Half/Max, slippage, embedded mode)

### Wallet and setup
- [ ] WalletModal: Phantom, X1 Wallet (acknowledgement required)
- [ ] X1Setup: builder fee + agent key, builder-address warning
- [ ] ExportKeyModal: reveal, copy, auto-hide 60 s / blur

### Global
- [ ] Settings: slippage 0.1–5% (2.5 default), book in quote, 6 languages, 12 number formats, network
- [ ] Command menu ⌘K, fuzzy search
- [ ] Footer: API status, ⌘K, Built on HypeTerminal, clock, version
- [ ] Toasts bottom-right; tab title with price

### Mobile (<768px, `T/components/trade/mobile/`)
- [ ] Header: hamburger drawer (markets, Soon items, Deposit, Connect, Settings, theme), user menu, bell, theme, settings
- [ ] Offline banner
- [ ] Bottom nav: Chart, Book, Trade, Positions (badge), Account
- [ ] Views per tab incl. position cards, orders, balances (Send), TWAP, trades, order history, funding, account stats

### /analytics (live only; source NOT in this repo)
- [ ] Header: Leaderboard, View JSON, Refresh, collected time, notice area
- [ ] Cards: Traders, Fills, Recorded fees (*), Collection status + period
- [ ] Table: search, count, Rank, address (link, copy), Fills, Volume, Realized PNL, Fees
- [ ] Portfolio view `?address=`: stats, positions table, spot balances, partial-failure notice
- [ ] Collection details table; 30 s auto-refresh; paginated `/api/builder-users`

## Known gaps to decide
1. Mobile Trade view shows all order types but submits only plain market/limit; TIF fixed GTC; TP/SL not sent.
2. Take Profit Market / Limit defined in `T/config/trade.ts` but not in the dropdown.
3. Unused: `tradebox/advanced-order-dropdown.tsx`, `tradebox/leverage-control.tsx`, `positions/withdrawal-history.tsx`, `positions/position-actions-dropdown.tsx`, `components/mobile-agent-sync-modal.tsx`.
4. Placeholders: bell does nothing; Soon items; Trailing disabled.
5. Branding leftovers: "HYPE TERMINAL" in mobile drawer, tab title "| HypeTerminal", footer.
6. Two token sets; hard-coded hex colours.
7. `/analytics` source and `/api/builder-users` are not in this repo.
