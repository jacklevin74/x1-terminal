# X1 Terminal design system (v1, 2026-11-02)

This file is the contract for every UI change. Values come from measuring Hyperliquid, Lighter, Paradex, Backpack and dYdX (desktop and mobile) and our own app. The raw measurements are in `research/redesign-refs/measurements/`. If a value is not here, ask before you invent one.

Owner decisions that override any reference:
- Near-black surfaces. Saturated market colors (`--market-up` #2ee6a6, `--market-down` #ff5c6c).
- Order book depth bars stay gradients.
- Controls are filled, never outlined. Hairline dividers between regions and table rows are allowed. A red outline is allowed only for an error state.
- The active Long/Short side is a solid fill of the market color, with dark text.
- Logo: `components/trade/header/x1-terminal-logo.tsx`. Do not change it.
- Keep 100% of features and options. The checklist is `research/redesign-refs/feature-inventory.md`.

## 1. Tokens

All colors come from tokens in `apps/terminal/src/styles.css` (app layer) and `packages/ui/src/globals.css`. Never use a hex literal in a component. Light mode must keep working: every new token has a light value.

### Surfaces (dark)
| Token (Tailwind) | Value | Use |
|---|---|---|
| `bg-background` (page) | #07070A | Page ground. It shows in the gaps between panels. |
| `bg-surface` (panel) | #121217 | Every panel and card. |
| `bg-control` | #22222A | Inputs, buttons, toggles, tab-pill tracks. |
| `bg-control-hover` | #2C2C36 | Hover and the active segment inside a track. |
| `bg-overlay` | #1B1B22 | Menus, popovers, tooltips, modals, sheets. |
| `bg-band` | white / 0.04 | Spread row and the table header band. |

### Text ramp (dark)
| Token | Value | Use |
|---|---|---|
| `text-fg` | white / 0.95 | Primary values, active tabs, titles. |
| `text-fg-secondary` | white / 0.72 | Book size and total, secondary values, list values. |
| `text-fg-muted` | white / 0.56 | Labels, inactive tabs, table headers, units. |
| `text-fg-disabled` | white / 0.32 | Disabled. |

### Hairlines
- `border-stroke-weak` = white / 0.08: tab baselines, region separators inside a panel.
- `border-stroke-faint` = white / 0.05: table rows and list rows.
- No other hairline alpha.

### Market and accents
- `text-market-up` / `bg-market-up`, `text-market-down` / `bg-market-down` (unchanged).
- Brand is neutral: near-white #ECECF1 in dark, #16171D in light. It is used for Connect / Enable, checked controls, slider ranges and focus rings. No blue.

## 2. Type

- Family: Inter Variable for UI. Numbers use the same family with `tabular-nums` (`font-variant-numeric: tabular-nums`) everywhere numbers line up. Geist Mono is only for the logo.
- Sizes: **11 / 12 / 14 / 16 / 20** px. Line heights: 16 / 16 / 20 / 24 / 28.
  - 11px: uppercase micro-labels only, letter-spacing 0.04em.
  - 12px: default for all UI text and data.
  - 14px: nav links and primary CTAs.
  - 16px: market symbol, market price, modal titles, mobile inputs (prevents iOS zoom).
  - 20px: empty-state titles only.
  - 10px is removed.
- Weights: **400** default, **500** for the active state, symbol, price and section titles. **600** only for the primary CTA and the active Long/Short side. No 700, except in the logo.
- Letter-spacing: 0 everywhere, except 0.04em on 11px uppercase.

## 3. Sizes

### Control heights
- Desktop:
  - 20: chip, chart interval button.
  - 24: text trigger, header row, book/table header.
  - 28: tab pill, menu item, table row, secondary button in a row.
  - 32: input, select, toggle track, button, nav icon button, nav CTA.
  - 36: primary CTA, tab row.
- Mobile:
  - 32: compact.
  - 40: input, toggle track, icon button, tab row.
  - 44: primary CTA (sticky bar).
  - Minimum touch target 32.

### Radius
- 4: checkbox, badge, chip.
- 6: segment inside a track (8 minus the 2px inset).
- 8: controls, tooltip, panel.
- 12: menu, popover.
- 16: modal, sheet top corners.
- 9999: dots, slider thumb, avatar only.

### Spacing
4px grid: **4 / 8 / 12 / 16 / 24**. Use 2 only as the segmented-control inset.

### Elevation
Menus and popovers: `0 4px 8px rgba(0,0,0,.45), 0 16px 32px rgba(0,0,0,.55)` plus an inset 1px top highlight of white / 0.06. Modals use the same. The scrim is rgba(0,0,0,0.6). Panels have no shadow.

## 4. Layout

- Panels float on the page ground. The gap between panels is 4px, the outer inset is 4px, and the radius is 8. Panels have no stroke between them.
- Panel padding-x: 12 on every panel.
- Top nav: 48px. Links are 14/400 muted. The active link is `text-fg` on a 28px filled pill (`bg-control`, radius 8).
- Footer: 24px, 11/400 uppercase muted. The grid ends at the top of the footer; the footer never covers content.
- The testnet banner is a filled warning band. Its button must have readable contrast.

## 5. Components

### Tabs (one grammar everywhere: panel tabs, table tabs, mobile tabs, modal tabs)
- Pill tabs in a 36px row. Each pill is 28px tall, padding-x 12, radius 8.
- Active: `bg-control`, 12/500 `text-fg`. Inactive: 12/400 `text-fg-muted`, hover `text-fg`.
- Reserve the 500 width so the row does not shift. A count badge sits inside the pill.
- A 1px `border-stroke-weak` baseline under the row. Never a double border.

### Segmented control (side toggle, Cross/Isolated, units)
- 32px track (mobile 40) in `bg-control`, radius 8, inset 2. The segment is 28 tall, radius 6.
- The neutral active segment is `bg-control-hover`.
- The Long/Short active segment is `bg-market-up` / `bg-market-down` with `text-background`, 12/600.

### Buttons
| Tier | Height | Text | Fill |
|---|---|---|---|
| Primary CTA | 36 (mobile 44) | 14/600 | Solid. Place order uses the side color. Connect / Enable use brand. |
| Secondary | 32 | 12/500 | `bg-control`, hover `bg-control-hover`. |
| Row action | 28 | 12/500 | `bg-control`. |
| Icon button | 32 (mobile 40) | — | `bg-control` or transparent with a hover fill. Radius 8. |

- Disabled: `text-fg-disabled` on `bg-control`. Never the same alpha as its background.
- Do not change opacity on hover.

### Inputs
- 32px (mobile 40), filled `bg-control`, no stroke, radius 8.
- The label is inline inside the field, left, 12/400 muted. The value is right-aligned, 12/400 `text-fg`, tabular (mobile 16).
- The unit or suffix is inline at the right, 12/500, with a chevron if it is selectable. It is part of the field, not a separate button.
- Focus: inset 1px ring of white / 0.24, plus `bg-control-hover`. Error: inset 1px `market-down` ring and a 12px error text below.
- Quick-fill buttons (Mid, Max, %) sit inside the field as 20px chips.

### Checkbox
16px, radius 4, filled `bg-control`, no stroke. Checked: brand fill with a dark check. Label 12/400.

### Slider
- 4px track in `bg-control`. The filled range uses the side color in the order form, brand elsewhere.
- 14px thumb (mobile 20px with a 44px hit area). The thumb stays inside the gutter at 0%.
- 5 clickable step dots of 6px at 0/25/50/75/100.
- A 32px % input sits to the right. Existing quick % buttons stay available as the dots.

### Select and dropdown menu
- Trigger: a filled input (32), or a text trigger (24) with a muted chevron in dense headers.
- Menu: `bg-overlay`, radius 12, padding 4. Items are 28px, radius 8, 12/400. The selected item has 500 weight and a check icon. Hover `bg-control`. Apply the elevation from section 3.

### Tooltip
`bg-overlay`, radius 8, 12/16, padding 8 x 6. Any label that has a tooltip gets a dashed muted underline. The tooltip never covers its trigger. On mobile it opens on tap.

### Modal and sheet
- Desktop modal: `bg-overlay`, radius 16, padding 16 (24 for wide flows). Title 16/500. Close is an icon button.
- Mobile (<768px): a bottom sheet with radius 16 on the top corners. It covers the bottom nav.
- Footer actions: the primary CTA is full width or right-aligned, using the button tiers.

### Tables (positions, orders, history, balances, market picker)
- Header row: 24px, `bg-band` optional, 11/400 uppercase 0.04em muted. Sortable headers show a muted sort icon.
- Body row: 28px (market picker 40), 12/400 tabular. Separator: 1px `border-stroke-faint`. Hover: `bg-control` at 50%.
- Positive and negative values use the market colors. Numbers are right-aligned. Text is left-aligned.
- Empty state: centered 12/400 muted, plus one 28px secondary button when an action exists (for example Connect wallet).
- Loading: skeleton rows at the row height.

### Order book and trades
- Header: 24px, 11/400 uppercase 0.04em muted. The unit uses the same color.
- Rows: 20px, 12/400 tabular. The price is in the market color. Size and total are `text-fg-secondary`.
- Depth bar: gradient, peak alpha 0.16.
- Spread row: 24px `bg-band`, with no hairlines. The label is muted and the values are secondary.
- Trades use the same row height, font and header as the book. Trade prices use the book's precision.
- Precision and depth selects use the 24px text trigger and a custom menu.

### Market header
- Favorites strip: 32px, with 20px chips at 12/400. The change is colored.
- Market row: 48px. Symbol 16/500. Price 16/500 tabular, colored by tick. Stats are stacked: an 11px uppercase muted label above a 12/400 tabular value, 4px apart, columns 24 apart.

### Chart toolbar
32px row. Interval buttons are 20px, 12/400, and the active one is a color change only (`text-fg`), with no bold. Chart type and source use text triggers.

### Order form
- The order type uses pill tabs: Market | Limit | More▾. The More menu holds Stop Market, Stop Limit, TWAP and Scale. Every current type stays.
- Margin and leverage: two equal 32px secondary buttons, "Cross" and "10x". Both open the existing margin modal.
- Summary rows: 24px pitch, label muted, value `text-fg`, 12/400.
- Account section: an 11px uppercase muted title, padding 12. It sits directly under the form, with no dead space.

### Mobile
- Gutter 12 everywhere.
- Bottom nav: inactive items muted, the active item `text-fg`. Touch targets are at least 32.
- One tab grammar (pill tabs, 32px pill in a 40px row).
- Sticky CTA bar at 44.
- Bottom sheets for every modal.

## 6. Done means

- Every value above can be traced to a token or utility. Search the change for hex literals and arbitrary `text-[Npx]` sizes; only the logo file may contain them.
- Visible features match the inventory checklist.
- `pnpm typecheck` passes. Biome passes on the changed files.
- Before and after screenshots exist for desktop 1600x1000 and mobile 390x844.
