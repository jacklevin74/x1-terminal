# Perp component refs (real captures)

Captured 2026-11-03/04. All images are in `apps/terminal/public/dev-refs/perp-refs/`.
Pixel sizes are CSS px (live captures use DPR 2, so image px ÷ 2).

## How the live captures were made

- **Hyperliquid and GMX:** the real production app (app.hyperliquid.xyz, app.gmx.io) is loaded in Playwright with a read-only injected EIP-1193 provider. The provider only reports a public address that has open positions; it cannot sign. The app renders that address's real positions, orders, fills and chart lines. No mockups are involved.
- **Hyperdash:** a public trader page. No login is needed.
- **TradingView:** the official public Trading Platform demo (trading-terminal.tradingview-widget.com), with paper orders placed in its demo broker.
- **Binance and OKX:** official help-centre images, downloaded unmodified.

## Hyperliquid (app.hyperliquid.xyz, live, TradingView chart)

| File | Source | Pattern |
|---|---|---|
| hyperliquid-positions-1.png | /trade/BTC, address 0xca69…fa66 | **Columns:** Market · Size · Position Value (dropdown) · Entry Price · Mark Price · PNL (ROE %) · Liq. Price · Margin · Funding · Close All · TP/SL. **Market cell:** coin in bold, coloured by side, plus leverage ("BTC 40x"). The cell has a side-coloured left-edge gradient wash. **Size** is coloured by side ("0.04466 BTC"), with no sign and no Long/Short word. **PNL** is coloured: "-$9.45 (-11.1%)" plus an external-share icon. Funding is coloured. All other numbers are neutral white and left-aligned under left-aligned headers. Rows are about 30px. Dotted underlines on headers mark tooltips. **Actions:** text links in the brand colour ("Close All" header, "Limit / Market / Reverse" per row, shown here as "Connect" because the app is read-only), and "View Orders ✎" in the TP/SL column. |
| hyperliquid-positions-2.png | same | **Open Orders tab:** Time · Type · Market · Direction ("Close Short", green) · Size ✎ · Original Size · Order Value · Price · Reduce Only · Trigger Conditions ("Price above 77100") · TP/SL · Cancel All. |
| hyperliquid-positions-3.png | same | **Trade History tab.** |
| hyperliquid-full-1/2/3.png | BTC / DOGE / PUMP | Full-page context. |
| hyperliquid-chartlines-1.png | /trade/DOGE, 0x1171…9c0c, long | **Lines:** all are dashed, in the order-side colour. Red is a sell (long TP and SL are both red). The position line is also dashed in the side colour, and the mark line is dotted. **Labels** float left of centre, not on the axis, and are about 20px tall with 3 segments. Segment 1 is a light fill with blue text ("TP Price > 0.080813", "SL Price < 0.072874", "PNL -$0.02"). Segment 2 is a black qty box (white, bold, "95", "272"). Segment 3 is an × cancel box; the position label has no ×. **Axis:** each line has a filled price tag on the right axis, about 16px tall, in the line colour. Labels are horizontally staggered so they do not stack. |
| hyperliquid-chartlines-2.png | BTC, short 40x | **Liq. line:** "Liq. Price" label with no qty and no ×. **SL** "SL Price > 77100" on a green dashed line (the close is a buy). **PNL** label "PNL -$9.45 \| -0.04466": the qty is signed for a short. |
| hyperliquid-chartlines-3.png | same, hover | Hovering the SL label shows the tooltip "Drag to modify price". The label is the drag handle. A crosshair is visible. |
| hyperliquid-chartlines-4.png | PUMP | **Limit order line:** "Limit 0.004400 N/A \| 762,175 \| ×" on a red dashed line. |
| hyperliquid-fills-1.png | PUMP 1h | **Fills:** a filled circle of about 15px diameter (3× the 5px candle body), containing a white "B" (green) or "S" (red). One marker per fill, with no aggregation: many fills on one candle stack vertically into a column. Markers overlap freely. |
| hyperliquid-fills-2.png | BTC 1h | Sparse B/S markers. They sit at the fill price, near the candle. |

## Hyperdash (hyperdash.com/address/…, live public page)

