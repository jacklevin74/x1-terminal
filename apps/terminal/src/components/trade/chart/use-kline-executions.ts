import type { Chart } from "klinecharts";
import { type RefObject, useEffect, useRef } from "react";
import type { FillBucket } from "@/lib/chart/chart-lines";
import { buildExecutionMarkers, type ExecutionFill } from "@/lib/chart/execution-markers";
import { FILL_ENTER_MS, FILL_MARKERS_OVERLAY, registerFillMarkersOverlay } from "@/lib/chart/fill-markers-overlay";
import { animateProgress, createFreshFillTracker, easeOutCubic, observeFills } from "@/lib/chart/fresh-fills";
import { formatPrice, formatToken } from "@/lib/format";
import { useMarkets } from "@/lib/hyperliquid";
import { prefersReducedMotion } from "@/lib/ui/flash";
import { useExecutionFillsEvent } from "./use-execution-fills";

export function useKlineExecutions(
	chartRef: RefObject<Chart | null>,
	symbol: string,
	intervalMs: number,
	dataKey: string | null,
	onFreshFills?: (fills: ExecutionFill[]) => void,
) {
	const { fills, isSnapshot } = useExecutionFillsEvent();
	const markets = useMarkets();
	const szDecimals = markets.getMarket(symbol)?.szDecimals ?? 4;
	const tracker = useRef(createFreshFillTracker());
	const freshTids = useRef(new Set<number>());
	const onFreshRef = useRef(onFreshFills);
	onFreshRef.current = onFreshFills;

	useEffect(() => {
		const fresh = observeFills(tracker.current, fills, isSnapshot, Date.now()).filter((f) => f.coin === symbol);
		if (fresh.length === 0 || prefersReducedMotion()) return;
		for (const fill of fresh) freshTids.current.add(fill.tid);
		onFreshRef.current?.(fresh);
	}, [fills, isSnapshot, symbol]);

	useEffect(() => {
		const chart = chartRef.current;
		const freshNow = freshTids.current;
		freshTids.current = new Set();
		if (!chart || !dataKey) return;
		registerFillMarkersOverlay();
		chart.removeOverlay({ name: FILL_MARKERS_OVERLAY });
		const candles = new Map(chart.getDataList().map((c) => [c.timestamp, c]));
		const buckets = new Map<
			string,
			{ time: number; side: "B" | "S"; count: number; size: number; notional: number; enterFrom: number | null }
		>();
		for (const marker of buildExecutionMarkers(fills, symbol, intervalMs)) {
			if (!candles.has(marker.time)) continue;
			const key = `${marker.time}:${marker.label}`;
			const b = buckets.get(key) ?? {
				time: marker.time,
				side: marker.label,
				count: 0,
				size: 0,
				notional: 0,
				enterFrom: null,
			};
			const tid = Number(marker.id.slice(marker.id.lastIndexOf(":") + 1));
			if (freshNow.has(tid) && b.enterFrom == null) b.enterFrom = b.count;
			b.count += 1;
			b.size += Number(marker.size);
			b.notional += Number(marker.size) * marker.price;
			buckets.set(key, b);
		}
		const entering: { id: string; bucket: FillBucket }[] = [];
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
			if (b.enterFrom != null) {
				bucket.enterFrom = b.enterFrom;
				bucket.enter = 0;
				entering.push({ id: `fill:${id}`, bucket });
			}
			chart.createOverlay({
				name: FILL_MARKERS_OVERLAY,
				id: `fill:${id}`,
				points: [{ timestamp: b.time, value: bucket.anchor }],
				extendData: bucket,
				lock: true,
			});
		}
		const stop =
			entering.length > 0
				? animateProgress(FILL_ENTER_MS, (t) => {
						for (const { id, bucket } of entering) {
							chart.overrideOverlay({ id, extendData: { ...bucket, enter: easeOutCubic(t) } });
						}
					})
				: null;
		return () => {
			stop?.();
			chart.removeOverlay({ name: FILL_MARKERS_OVERLAY });
		};
	}, [chartRef, fills, symbol, intervalMs, dataKey, szDecimals]);
}
