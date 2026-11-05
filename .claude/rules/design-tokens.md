## Design Tokens

- **No hardcoded colors** - Never use hex values like `text-[#2b2e48]` or `bg-[#f1f3f4]`. Always use token utilities from `packages/ui/src/globals.css` + `apps/terminal/src/styles.css`.
- **No arbitrary font sizes** - Never use `text-[10px]` etc. Use the named scale from `docs/design-system.md` §2: `text-2xs` (11/16, uppercase micro-labels only, with `tracking-micro` = 0.04em), `text-xs` (12/16, default), `text-sm` (14/20, nav links and primary CTAs), `text-base` (16/24, symbol, price, modal titles, mobile inputs), `text-lg` (20/28, empty-state titles only). 10px is removed: `text-3xs` is a deprecated alias of `text-2xs` (11px). Do not use it in new code.

### Naming rule for NEW tokens

Never cause **literal doubling** of the Tailwind property prefix. If a token is used as `bg-*`, don't name it with `bg-` prefix (that produces `bg-bg-foo`). If it's used as `text-*`, don't prefix with `text-`. Use a different word or drop the prefix.

| Category | Token pattern | Used as |
|---|---|---|
| Surfaces | `--color-<name>` (no `bg-` prefix) | `bg-<name>` |
| Foregrounds | `--color-fg` / `--color-fg-<variant>` | `text-fg-*` |
| Semantic (shared) | `--color-<brand\|error\|warning\|success\|info>[-soft]` | `bg-*`, `text-*` |
| Fills (interactive state bgs) | `--color-fill-<state>` | `bg-fill-<state>` — NOT stutter, `bg` ≠ `fill` |
| Strokes (borders / rings / outlines / dividers) | `--color-stroke-<variant>` | `border-stroke-*`, `ring-stroke-*`, `outline-stroke-*`, `divide-stroke-*` — NOT stutter, `border` ≠ `stroke` |
| Icons | `--color-icon[-<variant>]` | `text-icon-*` — NOT stutter, `text` ≠ `icon` |

**Rule of thumb:** the only stutter to avoid is a literal repeat of the same word (`bg-bg-*`, `text-text-*`). Having different words like `border-stroke-*` or `bg-fill-*` is fine and actually helps: `bg-fill-hover` clearly means "interactive fill used as background," distinct from `bg-surface` (a surface color).

**Checklist when adding a color:**
1. Put the raw value in Layer 2 (`:root` + `.dark`) of `packages/ui/src/globals.css`.
2. Wire it into Layer 3 `@theme inline` with `--color-<name>: var(--<layer2-name>);`.
3. Pick the `<name>` so that when Tailwind adds its property prefix, there's no literal doubling.
4. If it's used across multiple properties (bg/text), use a single semantic token and let Tailwind generate all three utilities.
5. Update this doc.

### Surfaces — elevation (background → surface → control → overlay)
| Utility | Dark | Light | Use |
|---|---|---|---|
| `bg-background` | `#07070a` | `#eef0f4` | Page ground. It shows in the 4px gaps between panels. |
| `bg-surface` | `#121217` | `#ffffff` | Every panel and card. |
| `bg-control` | `#22222a` | `#eceef3` | Inputs, buttons, toggles, tab pills, segmented tracks. |
| `bg-control-hover` | `#2c2c36` | `#e1e4eb` | Hover, and the active segment inside a track. |
| `bg-overlay` | `#1b1b22` | `#ffffff` | Menus, popovers, tooltips, modals, sheets. |
| `bg-band` | white / 0.04 | `#0009330a` | Spread row and the table header band. |
| `bg-sunken` | `#000000` | `#f5f6fa` | Legacy recessed background. |
| `bg-alternate` | `#121217` | `#f5f6fa` | Legacy alternating rows. |
| `bg-inverse-surface` | `#ffffff` | `#12131a` | Inverse background. |

- Elevation: `shadow-menu` (`--elevation-menu`) on menus, popovers, tooltips, modals and sheets. Panels have no shadow.
- Scrim: `bg-scrim` = rgba(0,0,0,0.6) in dark.

