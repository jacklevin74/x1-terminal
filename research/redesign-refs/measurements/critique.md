# x1-terminal vs the top perp exchanges: role-by-role targets

Reference set: Hyperliquid (HL), Lighter (LT), Paradex (PX), Backpack (BP) and dYdX (DY) on desktop, plus HL and LT on mobile. Hyperdash was not measured because Cloudflare blocked it. Measurements of other sites were taken while logged out, so populated table rows, account rows and the connected CTA have no reference data.

## 1. Token system

Every target below uses only these values.

**Type scale.** 11 / 12 / 14 / 16 / 20 px. Line heights are 16 / 16 / 20 / 24 / 28.
- 11px: uppercase micro-labels only, letter-spacing 0.44px.
- 12px: almost all UI text.
- 14px: nav links and CTAs.
- 16px: market symbol, market price, modal titles, mobile inputs.
- 20px: empty-state titles only.
- Remove 10px.

**Weights.** 400 and 500 only. Remove 600 and 700. 500 marks the active state and the CTA.

**Letter-spacing.** 0.44px on 11px uppercase. 0 everywhere else. Remove 0.25, 0.3, 0.5, 0.55, 0.6, 1, -0.3 and -0.35.

**Text colors.**
- primary: white/0.95.
- secondary: white/0.72 (book size and total, values in lists).
- muted: white/0.56 (labels, inactive tabs, headers).
- disabled: white/0.32.
- Today muted is 0.78. That is too close to primary. References put muted at about 0.55–0.65 (#8c8d91, #949e9c, #a9abae, #888891).

**Control heights.**
- Desktop: 20 / 24 / 28 / 32 / 36.
  - 20: chip, chart interval.
  - 24: text trigger, header rows.
  - 28: tab pill, menu item, table row.
  - 32: input, toggle, button, nav button, icon button.
  - 36: primary CTA and tab row.
- Mobile: 32 / 40 / 44.
  - 32: compact controls.
  - 40: input, toggle, icon button, tab row.
  - 44: CTA.
- This matches the X1 button-tier memory: 36 section, 44 hero, 14px CTA text.

**Radius.** 4 / 6 / 8 / 12 / 16, plus 9999 for dots and thumbs only.
- 4: checkbox, badge, chip.
- 6: segment inside a track (8 minus the 2px inset).
- 8: controls, tooltip, panel.
- 12: menu and popover.
- 16: modal and sheet top.
- Remove 2 and 32.

**Spacing.** 4 / 8 / 12 / 16 / 24. Use 2 only for the segmented-control inset. Remove 6, 10 and 20.

**Surfaces.**
- page: #0A0A0E. Consider #060609 to widen the step to the panel, like LT #06060c → #121218.
- panel: #121217.
- control fill: #22222A.
- overlay: #1B1B22.
- band fill (spread row, table header): white/0.04.

**Hairlines.** Keep two: 0.08 (tab baselines, band edges) and 0.05 (rows). Today there are six (0.12, 0.073, 0.07, 0.049, 0.05, 0.043).

## 2. Role by role

Format: ours → reference min–max (most common) → target.

### Layout
- **page-bg:** #0A0A0E → #06060c–#212124 (near-black) → #0A0A0E or #060609.
- **panel structure:** flush panels, 0 gap, 0 radius, 1px white/0.12 dividers → gap 0–12 (3–4), radius 0–16 (5–6), no stroke in HL/PX/BP → 4px gap of page-bg, radius 8, filled #121217, no divider and no stroke. The outer page inset is 4px.
- **panel padding-x:** book 8, form 12, account 8 (left edges are 4px apart) → 7–16 (about 10–12) → 12 on every panel.
- **topnav:** 44px, links 12/400, ls 0.3 → 44–64 (about 56), 12–15 (14) → 48px. Links are 14/400 muted. The active link is primary with a 28px filled pill (white/0.06, radius 8). Conflict: the X1 nav contract says 72px. Confirm whether the terminal is under that contract.
- **topnav-cta and icon buttons:** Connect 30px, icons 32px (desktop); 44 and 32 mixed (mobile) → 28–40 (32) → desktop 32 for all of them. Mobile 40 for all of them.
- **footer:** 32px fixed. It covers the bottom 32px of the grid → 25.6–32 → 24px, 11/400 uppercase muted. The grid ends at the top of the footer.

### Market header
- **market-header:** 74px in two rows, stats inline → one row of 40–66 (about 56), stats stacked → favorites strip 32px (chips 20px, 12/400) plus a 48px market row.
- **symbol:** 12/500 → 14–20 (16) → 16/500.
- **market-price:** 14/600 inside the stats row → 12–18 (16–18/500) → 16/500 tabular, colored by tick.
- **stat-label:** 11/400 uppercase, ls 0.275, white/0.624 → 11–12 (12, or 11 uppercase in LT) → 11/400 uppercase, ls 0.44, muted. It sits above the value with a 4px gap. Columns are 24px apart.
- **stat-value:** 12/500 → 12–13 (12/400) → 12/400 tabular primary.

### Order book and trades
- **panel-tab:** 32px with a 2px brand underline, row 33 → underline (HL/PX/DY) or filled pill (LT/BP), 21–42 → one pill tab everywhere.
  - 28px pill in a 36px row, padding-x 12, radius 8, fill #22222A.
  - Active 12/500 primary. Inactive 12/400 muted.
  - Reserve the bold width so the layout does not shift.
  - This follows the "filled not outlined" rule.
- **chart interval:** active state is 600 + white → color only in all five refs → 20px high, 12/400. Active state is a color change only.
- **book-header:** 33px, 11px, "PRICE" uppercase but "Size/Total" mixed case, unit brighter than label → 17–28 (about 24), 11–12 → 24px. All columns 11/400 uppercase, ls 0.44, muted. The unit uses the same color.
- **book-row:** 20px, 11/400, sizes white → 17.6–26 (23), 12/400, sizes dimmed → 20px, 12/400 tabular. Size and total are secondary.
- **book-price:** 11/500 → 12/400 → 12/400 with saturated up/down colors. Keep the colors. Drop the 500 weight.
- **book-depth-bar:** gradient, peak alpha 0.25 → 0.08–0.16 (DY uses a gradient at 0.16) → keep the gradient, peak 0.16. Optional: a 1px top and bottom inset like DY (19 inside 21).
- **spread row:** 30px, 12px, hairlines top and bottom; mobile mid-price 24/700 #ffc23d → 19.5–42 (about 24), filled band → 24px filled band (white/0.04), no hairlines. Label is muted, value is secondary. Mobile mid-price becomes 16/500, colored by tick. Remove the yellow.
- **precision select:** native select in 11px brand color (desktop); ui-monospace stroked 30px (mobile) → text-only trigger 14–31, 12px, no fill → 24px text trigger, 12/400 secondary with a chevron, and a custom menu. Remove the monospace.
- **trades-row:** 36px rows on a 37px pitch → 17.6–24.5 (24) → 20px, the same as the book.
- **trades-header:** 36px, 12px white → match the book → identical to book-header.
- **price decimals:** trades show 2 decimals, the book shows 0 → trades use the book precision.

### Order form
- **side toggle:** 42px track, 38px pill, 14/600 → 28–44 (32–33) → desktop track 32 / pill 28, radius 8 outer / 6 inner, 12/500. Mobile track 40 / pill 36. The active side is a solid fill. Check the contrast of the text on the red fill; I have not measured it.
- **order type:** 32px dropdown at 14/600 → tabs plus a "More" dropdown in all five refs → pill tabs "Market | Limit | More▾", 28px.
- **margin/leverage:** one 32px button, "Cross · 10x", 14/600 → two or three equal 32px filled buttons (HL, PX) → two equal 32px #22222A buttons, "Cross" and "10x", 12/500.
- **form label:** 10/500 uppercase, stacked above the field, ls 0.25 on one label and 0.5 on another → 12/400 muted inside the field (HL, LT, PX, DY) → inline label, 12/400 muted, no uppercase.
- **form input:** 28px, transparent fill, 1px stroke (desktop); 48px 16/600 stroked (mobile) → 28–48 (32), filled in LT/BP/DY → desktop 32 filled #22222A, no stroke, radius 8, value 12/400 right-aligned tabular. Focus is an inset 1px white/0.24 ring. Mobile 40, 16/400 to prevent iOS zoom.
- **unit suffix:** separate 30px button beside a 28px input → inline in the field → inline at 12/500 with a chevron. Its height is part of the field.
- **slider:** 6px track, 16px thumb, 10px labels, no dots → track 4–10, thumb 14–18, 5 dots of 6–10px → 4px track in #22222A, accent range, 14px thumb (20px on mobile with a 44px hit area). Use 5 dots of 6px. Remove the % labels and add a 32px % input next to the slider. Keep the thumb inside the gutter at 0%.
- **checkbox:** 16px, radius 4, 1px white/0.6 stroke → 14–20, radius 2–6 → 16px, radius 4, filled #22222A, no stroke. Checked is an accent fill with a dark check. Label 12/400.
- **form CTA:** 40px at 14/600 (desktop); 50px outlined accent on a translucent fill (mobile) → 28–44 (32–33) → desktop 36, mobile 44 in a sticky bar, 14/500, solid fill. Connect is brand-filled. Place order uses the side color. The mobile CTA breaks the no-partial-blue-fill rule.
- **summary rows:** 28px pitch, label ls 0.5 → 22–28.7 (about 24) → 24px pitch, ls 0. Label muted, value primary.
- **account:** 12/500 uppercase, padding 8, 149px dead space above it → padding 12. The section label is 11/400 uppercase muted. Remove the spacer so the account panel sits directly under the form.

### Tables
- **table-tab:** same as panel-tab. Remove the double 1px bottom border.
- **table header:** 36px, 10/600, ls 1 (market selector) → 24–40, 12 sentence case → 24px, 11/400 uppercase, ls 0.44, muted. Use the same style as the book header.
- **table row:** 48px (market selector); positions not seen → 24–44 → 28px for positions, 40px for the market picker, with 0.05 hairlines.
- **empty state:** 12px centered with no CTA (desktop); two different icon sizes, 64 and 80 (mobile) → 12–14, left-aligned or centered → 12/400 muted, centered, with one 28px secondary "Connect wallet" button. Use one spec on both tabs.

### Overlays
- **dropdown menu:** bg #121217, the same as the panel, shadow alpha 0.08 → an elevated fill (#1b2429, #2b2b30, #28282B) → #1B1B22, radius 12, padding 4, items 28px radius 8. The selected item gets a check icon and weight 500. Shadow: 0 4px 8px rgba(0,0,0,.45), 0 16px 32px rgba(0,0,0,.55), plus an inset 1px top highlight white/0.06.
- **tooltip:** #1B1B22, radius 8, 12/16 (desktop); none on mobile → radius 4–8, 11–12 → keep it. Give every tooltip label a dashed muted underline. Mobile: open on tap, placed so it does not cover the trigger.
- **modal:** radius 12, title 16/600, navy backdrop rgba(0,6,38,.66); centered dialogs on mobile → radius 6–24 (16), neutral scrim, bottom sheets on mobile → radius 16, title 16/500, scrim rgba(0,0,0,0.6). Mobile uses bottom sheets that cover the bottom nav.
- **margin modal segments:** radius 2, 36px → 32px segmented control, radius 8 / 6.

### Mobile
- **gutter:** 8 / 9 / 12 / 16 → 10–12 → 12 everywhere.
- **tab grammars:** five → one or two → one pill tab, 32px pill in a 40px row.
- **bottom nav:** inactive #fff → muted inactive → inactive muted, active primary plus the accent dot.
- **touch targets:** 20px intervals → 32px minimum.

## 3. Inconsistencies inside our app

1. Control heights for the same role:
   - Inputs are 28 (desktop) and 48 (mobile).
   - The unit button is 30 next to a 28 input.
   - Nav buttons are 30, 32 and 44.
   - CTAs are 30, 38, 40 and 50.
   - The mobile book header row mixes 44 and 30.
2. Trades rows are 36px. Book rows are 20px.
3. Book text is 11px. Trades text is 12px.
4. The book header is 11px at 0.78. The trades header is 12px white.
5. Header case is mixed in three places: "PRICE" vs "Size", "TIME" vs "Size (BTC)", and "Price" / "24h Change" in the market picker.
6. Letter-spacing on form labels is 0.25 on SIZE and 0.5 on AVAILABLE.
7. There are five tab grammars on mobile, plus an order-type dropdown.
8. Controls mix strokes and fills:
   - Stroked: input, checkbox, precision select, Settings selects, search.
   - Filled: #22222A buttons.
9. There are three or four Connect Wallet variants.
10. The radius values 2 and 32 are off-system.
11. The market-selector category pill uses a translucent accent fill.
12. The dropdown bg is the same color as the panel under it.
13. There are six hairline alphas.
14. Weight jumps (600) mark some active states but not others.

## 4. Visible defects

- The fixed footer covers the bottom 32px of the grid.
- There is 149px of dead space above the account panel.
- Disabled text alpha equals the bg alpha (0.12 on 0.12) on the USDC unit and the Confirm button.
- The "Switch to Mainnet" banner button has dark text on a dark fill.
- The mobile Trade tab shows "$ $76,356". The Chart tab shows "$76.36K".
- The positions tab bar has a double border.
- The order-type menu may overflow its panel. I have not checked this.
- The slider thumb at 0% spills past the gutter.
- The mobile stats strip and tab row overflow with no fade.
- The mobile market list is not virtualized (91,921px tall).

## 5. Gaps ranked by how much they make us look less premium

1. **Panel structure.** Flush panels with 0.12 strokes look like a wireframe. Use floating filled panels with a 4px gap and radius 8.
2. **Text hierarchy.** Muted at 0.78, scattered 600 and 700 weights, and the sizes 10/11/14 mixed in data. Use a 0.95 / 0.72 / 0.56 ramp with 400/500 and 12px as the default.
3. **Density rhythm.** Trades at 36 against a book at 20, a 74px market header, summary rows at 28. Use 20 / 24 / 28 rows and a 32 / 36 control grid.
4. **Form controls.** Stacked 10px labels, stroked 28px inputs and a detached 30px unit button. Use inline-label filled 32px fields with the suffix inline.
5. **Tab grammar.** Use one pill tab, and replace the order-type dropdown with tabs.
6. **Market header.** The 12px symbol and inline stats look weak. Use a 16px symbol and price, with stacked micro-labels.
7. **Overlays.** The menu bg equals the panel, the shadow cannot be seen, the backdrop is navy, and mobile has no sheets.
8. **Visible defects.** Fix all items in section 4 before any polish pass.
9. **Book polish.** 12px rows, 400-weight prices, secondary sizes, a muted unit, a filled spread band, depth peak at 0.16.
10. **Mobile.** The outlined translucent CTA, the 8–16px gutters, 20px touch targets and inactive white bottom-nav items.

## 6. Notes

- The X1 nav-contract memory sets a 72px nav. That is too tall for a terminal. Confirm whether the contract covers x1-terminal before you change the 44px nav.
- Both LT and HL use pale book price colors to keep a deep book calm. The owner chose saturated colors, so this is not a target. It is an option only.
- Our values come from the measurement JSON at `/private/tmp/claude-501/-Users-austinludwig-Desktop-x1/9dedae65-09ce-425b-a263-b36579eeda2f/scratchpad/measure-refs/x1-terminal-1600x1000/` and `/private/tmp/claude-501/-Users-austinludwig-Desktop-x1/9dedae65-09ce-425b-a263-b36579eeda2f/scratchpad/measure-refs/x1-terminal-mobile-390x844/`. I did not re-measure them in this step.