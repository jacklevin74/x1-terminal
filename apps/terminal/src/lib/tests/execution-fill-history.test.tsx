// @vitest-environment jsdom
import { act, createElement } from "react";
import { createRoot } from "react-dom/client";
import { expect, it, vi } from "vitest";
import { useExecutionFills } from "@/components/trade/chart/use-execution-fills";
import { buildExecutionMarkers } from "../chart/execution-markers";
const state = vi.hoisted(() => ({ fills: Array.from({ length: 350 }, (_, tid) => ({ coin: "BTC", side: tid % 2 ? "A" : "B", time: 1_800_000_000_000 + tid * 60_000, px: "100", sz: "1", tid })) }));
vi.mock("@/hooks/use-trade-history", () => ({ useTradeHistory: () => state }));
it("builds B/S chart marks from the entire cached history beyond 200 fills", async () => {
 let markers: ReturnType<typeof buildExecutionMarkers> = [];
 function Probe() { markers = buildExecutionMarkers(useExecutionFills(), "BTC", 60_000); return null; }
 const root = createRoot(document.createElement("div"));
 await act(async () => root.render(createElement(Probe)));
 expect(markers).toHaveLength(350);
 expect(markers[0].label).toBe("B"); expect(markers[1].label).toBe("S");
 await act(async () => root.unmount());
});