### Foreground — text intensity
| Utility | Dark | Light | Use |
|---|---|---|---|
| `text-fg` | white / 0.95 | `#000626e5` | Primary values, active tabs, titles. |
| `text-fg-secondary` | white / 0.72 | `#000933b8` | Secondary values, book size and total, list values. |
| `text-fg-muted` | white / 0.56 | `#0009338f` | Labels, inactive tabs, table headers, units. |
| `text-fg-disabled` | white / 0.32 | `#00093352` | Disabled. |
- `text-fg-inverse` / `text-fg-inverse-muted` / `text-fg-inverse-disabled` inverted text on dark/brand surfaces

### Semantic — shared bg/text
Each works as `bg-*` and `text-*`:
- `brand` (`text-brand`, `bg-brand`)
- `error` / `warning` / `success` / `info`
- `-soft` variants for subtle tinted backgrounds: `bg-brand-soft`, `bg-error-soft`, etc.

For **borders / rings / outlines / dividers** using these semantic colors, use the stroke variants (see Strokes section) to preserve the intended alpha values.

### Fills — interactive state backgrounds
- `bg-fill-weak` / `bg-fill-weaker` subtle tinted fills (for hover, chips)
- `bg-fill-hover` / `bg-fill-press` interactive state fills
- `bg-fill-selected` selected state fill (brand color)
- `bg-fill-disabled` disabled fill
- `bg-scrim` scrim/backdrop
- `bg-fill-inverse` / `bg-fill-inverse-weak` / `bg-fill-inverse-hover` / `bg-fill-inverse-press` / `bg-fill-inverse-disabled` inverse fills
- `bg-fill` opaque strong fill
- `bg-white` / `bg-yellow` accent fills

### Strokes — borders, rings, outlines, dividers
Use these with `border-*`, `ring-*`, `outline-*`, `divide-*` prefixes. The stroke tokens carry alpha variants (e.g. brand borders are 80% alpha; semantic soft borders are 20% alpha). Collapsing them into flat semantic tokens would lose those alphas, so they stay as `stroke-*`.

- `border-stroke-weak` (dark white / 0.08, light `#0011661a`) tab baselines and region separators inside a panel (also applied globally via `*`)
- `border-stroke-faint` (dark white / 0.05, light `#0011660f`) table rows and list rows
- `ring-stroke-control-focus` (dark white / 0.24, light `#0011663d`) inset 1px focus ring on filled inputs
- No other hairline alpha in new UI (see `docs/design-system.md` §1).
- `border-stroke-strong` prominent border
- `border-stroke-selected` selected/active border (brand)
- `border-stroke-focus` focus ring / border
- `border-stroke-disabled` disabled border
- Semantic (each at 80% alpha): `border-stroke-brand-strong`, `border-stroke-error-strong`, `border-stroke-warning-strong`, `border-stroke-success-strong`, `border-stroke-info-strong`
- Semantic soft (20% alpha): `border-stroke-brand-weak`, `border-stroke-error-weak`, etc.
- Inverse: `border-stroke-inverse-strong` / `border-stroke-inverse-weak` / `border-stroke-inverse-disabled`

All the above also work as `ring-stroke-*`, `outline-stroke-*`, `divide-stroke-*`.

### Icons — for coloring icon elements
- `text-icon` default icon color
- `text-icon-brand` brand icon
- `text-icon-error` / `text-icon-warning` / `text-icon-success` / `text-icon-info` semantic icons
- `text-icon-inverse` / `text-icon-inverse-strong` / `text-icon-inverse-disabled` inverse icons

### Market / Trading Extensions
- `text-market-up` / `bg-market-up` positive PnL, price up (green)
- `text-market-down` / `bg-market-down` negative PnL, price down (red)
- `text-market-neutral` / `bg-market-neutral` unchanged
- `--market-up-flash` / `--market-down-flash` (`text-market-up-flash`, `text-market-down-flash`) brief tick-flash tint: side colour mixed 55% toward `fg`
- `bg-scope-perp` / `bg-scope-spot` / `bg-scope-builders` DEX category colors
- `bg-sel` selection highlight

### Border Radius
- **Always use `rounded-xs`** as the default radius for buttons, inputs, cards, badges, and all interactive elements.
- `rounded-4`, `rounded-6`, `rounded-8` etc. map to the radius scale (multiplied by `--radius-factor`).
- Only deviate for pills/tags (`rounded-full`) or specific design exceptions.
