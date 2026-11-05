import { t } from "@lingui/core/macro";
import { type Chart, DomPosition } from "klinecharts";
import { type RefObject, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { formatPriceForOrder } from "@/domain/trade/orders";
import type { ChartLine } from "@/lib/chart/chart-lines";
import type { ExecutionFill } from "@/lib/chart/execution-markers";
import { animateProgress } from "@/lib/chart/fresh-fills";
import {
	axisTagWidth,
	CANCEL_KEY,
	DRAG_KEY,
	getOrderLineHitBoxes,
	LINE_PULSE_MS,
	ORDER_LINES_OVERLAY,
	type OrderLinesData,
	registerOrderLinesOverlay,
} from "@/lib/chart/order-lines-overlay";
import { useExchange, useMarkets } from "@/lib/hyperliquid";
import { useChartLinesInput } from "./use-chart-lines-input";

interface Params {
	chartRef: RefObject<Chart | null>;
	symbol: string;
	dex?: string;
	dataKey: string | null;
}

interface Pending {
	oid: number;
	price: number;
	priceText: string;
}

const CURSOR_CLASS = { pointer: "chart-cursor-pointer", drag: "chart-cursor-row-resize" } as const;

function keyOid(key: string | undefined, prefix: string): number | null {
	if (!key?.startsWith(prefix)) return null;
	const oid = Number(key.slice(prefix.length));
	return Number.isFinite(oid) ? oid : null;
}

function buildModifyOrder(line: ChartLine, assetId: number, price: number) {
	const order = line.order;
	if (!order) return null;
	const px = formatPriceForOrder(price);
	if (!order.trigger) {
		return { a: assetId, b: order.isBuy, p: px, s: order.size, r: order.reduceOnly, t: { limit: { tif: order.tif } } };
	}
	const limitPx = order.trigger.isMarket ? px : formatPriceForOrder(order.trigger.limitPx + (price - line.price));
	return {
		a: assetId,
		b: order.isBuy,
		p: limitPx,
		s: order.size,
		r: order.reduceOnly,
		t: { trigger: { isMarket: order.trigger.isMarket, triggerPx: px, tpsl: order.trigger.tpsl } },
	};
}

export function useKlineTradingLines({ chartRef, symbol, dex, dataKey }: Params) {
	const input = useChartLinesInput(symbol, dex);
	const markets = useMarkets();
	const { mutate: cancelOrders } = useExchange("cancel");
	const { mutate: modifyOrder } = useExchange("modify");
	const cancelling = useRef(new Set<number>());
	const [pending, setPending] = useState<Pending | null>(null);

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

	function handleMove(oid: number, price: number) {
		const assetId = markets.getAssetId(symbol);
		const line = input.lines.find((l) => l.oid === oid);
		if (typeof assetId !== "number" || !line) return;
		const order = buildModifyOrder(line, assetId, price);
		if (!order) return;
		const priceText = formatPriceForOrder(price);
		if (Number(priceText) === line.price) return;
		setPending({ oid, price: Number(priceText), priceText });
		modifyOrder(
			{ oid, order },
			{
				onError: (error) => {
					setPending(null);
					toast.error(error.message || t`Failed to move order`);
				},
			},
		);
	}

	const actions = useRef({ cancel: handleCancel, move: handleMove });
	actions.current = { cancel: handleCancel, move: handleMove };

	const pendingLine = pending ? input.lines.find((l) => l.oid === pending.oid) : null;
	const pendingSettled = pending != null && (!pendingLine || Math.abs(pendingLine.price - pending.price) < 1e-12);
	useEffect(() => {
		if (pendingSettled) setPending(null);
	}, [pendingSettled]);

	const stateRef = useRef({ input, pending });
	stateRef.current = { input, pending };
	const overlayRef = useRef<{
		update: (next: Partial<OrderLinesData>) => void;
		dragging: () => boolean;
		pulse: (ids: string[]) => void;
	} | null>(null);
	const hasLines = input.lines.length > 0 || input.markPx != null;

	useEffect(() => {
		const chart = chartRef.current;
		if (!chart || !symbol || !dataKey || !hasLines) return;
		registerOrderLinesOverlay();
		chart.removeOverlay({ name: ORDER_LINES_OVERLAY });
		const initial = stateRef.current;
		const anchor = initial.input.lines[0]?.price ?? initial.input.markPx ?? 0;
		const data: OrderLinesData = { ...initial.input, drag: initial.pending, hover: null, pulse: null };
		let dragging: { oid: number } | null = null;
		let id: string | null = null;
		let stopPulse: (() => void) | null = null;

		function pulse(ids: string[]) {
			stopPulse?.();
			stopPulse = animateProgress(LINE_PULSE_MS, (t) => {
				update({ pulse: t < 1 ? Object.fromEntries(ids.map((key) => [key, t])) : null });
			});
		}

		function update(next: Partial<OrderLinesData>) {
			Object.assign(data, next);
			if (id) chart?.overrideOverlay({ id, extendData: { ...data } });
		}

		function priceAt(y: number): number | null {
			const point = chart?.convertFromPixel([{ y }], { paneId: "candle_pane" });
			const value = Array.isArray(point) ? point[0]?.value : undefined;
			return typeof value === "number" && Number.isFinite(value) && value > 0 ? value : null;
		}

		id = chart.createOverlay({
			name: ORDER_LINES_OVERLAY,
			points: [{ value: anchor }],
			extendData: { ...data },
			lock: false,
			onClick: (event) => {
				const oid = keyOid(event.figureKey, CANCEL_KEY);
				if (oid == null) return false;
				actions.current.cancel(oid);
				return true;
			},
			onPressedMoveStart: (event) => {
				const oid = keyOid(event.figureKey, DRAG_KEY);
				dragging = oid == null ? null : { oid };
				return true;
			},
			onPressedMoving: (event) => {
				if (!dragging || event.y == null) return true;
				const price = priceAt(event.y);
				if (price != null) update({ drag: { oid: dragging.oid, price, priceText: formatPriceForOrder(price) } });
				return true;
			},
			onPressedMoveEnd: () => {
				const drag = data.drag;
				const wasDragging = dragging;
				dragging = null;
				if (!wasDragging || !drag || drag.oid !== wasDragging.oid) return true;
				update({ drag: stateRef.current.pending });
				actions.current.move(drag.oid, drag.price);
				return true;
			},
		}) as string | null;
		overlayRef.current = { update, dragging: () => dragging != null, pulse };

		const dom = chart.getDom();
		function hitAt(event: MouseEvent): string | null {
			if (!dom) return null;
			const rect = dom.getBoundingClientRect();
			const x = event.clientX - rect.left;
			const y = event.clientY - rect.top;
			const box = getOrderLineHitBoxes().find((b) => x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h);
			return box?.key ?? null;
		}
		function onMove(event: MouseEvent) {
			if (!dom) return;
			const key = dragging ? `${DRAG_KEY}${dragging.oid}` : hitAt(event);
			dom.classList.toggle(CURSOR_CLASS.pointer, !!key?.startsWith(CANCEL_KEY));
			dom.classList.toggle(CURSOR_CLASS.drag, !!key?.startsWith(DRAG_KEY));
			const hover = key?.startsWith(CANCEL_KEY) ? key : null;
			if (hover !== data.hover) update({ hover });
		}
		function onLeave() {
			if (!dom) return;
			dom.classList.remove(CURSOR_CLASS.pointer, CURSOR_CLASS.drag);
			if (data.hover) update({ hover: null });
		}
		dom?.addEventListener("mousemove", onMove);
		dom?.addEventListener("mouseleave", onLeave);

		return () => {
			stopPulse?.();
			overlayRef.current = null;
			dom?.removeEventListener("mousemove", onMove);
			dom?.removeEventListener("mouseleave", onLeave);
			dom?.classList.remove(CURSOR_CLASS.pointer, CURSOR_CLASS.drag);
			chart.removeOverlay({ name: ORDER_LINES_OVERLAY });
		};
	}, [chartRef, symbol, dataKey, hasLines]);

	useEffect(() => {
		const overlay = overlayRef.current;
		if (!overlay) return;
		if (overlay.dragging()) overlay.update({ ...input });
		else overlay.update({ ...input, drag: pending });
	}, [input, pending]);

	const fixedAxisSize = useRef<number | null>(null);
	useEffect(() => {
		const chart = chartRef.current;
		if (!chart) return;
		const texts = input.lines.map((line) => line.priceText);
		if (pending) texts.push(pending.priceText);
		const needed = texts.length ? Math.max(...texts.map(axisTagWidth)) : 0;
		const current = chart.getSize("candle_pane", DomPosition.YAxis)?.width ?? 0;
		const autoWidth = fixedAxisSize.current == null ? current : 0;
		if (needed > current || (fixedAxisSize.current != null && needed !== fixedAxisSize.current)) {
			if (needed > autoWidth && needed > 0) {
				fixedAxisSize.current = needed;
				chart.setStyles({ yAxis: { size: needed } });
			} else if (fixedAxisSize.current != null) {
				fixedAxisSize.current = null;
				chart.setStyles({ yAxis: { size: "auto" } });
			}
		}
	}, [chartRef, input, pending]);

	function pulseFills(fills: ExecutionFill[]) {
		const ids = new Set(["position"]);
		for (const fill of fills) if (fill.oid != null) ids.add(`order:${fill.oid}`);
		overlayRef.current?.pulse([...ids]);
	}

	return { pulseFills };
}