| File | Pattern |
|---|---|
| hyperdash-positions-1.png | **Tabs:** POSITIONS 5 · BALANCES · PREDICTIONS · ORDERS 15 · FILLS · TRADES · TWAP · TRANSFERS (uppercase mono, with count chips). **Columns:** ASSET (icon + coin + leverage chip "8×") · SIZE ("272 DOGE") · VALUE · ENTRY · MARK · PNL ("-$0.02 (-0.67%)" coloured, plus a share icon) · LIQUIDATION ("—") · MARGIN · FUNDING. Every header sorts. Numbers are right-aligned. Rows are about 40px with no row borders. Side is shown only by the leverage chip tint and PnL colour. No action buttons (read-only). |

## GMX (app.gmx.io, live, TradingView chart)

| File | Pattern |
|---|---|
| gmx-positions-1.png | **Columns:** POSITION (icon + "BTC/USD", second line "5.55x Long" with Long in green) · SIZE ("$1,000,209.40", second line "Orders (1)" link) · NET VALUE ("$146,875.23", second line PnL "-$33,187.56 (-18.34%)" in red + share icon) · MARGIN ("$180,062.79 ✎", second line "(180,091.77 USDC)") · ENTRY PRICE · MARK PRICE · LIQUIDATION PRICE · TP/SL (TP "—" in green over SL "$73,860.00" in red, ✎, or a "Set +" pill) · "Close" text button · ⋮ menu. **Layout:** two-line rows about 57px tall. Uppercase 11px muted headers. Left-aligned. The selected row has a left accent bar. Units are in USD. |
| gmx-positions-2.png | **Orders tab:** checkbox · MARKET ("BTC/USD Long") · TYPE (Stop-Loss) · SIZE ("-$400,000.00") · TRIGGER PRICE ("< $73,860.00") · MARK PRICE · ✎ · ×. |
| gmx-positions-3.png | **Trades tab (history):** ACTION ("Update Stop-Loss" + time) · MARKET · SIZE · PRICE · RPNL · FEES. |
| gmx-chartlines-1.png | ETH 4h. **Position line:** red dashed. The label is left-anchored at the chart's left edge, about 19px tall, a dark-red tinted fill with red text: "Long ETH/USD · PnL -$22,991.98 · $1,001,495.48", then ⇄ (reverse) and × (close) icon cells. **SL line:** red dashed, "Long ETH/USD · Partial SL · -$27,403.44" plus ✎ edit and ×. **Axis:** a red-filled price tag on the right axis for each line. |
| gmx-chartlines-2.png | BTC 4h. The position line is above the current price and its label is on the left. A funding tooltip covers the top of the image (a capture artefact). |
| gmx-chartlines-3.png | Zoom on the two labels. One text run with "·" separators, and icon cells split by 1px dividers. |
| gmx-fills-1.png / gmx-fills-2.png | **Fills:** plain filled circles of about 10px with no letter (green = increase/buy, red = decrease/sell). One per trade. They stack vertically above the candles at the latest bars, with no aggregation. |
| gmx-full-1/2.png | Full context. |

## TradingView Trading Platform demo (paper broker, live)

Binance, Bybit and OKX "TradingView" chart modes use this same library.

| File | Pattern |
|---|---|
| tradingview-chartlines-1.png | Existing capture (positions-chart/tv-chart-lines.png). **Labels** are right-anchored, near the price axis, outlined in the line colour, about 18px tall. **Position:** "⇅ (reverse) \| 1 (qty, filled blue) \| +7.16 \| ×". **TP:** "1 \| +1,023.38 USD \| ×" on a green solid line. **SL:** "1 \| -876.62 USD \| ×" on an orange solid line. **Limit:** "1 \| Buy Limit \| ×" on a blue solid line. **Bracket buttons:** "TP" / "SL" dashed-outline buttons sit left of the order label and drag out a bracket. Axis tags are outlined. |
| tradingview-chartlines-2.png | A new capture of the same pattern (BTCUSD, TP 77,600 / SL 75,900). |
| tradingview-positions-1.png / tradingview-positions-2.png | **Account Manager:** Symbol (chip) · Side ("Buy" in blue text) · Qty · Avg Fill Price · Last · Profit (coloured) · Take Profit · Stop Loss · ✎ × per row. Numbers are right-aligned. Rows are about 40px. |
| tradingview-full-1.png | Full context, including the order toast. |

## Binance Futures (official FAQ images)

