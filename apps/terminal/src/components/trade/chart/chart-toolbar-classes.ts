export const chartToolbarChipClass = "max-md:h-8 px-1 tabular-nums";

export function getChartToolbarChipStateClass(isActive: boolean) {
	return isActive ? "text-fg" : "text-fg-muted hover:text-fg";
}

export const chartToolbarDividerClass = "h-3 w-px shrink-0 bg-stroke-weak";
