export const MOBILE_BREAKPOINT_PX = 768;

export const PANEL_LAYOUT = {
	MAIN: {
		id: "CHART_WITH_SWAPBOX",
		analysis: { defaultSize: "77%", minSize: "50%" },
		sidebar: { defaultSize: "23%", minSize: "18%" },
	},
	ANALYSIS: {
		id: "CHART_WITH_POSITIONS",
		minHeightPx: 660,
		chart: { minHeightPx: 260 },
		positions: { minHeightPx: 400, disconnectedMinHeightPx: 180 },
	},
	MARKET: {
		id: "CHART_WITH_ORDERBOOK",
		chart: { defaultSize: "76%", minSize: "40%" },
		orderbook: { defaultSize: "24%", minSize: "20%" },
	},
} as const;

export const SIDEBAR_LAYOUT = {
	WIDTH: "16rem",
	WIDTH_MOBILE: "18rem",
	WIDTH_ICON: "3rem",
	KEYBOARD_SHORTCUT: "b",
} as const;

export const TOKEN_SELECTOR_ROW_HEIGHT_PX = 40;
export const TOKEN_SELECTOR_OVERSCAN = 10;

export const MOBILE_BOTTOM_NAV_HEIGHT_PX = 56;

export const APP_HEADER_HEIGHT_CLASS = "h-12";
export const APP_FOOTER_HEIGHT_CLASS = "h-6";
export const APP_BANNER_HEIGHT_CLASS = "h-8";
export const APP_HEADER_OFFSET_CLASS = "pt-12";
// = header + banner stack height (h-12 + h-8 = 3rem + 2rem)
export const APP_HEADER_PLUS_BANNER_OFFSET_CLASS = "pt-20";
export const APP_FOOTER_OFFSET_CLASS = "pb-6";
export const APP_BAR_BUTTON_HEIGHT_CLASS = "h-8 min-h-8";

export const APP_PANEL_CLASS = "min-h-0 min-w-0 overflow-hidden rounded-8 bg-surface";
export const APP_PANEL_GAP_CLASS = "gap-1";
export const APP_PANEL_INSET_CLASS = "p-1";
export const APP_PANEL_PADDING_X_CLASS = "px-3";
