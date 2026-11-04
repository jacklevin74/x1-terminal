import { t } from "@lingui/core/macro";
import type { Chart } from "klinecharts";
import { type RefObject, useEffect, useRef } from "react";
import { toast } from "sonner";
import { CANCEL_KEY, ORDER_LINES_OVERLAY, registerOrderLinesOverlay } from "@/lib/chart/order-lines-overlay";
import { useExchange, useMarkets } from "@/lib/hyperliquid";
import { useChartLinesInput } from "./use-chart-lines-input";

interface Params {
	chartRef: RefObject<Chart | null>;
	symbol: string;
	dex?: string;
	dataKey: string | null;
}

export function useKlineTradingLines({ chartRef, symbol, dex, dataKey }: Params) {
	const input = useChartLinesInput(symbol, dex);
	const markets = useMarkets();
	const { mutate: cancelOrders } = useExchange("cancel");
	const cancelling = useRef(new Set<number>());

	function handleCancel(oid: number) {
		const assetId = markets.getAssetId(symbol);
		if (typeof assetId !== "number" || cancelling.current.has(oid)) return;
		cancelling.current.add(oid);
		cancelOrders(
			{ cancels: [{ a: assetId, o: oid }] },
			{
				onError: (error) => toast.error(error.message || t`Failed to cancel order`),
				onSettled: () => cancelling.current.delete(oid),
			},
		);
	}

	const cancelRef = useRef(handleCancel);
	cancelRef.current = handleCancel;

	useEffect(() => {
		const chart = chartRef.current;
		if (!chart || !symbol || !dataKey) return;
		registerOrderLinesOverlay();
		chart.removeOverlay({ name: ORDER_LINES_OVERLAY });
		const anchor = input.lines[0]?.price ?? input.markPx;
		if (anchor == null) return;
		chart.createOverlay({
			name: ORDER_LINES_OVERLAY,
			points: [{ value: anchor }],
			extendData: input,
			lock: true,
			onClick: (event) => {
				const key = event.figureKey;
				if (!key?.startsWith(CANCEL_KEY)) return false;
				const oid = Number(key.slice(CANCEL_KEY.length));
				if (Number.isFinite(oid)) cancelRef.current(oid);
				return true;
			},
		});
		return () => {
			chart.removeOverlay({ name: ORDER_LINES_OVERLAY });
		};
	}, [chartRef, symbol, dataKey, input]);
}
