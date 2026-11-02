export const accountTabRootClass = "flex min-h-0 min-w-0 flex-1 flex-col";

export const accountTableShellClass = "flex min-h-0 flex-1 flex-col overflow-hidden";

export const accountTableClass = "w-full min-w-max";

export const accountHeadClass = "h-6 whitespace-nowrap text-2xs font-normal uppercase tracking-micro text-fg-muted";

export const accountNumHeadClass = "text-right";

export const accountCellClass = "h-7 whitespace-nowrap text-xs tabular-nums text-fg";

export const accountNumCellClass = "text-right";

export const accountRowClass = "group";

export const accountSortButtonClass =
	"inline-flex items-center gap-1 uppercase transition-colors hover:text-fg focus-visible:outline-2 focus-visible:outline-stroke-focus";

export const accountHeadActionClass =
	"uppercase text-fg transition-colors hover:text-fg-secondary disabled:cursor-not-allowed disabled:text-fg-disabled focus-visible:outline-2 focus-visible:outline-stroke-focus";

export const accountTextLinkClass =
	"inline-flex items-center gap-1 text-fg transition-colors hover:text-fg-secondary focus-visible:outline-2 focus-visible:outline-stroke-focus";

export const accountFooterClass =
	"flex h-7 shrink-0 items-center gap-3 border-t border-stroke-faint px-3 text-xs tabular-nums";

export const accountInlineErrorClass = "px-3 py-1 text-xs text-market-down";

export function getMarketValueClass(value: number | null | undefined): string {
	if (value == null || !Number.isFinite(value) || value === 0) return "";
	return value > 0 ? "text-market-up" : "text-market-down";
}

export const accountFilteredEmptyClass = "shrink-0 px-3 py-6 text-center text-xs text-fg-muted";

export function getAriaSort(active: boolean, descending: boolean): "ascending" | "descending" | undefined {
	if (!active) return undefined;
	return descending ? "descending" : "ascending";
}
