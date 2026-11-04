import type { CandleTooltipCustomCallbackData, DeepPartial, Styles } from "klinecharts";
import { type CandleType, LineType, TooltipShowRule, TooltipShowType, YAxisPosition } from "klinecharts";
import { colorToCss, colorToHex, colorToRgba, getChartColors } from "./theme-colors";

function formatTooltipTs(ts: number): string {
	const d = new Date(ts);
	return `${d.getMonth() + 1}/${d.getDate()}/${String(d.getFullYear()).slice(2)} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

function formatPrice(n: number): string {
	if (n >= 1) return n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
	const s = n.toString();
	const dot = s.indexOf(".");
	if (dot === -1) return n.toLocaleString("en-US", { minimumFractionDigits: 2 });
	let zeros = 0;
	for (let i = dot + 1; i < s.length; i++) {
		if (s[i] === "0") zeros++;
		else break;
	}
	const decimals = Math.max(2, zeros + 4);
	return n.toLocaleString("en-US", { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

function formatVolume(n: number): string {
	if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
	if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
	return n.toLocaleString("en-US", { maximumFractionDigits: 0 });
}

interface KlineStyleOptions {
	yAxisInside?: boolean;
	// Theme is read implicitly via CSS custom properties on `document.documentElement`,
	// so this argument has no effect on the returned styles. It exists so callers can
	// thread `theme` as a real dependency instead of suppressing it via `void theme`.
	theme?: "light" | "dark";
}

const CHART_TEXT_SIZE = 12;

export function buildKlineStyles(candleType: CandleType, options?: KlineStyleOptions): DeepPartial<Styles> {
	const colors = getChartColors();

	const textSecondary = colorToCss(colors.textSecondary);
	const textMuted = colorToCss(colors.textMuted);
	const green = colorToHex(colors.green);
	const red = colorToHex(colors.red);
	const gridColor = colorToCss(colors.borderFaint);
	const scaleLineColor = colorToCss(colors.border);
	const textOnMarket = colorToHex(colors.page);
	const family = colors.fontFamily || undefined;
	const compact = options?.yAxisInside ?? false;

	const tooltipText = {
		size: CHART_TEXT_SIZE,
		family,
		color: textSecondary,
		marginLeft: 8,
		marginTop: 4,
		marginRight: 8,
		marginBottom: 0,
	};

	const crosshairAxis = {
		show: true,
		line: {
			show: true,
			style: LineType.Dashed,
			dashedValue: [4, 4],
			size: 1,
			color: textMuted,
		},
		text: {
			show: true,
			color: colorToCss(colors.foreground),
			size: CHART_TEXT_SIZE,
			family,
			paddingLeft: 4,
			paddingRight: 4,
			paddingTop: 4,
			paddingBottom: 4,
			borderRadius: 4,
			backgroundColor: colorToHex(colors.controlHover),
			borderSize: 0,
			borderColor: "transparent",
		},
	};

	const axisLine = { show: true, color: scaleLineColor, size: 1 };
	const tickLine = { show: true, color: scaleLineColor, size: 1, length: 4 };
	const tickText = { show: true, color: textMuted, size: CHART_TEXT_SIZE, family, marginStart: 4, marginEnd: 4 };

	return {
		grid: {
			horizontal: { show: true, color: gridColor, size: 1, style: LineType.Dashed },
			vertical: { show: true, color: gridColor, size: 1, style: LineType.Dashed },
		},
		candle: {
			type: candleType,
			bar: {
				upColor: green,
				downColor: red,
				upBorderColor: green,
				downBorderColor: red,
				upWickColor: green,
				downWickColor: red,
			},
			area: {
				lineColor: textSecondary,
				lineSize: 2,
				smooth: true,
				backgroundColor: [
					{ offset: 0, color: colorToRgba(colors.textSecondary, 0.18) },
					{ offset: 1, color: colorToRgba(colors.textSecondary, 0.02) },
				],
			},
			priceMark: {
				show: true,
				high: { show: true, color: textMuted, textSize: CHART_TEXT_SIZE, textFamily: family },
				low: { show: true, color: textMuted, textSize: CHART_TEXT_SIZE, textFamily: family },
				last: {
					show: true,
					upColor: green,
					downColor: red,
					noChangeColor: textSecondary,
					line: { show: true, style: LineType.Dashed, size: 1, dashedValue: [4, 4] },
					text: {
						show: true,
						size: CHART_TEXT_SIZE,
						family,
						paddingLeft: 4,
						paddingRight: 4,
						paddingTop: 4,
						paddingBottom: 4,
						borderRadius: 4,
						color: textOnMarket,
					},
				},
			},
			tooltip: {
				showRule: TooltipShowRule.Always,
				showType: TooltipShowType.Standard,
				custom: (data: CandleTooltipCustomCallbackData) => {
					const { current } = data;
					const isUp = current.close >= current.open;
					const candleColor = isUp ? green : red;
					// Compact (mobile) legend drops the timestamp and Vol so it fits one line.
					// The crosshair x-axis label shows the time; the volume pane legend shows Vol.
					return [
						...(compact
							? []
							: [
									{
										title: { text: "", color: "transparent" },
										value: { text: formatTooltipTs(current.timestamp), color: textMuted },
									},
								]),
						{
							title: { text: "O ", color: textMuted },
							value: { text: formatPrice(current.open), color: candleColor },
						},
						{
							title: { text: "H ", color: textMuted },
							value: { text: formatPrice(current.high), color: candleColor },
						},
						{
							title: { text: "L ", color: textMuted },
							value: { text: formatPrice(current.low), color: candleColor },
						},
						{
							title: { text: "C ", color: textMuted },
							value: { text: formatPrice(current.close), color: candleColor },
						},
						...(compact
							? []
							: [
									{
										title: { text: "Vol ", color: textMuted },
										value: { text: formatVolume(current.volume ?? 0), color: textSecondary },
									},
								]),
					];
				},
				text: tooltipText,
			},
		},
		indicator: {
			ohlc: { upColor: green, downColor: red, noChangeColor: textSecondary },
			bars: [
				{
					upColor: colorToRgba(colors.green, 0.5),
					downColor: colorToRgba(colors.red, 0.5),
					noChangeColor: textSecondary,
				},
			],
			lines: [
				{ color: colorToHex(colors.accent), size: 1 },
				{ color: textSecondary, size: 1 },
				{ color: textMuted, size: 1 },
			],
			tooltip: {
				showRule: TooltipShowRule.Always,
				showType: TooltipShowType.Standard,
				text: tooltipText,
			},
		},
		xAxis: { show: true, axisLine, tickLine, tickText },
		yAxis: {
			show: true,
			position: YAxisPosition.Right,
			inside: options?.yAxisInside ?? false,
			axisLine: options?.yAxisInside ? { show: false } : axisLine,
			tickLine: options?.yAxisInside ? { show: false } : tickLine,
			tickText: options?.yAxisInside ? { ...tickText, marginStart: 2, marginEnd: 2 } : tickText,
		},
		separator: { color: scaleLineColor, size: 1 },
		crosshair: {
			show: true,
			horizontal: crosshairAxis,
			vertical: crosshairAxis,
		},
		overlay: {
			rect: { color: "transparent", borderColor: "transparent", borderSize: 0 },
			polygon: { color: "transparent", borderColor: "transparent", borderSize: 0 },
			text: { backgroundColor: "transparent", borderSize: 0, borderColor: "transparent" },
		},
	};
}
