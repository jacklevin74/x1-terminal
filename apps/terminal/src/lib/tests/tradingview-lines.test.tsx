// @vitest-environment jsdom
import { act, createElement } from "react";
import { createRoot } from "react-dom/client";
import { expect, it, vi } from "vitest";
import type { IChartingLibraryWidget } from "@/types/charting_library";
import { useTradingViewLines } from "@/components/trade/chart/use-tradingview-lines";
const state = vi.hoisted(() => ({ connected: true, position: { szi: "1", entryPx: "100", liquidationPx: "80" }, orders: [] }));
vi.mock("wagmi", () => ({ useConnection: () => ({ address: `0x${"ab".repeat(20)}`, isConnected: state.connected }) }));
vi.mock("@/lib/hyperliquid", () => ({ useUserPositions: () => ({ getPosition: () => state.position }), useSubscription: () => ({ data: { user: `0x${"ab".repeat(20)}`, orders: state.orders } }) }));
it("draws locked price lines and removes only its own drawings on disconnect", async () => {
 const chart = { dataReady: () => true, createShape: vi.fn((_point: unknown, _options: unknown) => `shape-${Math.random()}`), removeEntity: vi.fn() };
 const widget = { activeChart: () => chart } as unknown as IChartingLibraryWidget;
 function Harness() { useTradingViewLines(widget, "BTC"); return null; }
 const node = document.createElement("div"); const root = createRoot(node);
 await act(async () => root.render(createElement(Harness)));
 expect(chart.createShape).toHaveBeenCalledTimes(2);
 expect(chart.createShape.mock.calls[0][1]).toMatchObject({ shape: "horizontal_line", lock: true, disableSave: true });
 state.connected = false;
 await act(async () => root.render(createElement(Harness)));
 expect(chart.removeEntity).toHaveBeenCalledTimes(2);
 expect(chart.createShape).toHaveBeenCalledTimes(2);
 await act(async () => root.unmount()); state.connected = true;
});
