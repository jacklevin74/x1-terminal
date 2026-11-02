import type { Chart } from "klinecharts";
import { type RefObject, useEffect } from "react";
import { buildExecutionMarkers } from "@/lib/chart/execution-markers";
import { EXECUTION_OVERLAY, registerExecutionOverlay } from "@/lib/chart/execution-overlay";
import { colorToHex, getChartColors } from "@/lib/chart/theme-colors";
import { useExecutionFills } from "./use-execution-fills";
export function useKlineExecutions(chartRef: RefObject<Chart | null>, symbol: string, intervalMs: number) {
	const fills = useExecutionFills();
	useEffect(() => {
		const chart = chartRef.current;
		if (!chart) return;
		registerExecutionOverlay();
		chart.removeOverlay({ name: EXECUTION_OVERLAY });
		const colors = getChartColors();
		const buyColor = colorToHex(colors.green);
		const sellColor = colorToHex(colors.red);
		for (const marker of buildExecutionMarkers(fills, symbol, intervalMs)) {
			const color = marker.label === "B" ? buyColor : sellColor;
			chart.createOverlay({
				name: EXECUTION_OVERLAY,
				id: `execution:${marker.id}`,
				points: [{ timestamp: marker.time, value: marker.price }],
				extendData: { ...marker, color },
			});
		}
		return () => {
			chart.removeOverlay({ name: EXECUTION_OVERLAY });
		};
	}, [chartRef, fills, symbol, intervalMs]);
}
