// @vitest-environment jsdom
import { act, createElement } from "react";
import { createRoot } from "react-dom/client";
import { expect, it, vi } from "vitest";
import { useTradingViewLines } from "@/components/trade/chart/use-tradingview-lines";
import type { IChartingLibraryWidget } from "@/types/charting_library";

const state = vi.hoisted(() => ({
	connected: true,
	position: { szi: "1", entryPx: "100", liquidationPx: "80", unrealizedPnl: "5" },
	orders: [
		{
			oid: 1,
			coin: "BTC",
			side: "A",
			isTrigger: true,
			triggerPx: "90",
			limitPx: "90",
			sz: "1",
			orderType: "Stop Market",
			reduceOnly: true,
			isPositionTpsl: true,
			triggerCondition: "Price below 90",
		},
	],
}));
vi.mock("@/hooks/use-trading-account", () => ({
	useTradingAccount: () => ({ address: `0x${"ab".repeat(20)}`, isConnected: state.connected }),
}));
vi.mock("@/lib/hyperliquid", () => ({
	useUserPositions: () => ({ getPosition: () => state.position }),
	useSubscription: () => ({ data: { user: `0x${"ab".repeat(20)}`, orders: state.orders } }),
}));

function fakeChart() {
	const removed = vi.fn();
	const texts: string[] = [];
	const createPositionLine = vi.fn(() => {
		const adapter: Record<string, unknown> = {};
		const chain = new Proxy(adapter, {
			get: (_target, key) => {
				if (key === "remove") return removed;
				return (value: unknown) => {
					if (key === "setText") texts.push(String(value));
					return chain;
				};
			},
		});
		return chain;
	});
	const chart = { dataReady: () => true, createPositionLine, removeEntity: vi.fn(), createShape: vi.fn() };
	return { chart, removed, texts, widget: { activeChart: () => chart } as unknown as IChartingLibraryWidget };
}

it("draws only orders as chart lines and keeps position and liquidation as overlay tags", async () => {
	const { chart, removed, widget } = fakeChart();
	let tags: ReturnType<typeof useTradingViewLines> = [];
	function Harness() {
		tags = useTradingViewLines(widget, "BTC");
		return null;
	}
	const root = createRoot(document.createElement("div"));
	await act(async () => root.render(createElement(Harness)));
	expect(chart.createPositionLine).toHaveBeenCalledTimes(1);
	expect(tags.map((tag) => [tag.body, tag.interactive])).toEqual([
		["PNL $5.00", false],
		["Liq. 80", false],
		[expect.any(String), true],
	]);
	state.connected = false;
	await act(async () => root.render(createElement(Harness)));
	expect(removed).toHaveBeenCalledTimes(1);
	expect(chart.removeEntity).not.toHaveBeenCalled();
	await act(async () => root.unmount());
	state.connected = true;
});

it("hides all trading lines and restores them", async () => {
	const { useChartMarksStore } = await import("@/stores/use-chart-marks-store");
	useChartMarksStore.setState({ hidden: false });
	const { chart, removed, widget } = fakeChart();
	function Harness() {
		useTradingViewLines(widget, "BTC");
		return null;
	}
	const root = createRoot(document.createElement("div"));
	await act(async () => root.render(createElement(Harness)));
	expect(chart.createPositionLine).toHaveBeenCalledTimes(1);
	await act(async () => useChartMarksStore.setState({ hidden: true }));
	expect(removed).toHaveBeenCalledTimes(1);
	await act(async () => useChartMarksStore.setState({ hidden: false }));
	expect(chart.createPositionLine).toHaveBeenCalledTimes(2);
	await act(async () => root.unmount());
});
