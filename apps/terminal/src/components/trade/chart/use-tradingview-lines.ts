import { useEffect, useMemo } from "react";
import { HL_ALL_DEXS } from "@/config/app";
import { useTradingAccount } from "@/hooks/use-trading-account";
import {
	LABEL_FONT,
	LABEL_HEIGHT,
	LEFT_INSET,
	labelWidth,
	leftOffsets,
	measureLabel,
	positionLineStyle,
} from "@/lib/chart/position-line-style";
import { colorToHex, getChartColors } from "@/lib/chart/theme-colors";
import { buildTradingLines, getTradingLineColor, type TradingLineTone } from "@/lib/chart/trading-lines";
import { useSubscription, useUserPositions } from "@/lib/hyperliquid";
import { getOrderLineLabel } from "@/lib/trade/open-orders";
import { useChartMarksStore } from "@/stores/use-chart-marks-store";
import type { IChartingLibraryWidget } from "@/types/charting_library";

const CLEAR = "rgba(0, 0, 0, 0)";

export interface LineTag {
	key: string;
	price: number;
	body: string;
	qty: string;
	tone: TradingLineTone;
	interactive: boolean;
}

export function useTradingViewLines(widget: IChartingLibraryWidget | null, symbol: string, dex?: string) {
	const hidden = useChartMarksStore((state) => state.hidden);
	const { address, isConnected } = useTradingAccount();
	const { getPosition } = useUserPositions();
	const position = isConnected ? (getPosition(symbol, dex) ?? getPosition(symbol.split(":").at(-1)!, dex)) : undefined;
	const { data } = useSubscription(
		"openOrders",
		{ user: address ?? "0x0", dex: HL_ALL_DEXS },
		{ enabled: isConnected && !!address },
	);
	const lines = useMemo(
		() =>
			!isConnected
				? []
				: buildTradingLines(
						symbol,
						position ?? undefined,
						(data && data.user?.toLowerCase() === address?.toLowerCase() ? data.orders : []).map((order) => ({
							...order,
							label: getOrderLineLabel(order),
						})),
					),
		[isConnected, address, symbol, position, data],
	);
	useEffect(() => {
		if (!widget || hidden) return;
		let active = true;
		const chart = widget.activeChart();
		const chartColors = getChartColors();
		const page = colorToHex(chartColors.page);
		const fg = colorToHex(chartColors.foreground);
		const removers: (() => void)[] = [];
		const draw = () => {
			if (!active) return;
			let minGap = 0;
			try {
				const pane = chart.getPanes()[0];
				const range = pane?.getMainSourcePriceScale()?.getVisiblePriceRange();
				const height = pane?.getHeight();
				if (range && height) minGap = (Math.abs(range.to - range.from) * LABEL_HEIGHT) / height;
			} catch {
				minGap = 0;
			}
			const styles = lines.map((line) => positionLineStyle(line, { color: getTradingLineColor(line.tone), page, fg }));
			const lefts = leftOffsets(
				lines.map((line) => line.price),
				styles.map((style) => labelWidth(style, measureLabel)),
				minGap,
			);
			for (const [index, line] of lines.entries()) {
				if (line.kind !== "order") continue;
				const style = styles[index];
				try {
					const adapter = chart
						.createPositionLine({ disableUndo: true })
						.setPrice(line.price)
						.setText(style.body)
						.setQuantity(style.qty)
						.setLineColor(style.color)
						.setLineStyle(2)
						.setLineWidth(1)
						.setLineLength(-lefts[index], "pixel")
						.setExtendLeft(lefts[index] === LEFT_INSET)
						.setBodyFont(LABEL_FONT)
						.setQuantityFont(LABEL_FONT)
						.setBodyBackgroundColor(CLEAR)
						.setBodyBorderColor(CLEAR)
						.setBodyTextColor(CLEAR)
						.setQuantityBackgroundColor(CLEAR)
						.setQuantityBorderColor(CLEAR)
						.setQuantityTextColor(CLEAR);
					removers.push(() => adapter.remove());
				} catch {
					/* Chart may not be ready for trading primitives. */
				}
			}
		};
		if (chart.dataReady()) draw();
		else chart.dataReady(draw);
		return () => {
			active = false;
			for (const remove of removers) {
				try {
					remove();
				} catch {
					/* Widget may already be disposed. */
				}
			}
		};
	}, [widget, lines, hidden]);
	const tags = useMemo<LineTag[]>(
		() =>
			lines.map((line) => {
				const { body, qty } = positionLineStyle(line, { color: "", page: "", fg: "" });
				return { key: line.id, price: line.price, body, qty, tone: line.tone, interactive: line.kind === "order" };
			}),
		[lines],
	);
	return widget && !hidden ? tags : [];
}
