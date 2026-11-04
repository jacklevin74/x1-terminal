import type { Chart } from "klinecharts";
import { type RefObject, useEffect } from "react";
import type { FillBucket } from "@/lib/chart/chart-lines";
import { buildExecutionMarkers } from "@/lib/chart/execution-markers";
import { FILL_MARKERS_OVERLAY, registerFillMarkersOverlay } from "@/lib/chart/fill-markers-overlay";
import { formatPrice, formatToken } from "@/lib/format";
import { useMarkets } from "@/lib/hyperliquid";
import { useExecutionFills } from "./use-execution-fills";

export function useKlineExecutions(
	chartRef: RefObject<Chart | null>,
	symbol: string,
	intervalMs: number,
	dataKey: string | null,
) {
	const fills = useExecutionFills();
	const markets = useMarkets();
	const szDecimals = markets.getMarket(symbol)?.szDecimals ?? 4;

	useEffect(() => {
		const chart = chartRef.current;
		if (!chart || !dataKey) return;
		registerFillMarkersOverlay();
		chart.removeOverlay({ name: FILL_MARKERS_OVERLAY });
		const candles = new Map(chart.getDataList().map((c) => [c.timestamp, c]));
		const buckets = new Map<string, { time: number; side: "B" | "S"; count: number; size: number; notional: number }>();
		for (const marker of buildExecutionMarkers(fills, symbol, intervalMs)) {
			if (!candles.has(marker.time)) continue;
			const key = `${marker.time}:${marker.label}`;
			const b = buckets.get(key) ?? { time: marker.time, side: marker.label, count: 0, size: 0, notional: 0 };
			b.count += 1;
			b.size += Number(marker.size);
			b.notional += Number(marker.size) * marker.price;
			buckets.set(key, b);
		}
		for (const [id, b] of buckets) {
			const candle = candles.get(b.time);
			if (!candle) continue;
			const bucket: FillBucket = {
				id,
				time: b.time,
				side: b.side,
				count: b.count,
				sizeText: formatToken(b.size, { decimals: szDecimals, minimumFractionDigits: 0 }),
				avgPxText: formatPrice(b.notional / b.size, { szDecimals, style: "decimal", compact: false }),
				anchor: b.side === "B" ? candle.low : candle.high,
			};
			chart.createOverlay({
				name: FILL_MARKERS_OVERLAY,
				id: `fill:${id}`,
				points: [{ timestamp: b.time, value: bucket.anchor }],
				extendData: bucket,
				lock: true,
			});
		}
		return () => {
			chart.removeOverlay({ name: FILL_MARKERS_OVERLAY });
		};
	}, [chartRef, fills, symbol, intervalMs, dataKey, szDecimals]);
}
