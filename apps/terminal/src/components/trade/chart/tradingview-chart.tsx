import { t } from "@lingui/core/macro";
import { useEffect, useRef, useState } from "react";
import { CHART_MIN_HEIGHT_PX } from "@/config/chart";
import { loadTradingViewScript } from "@/lib/chart/load-tradingview";
import {
	buildChartOverrides,
	generateChartCssUrl,
	getLoadingScreenColors,
	getToolbarBgColor,
} from "@/lib/chart/theme-colors";
import { browserChartTimezone } from "@/lib/chart/timezone";
import { setChartResolution, useChartIntervalStore } from "@/stores/use-chart-interval-store";
import { chartMarksLabel, toggleChartMarks, useChartMarksStore } from "@/stores/use-chart-marks-store";
import type { ActionId, IChartingLibraryWidget, ResolutionString } from "@/types/charting_library";
import { ChartLineTags } from "./chart-line-tags";
import {
	CHART_CUSTOM_FONT_FAMILY,
	CHART_DISABLED_FEATURES,
	CHART_ENABLED_FEATURES,
	CHART_FAVORITE_INTERVALS,
	CHART_LIBRARY_PATH,
	CHART_LOCALE,
	CHART_TIME_FRAMES,
	CHART_WIDGET_DEFAULTS,
	DEFAULT_CHART_SYMBOL,
	DEFAULT_CHART_THEME,
} from "./constants";
import { createDatafeed } from "./datafeed";
import { useExecutionFills } from "./use-execution-fills";
import { useTradingViewLines } from "./use-tradingview-lines";

interface Props {
	positionDex?: string;
	symbol?: string;
	interval?: string;
	theme?: "light" | "dark";
	onSwitchToDefault?: () => void;
}