| File | Source | Pattern |
|---|---|---|
| binance-chartlines-1.png | binance.com/en/support/faq/how-to-modify-price-and-quantity-of-limit-orders-on-price-charts-6b91271601ec484a982e377b0fca6e12 (2025/06 build, COIN-M, "Original" chart) | **Labels:** left-anchored, solid fill in the side colour: "≡ (drag handle) \| Limit 108000.0 \| 1 (qty) \| ×". Red is a sell and green is a buy. **Lines:** dotted. **Axis:** the price tag is outlined in the line colour. |
| binance-positions-1.png | binance.com/en/support/faq/how-to-customize-the-binance-futures-trading-interface-a784518335b0492a9ebfa4a72e1ca092 | Header only (no rows): Symbol · Size · Entry Price · Break Even Price · Mark Price · Liq.Price · Margin Ratio · Margin · PNL(ROI %) · Close All Positions. |
| binance-positions-2.png | same | "Displayed Columns" list. It shows the default order plus Reverse, TP/SL for position, TP/SL. |

## OKX (official help images)

| File | Source | Pattern |
|---|---|---|
| okx-chartlines-1/2/3.png | okx.com/help/how-do-i-set-up-tp-and-sl-with-the-order-line | OKX blurs everything except one real UI strip. **Order line:** dotted. The label is left-anchored: "TP \| +40.44 \| ×", a small outlined box. While you drag along the y-axis, the expected PnL shows on the line. The axis tag is filled green. Low resolution, so use these for pattern only. |

## Excluded, and why

- **Binance split-target FAQ images:** the positions rows use placeholder data ("888888.1234", "12345.12"). This is a staging or design build, so it may not be the real product.
- **Binance "Drag-and-adjust TP/SL" blog graphic:** a promo composite.
- **OKX "six new features" and "reverse" help images:** a laptop mockup frame, or all UI blurred.

## Gaps

- **Lighter:** an injected address still needs 2 signatures before positions load. Docs not checked.
- **Bybit:** the help centre blocks headless Chrome (HTTP2 error).
- **No captures:** dYdX, Paradex, Backpack, Drift, Aster, Variational, edgeX, Extended. All need a signed session, and their docs were not searched (the run was stopped).
- **TradingView fills:** the demo does not render execution arrows.
- **Binance and Bybit live positions rows:** none captured.

## Mobile account (captured 2026-11-05)

Files are in `apps/terminal/public/dev-refs/mobile-account/`. Web pages were captured with Playwright at 390×844 (iPhone 13, 2x), logged out unless noted. App-store images are the official iOS listing screenshots. Binance Futures, dYdX and OKX-exchange-account screens were not captured: Binance's App Store page returned no screenshots to the script, and dydx.trade/portfolio redirects to an empty History view when logged out.