export function TradingViewChart({
	positionDex,
	symbol = DEFAULT_CHART_SYMBOL,
	interval,
	theme = DEFAULT_CHART_THEME,
	onSwitchToDefault,
}: Props) {
	const chartKey = `${symbol}:${interval}:${theme}`;
	const [readyWidget, setReadyWidget] = useState<{ widget: IChartingLibraryWidget; key: string } | null>(null);
	const activeWidget = readyWidget?.key === chartKey ? readyWidget.widget : null;
	const lineTags = useTradingViewLines(activeWidget, symbol, positionDex);
	const hidden = useChartMarksStore((state) => state.hidden);
	const fills = useExecutionFills();
	const fillsRef = useRef(fills);
	fillsRef.current = hidden ? [] : fills;
	useEffect(() => {
		if (chartReadyRef.current && widgetRef.current) {
			const chart = widgetRef.current.activeChart();
			chart.clearMarks();
			chart.refreshMarks();
		}
	}, [fills, hidden]);
	const containerRef = useRef<HTMLDivElement>(null);
	const widgetRef = useRef<IChartingLibraryWidget | null>(null);
	const cssUrlRef = useRef<string | null>(null);
	const chartReadyRef = useRef(false);
	const onSwitchToDefaultRef = useRef(onSwitchToDefault);
	onSwitchToDefaultRef.current = onSwitchToDefault;

	useEffect(() => {
		if (!containerRef.current) return;
		let disposed = false;
		let stopIntervalTracking: (() => void) | undefined;
		chartReadyRef.current = false;

		const initWidget = async () => {
			try {
				if (disposed || !containerRef.current) return;
				// react-doctor-disable-next-line react-doctor/async-defer-await
				await loadTradingViewScript();

				if (disposed || !containerRef.current || !window.TradingView) return;

				if (widgetRef.current) {
					widgetRef.current.remove();
				}

				if (cssUrlRef.current) {
					URL.revokeObjectURL(cssUrlRef.current);
				}

				const overrides = buildChartOverrides();
				const loadingColors = getLoadingScreenColors();
				const toolbarBg = getToolbarBgColor();
				const customCssUrl = await generateChartCssUrl();
				if (disposed || !containerRef.current || !window.TradingView) {
					URL.revokeObjectURL(customCssUrl);
					return;
				}
				cssUrlRef.current = customCssUrl;

				const widget = new window.TradingView.widget({
					container: containerRef.current,
					library_path: CHART_LIBRARY_PATH,
					datafeed: createDatafeed(
						() => fillsRef.current,
						() => {
							if (chartReadyRef.current) widgetRef.current?.activeChart().resetData();
						},
					),
					symbol: symbol,
					interval: (interval ?? useChartIntervalStore.getState().resolution) as ResolutionString,
					locale: CHART_LOCALE,
					fullscreen: CHART_WIDGET_DEFAULTS.FULLSCREEN,
					autosize: CHART_WIDGET_DEFAULTS.AUTOSIZE,
					theme: theme,
					timezone: browserChartTimezone() as import("@/types/charting_library").Timezone,
					debug: CHART_WIDGET_DEFAULTS.DEBUG,
					custom_font_family: CHART_CUSTOM_FONT_FAMILY,
					time_frames: CHART_TIME_FRAMES,
					enabled_features: CHART_ENABLED_FEATURES,
					disabled_features: CHART_DISABLED_FEATURES,
					overrides: overrides,
					loading_screen: loadingColors,
					toolbar_bg: toolbarBg,
					custom_css_url: customCssUrl,
					studies_overrides: {},
					context_menu: {
						items_processor: async (items, factory) => [
							factory.createAction({
								actionId: "Chart.CustomActionId" as ActionId,
								label: chartMarksLabel(),
								onExecute: toggleChartMarks,
							}),
							...items.filter(
								(item) =>
									!("getState" in item) ||
									(item.getState().actionId !== "Chart.Marks.ToggleVisibility" &&
										!/^(hide|show) marks on bars$/i.test(item.getState().label)),
							),
						],
					},
					favorites: {
						intervals: CHART_FAVORITE_INTERVALS,
					},
				});
				widgetRef.current = widget;

				widget.onChartReady(() => {
					if (disposed || widgetRef.current !== widget) return;
					chartReadyRef.current = true;
					const chart = widget.activeChart();
					const intervalChanged = (resolution: ResolutionString) => setChartResolution(resolution);
					chart.onIntervalChanged().subscribe(null, intervalChanged);
					stopIntervalTracking = () => chart.onIntervalChanged().unsubscribe(null, intervalChanged);
					chart.clearMarks();
					chart.refreshMarks();
					setReadyWidget({ widget, key: `${symbol}:${interval}:${theme}` });
				});

				if (onSwitchToDefaultRef.current) {
					widget.headerReady().then(() => {
						if (disposed || widgetRef.current !== widget) return;

						const btn = widget.createButton({ align: "right", useTradingViewStyle: false });
						btn.style.cssText =
							"display:inline-flex;align-items:center;gap:4px;padding:0 4px;cursor:default;height:100%;";

						const tvLabel = document.createElement("span");
						tvLabel.textContent = t`TradingView`;
						tvLabel.dataset.htActive = "true";
						tvLabel.style.cssText =
							"display:inline-flex;align-items:center;height:20px;padding:0 4px;font-size:12px;font-weight:400;color:var(--tv-fg);";

						const sep = document.createElement("span");
						sep.style.cssText =
							"display:inline-block;width:1px;height:12px;background:var(--tv-border);align-self:center;flex-shrink:0;";

						const defaultLabel = document.createElement("span");
						defaultLabel.textContent = t`Default`;
						defaultLabel.style.cssText =
							"display:inline-flex;align-items:center;height:20px;padding:0 4px;font-size:12px;font-weight:400;color:var(--tv-muted-fg);border-radius:4px;cursor:pointer;";
						defaultLabel.onpointerover = () => {
							defaultLabel.style.color = "var(--tv-fg)";
						};
						defaultLabel.onpointerout = () => {
							defaultLabel.style.color = "var(--tv-muted-fg)";
						};
						defaultLabel.onclick = () => {
							onSwitchToDefaultRef.current?.();
						};

						btn.appendChild(defaultLabel);
						btn.appendChild(sep);
						btn.appendChild(tvLabel);
					});
				}
			} catch {
				// widgetRef stays null on failure; source toggle then shows default chart
			}
		};

		initWidget();

		return () => {
			disposed = true;
			stopIntervalTracking?.();
			setReadyWidget(null);
			if (widgetRef.current) {
				widgetRef.current.remove();
				widgetRef.current = null;
			}
			chartReadyRef.current = false;
			if (cssUrlRef.current) {
				URL.revokeObjectURL(cssUrlRef.current);
				cssUrlRef.current = null;
			}
		};
	}, [symbol, interval, theme]);

	return (
		<div className="relative w-full h-full" style={{ minHeight: CHART_MIN_HEIGHT_PX }}>
			<div ref={containerRef} className="w-full h-full" />
			<ChartLineTags widget={activeWidget} tags={lineTags} />
		</div>
	);
}