| File | Source | Layout |
|---|---|---|
| hyperliquid-portfolio-1.png | app.hyperliquid.xyz/portfolio, 390px | **Above the fold:** "Portfolio" page title (~36px), then 8 wrapped action buttons (Link Staking, Swap Stablecoins, EVM⇄Core, Account Type, Send, Withdraw, Deposit filled). Two tall stat cards side by side: "14 Day Volume $0 / View Volume" and "Fees (Taker / Maker) 0.0450% / 0.0150% / View Fee Schedule". Cards are filled, 8px gap, 16px gutter. |
| hyperliquid-portfolio-2.png | same, scrolled | **Below the fold:** a key/value card with a "Perps + Spot + Vaults ▾ … 30D ▾" header and rows PNL, Volume, Max Drawdown, Total Equity, Trading Equity, Earn Balance. Then a chart card with tabs Account Value / PNL / Perps PNL and a 30D selector, left y-axis. Then the Balances / Positions / Outcomes / Open Orders / TWAP table tabs. The page scrolls; no empty space. |
| hyperdash-1.png | hyperdash.com/address/0x5fa3…9627 (our demo address), 390px | **Above the fold:** profile card (square avatar, short address, full address + copy, share icon), Track / Snoop buttons, an inset "COPYTRADING SCORE ?/100" card with a Copytrade button. Overview / Statistics segment. Chart card starts: PERPS / COMBINED / CALENDAR mono tabs with an orange underline, PNL RPNL UPNL VALUE + 24H 7D 30D ALL, "30D PERPS PNL" label and a big green "+$22,119.51". 5-item bottom tab bar. |
| hyperdash-2.png | same, scrolled | Line chart with green-above-zero / red-below-zero line, hatched area, right y-axis, date x-axis, end dot. Then the POSITIONS 10 / BALANCES / PREDICTIONS / ORDERS table: asset icon + coin + leverage chip, PnL coloured, expand chevron per row. |
| lighter-1.png | app.lighter.xyz/portfolio, 390px | Banner, "Portfolio" title, full-width white "Connect Wallet" button. One bordered card with Overview / Performance pill tabs, then mono uppercase section labels: BALANCES (Total, Perpetuals, Spot, Binary Options, Public Pools, Staking Equity, Credited in LIT) and PERPETUALS OVERVIEW (Unrealized PnL, Cross Leverage, Maintenance Margin, Cross Margin Usage …). ~32px rows, row lines, dotted-underline labels (tooltips). A dense list that fills the screen. |
| aster-1.png | asterdex.com/en/portfolio/pro, 390px | "Portfolio" title, Trade / Earn underline tabs, pill buttons (Deposit filled, Withdraw, Transfer, Internal Transfer, Swap). One card: "Total Value" + "All ▾" chip, big value, "Today's PnL", full-width divider, PnL (7D) and Volume (7D), inset divider, breakdown rows Perp / Spot / Staking / Grid. Dashed-underline labels. |
| drift-1.png | app.drift.trade/overview, 390px | Kept for context only. "Account Value 👁" label, big value, "7D Change ▾", a full-width account-value chart, then an All-Time Funding / Account Health card, Deposit/Withdraw, History tabs. A pause banner and an RPC error toast cover parts of it. |
| coinbase-1.jpg | Coinbase iOS App Store listing, screenshot 1 | Big balance "$33,683.80", "↗ $131.36 (1.38%) 1D ›" change line, edge-to-edge line chart with dotted fill and an end dot, 1D 1W 1M 1Y YTD ALL pills. A raised list card: icon circle + Crypto / Stocks / Derivatives / Predictions / Cash, value, chevron. Then the asset list. Chart takes ~35% of the first screen. |
| okx-1.jpg | OKX iOS App Store listing, screenshot 4 | "Est total value 👁", big value with a sparkline to the right, "+$134.46 (+4.02%) Today", Cash / Crypto rows with chevrons, full-width white "Buy and sell" pill. Bottom tab bar (Home, Portfolio, Explore, Activity, More). |
| bybit-1.jpg | Bybit iOS App Store listing, screenshot 3 | Avatar + search pill + scan + bell. "Total Assets 👁", big "206,500 USD ▾", orange Deposit pill on the right, "Today's PNL +122.68 USD (12.3%)". Round icon action row (Deposit, Card, Convert, More). Then a white card with Favorites / Hot / New / Gainers / Losers tabs and two-line rows with a coloured change pill. |

### Is our mobile Account tab consistent with these?

Partly. The content matches, the hierarchy does not.

- **Content: consistent.** Every reference shows equity, PnL, deposit/withdraw and a margin/balance breakdown. Our six metrics are the same set Lighter shows under PERPETUALS OVERVIEW and Hyperliquid shows in its key/value card.
- **No history chart: inconsistent.** Hyperliquid, Hyperdash, Drift, Coinbase and OKX all show an account-value or PnL chart with a range selector. Six of seven references have one. We show none, although Hyperliquid's `portfolio` info endpoint gives the data.
- **Equity is too small.** References set the total at 1.5–2.5× body size (Coinbase, Bybit, OKX, Aster, Hyperdash about 28–36px). Ours is `text-base` (16px), the same size as a market price.
- **No period PnL or volume.** References show 7D/30D/Today PnL (Aster, Bybit, OKX, Hyperdash) or volume (Hyperliquid, Aster). We show only unrealized PnL.
- **No grouping.** References put the metrics in a filled card with a header (Hyperliquid, Aster, Lighter) or section labels (Lighter). Ours are bare rows under a hairline.
- **Empty space: inconsistent.** No reference leaves the lower half of the first screen empty. Each one fills it with a chart, a card list or the positions table. Ours ends at about 45% of the viewport.
- **Identity header: consistent.** A small avatar + short address + copy is what Hyperdash and Bybit do. The "Cross Margin" chip is unique to us; the references show margin mode in the card header or a chip next to the value (Aster "All ▾").
- **Actions: consistent.** Three equal buttons in one row match Aster and Hyperliquid. The references always fill the primary action (Deposit), ours are all secondary.

Gallery: `/dev/variants/mobile-account?demo` (V1 Hyperliquid, V2 Hyperdash, V3 Lighter, V4 Aster, V5 Coinbase, V6 Bybit).
