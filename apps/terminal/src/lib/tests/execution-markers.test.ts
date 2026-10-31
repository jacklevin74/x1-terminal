import { expect, it } from "vitest";
import { buildExecutionMarkers, type ExecutionFill } from "../chart/execution-markers";
const base: ExecutionFill = { coin: "BTC", side: "B", time: 1_800_000_030_000, px: "100", sz: "2", tid: 1 };
it("uses buy/sell execution sides and keeps markets and builder namespaces separate", () => {
 const markers = buildExecutionMarkers([base, { ...base, side: "A", tid: 2 }, { ...base, coin: "xyz:BTC", tid: 3 }], "BTC", 60_000);
 expect(markers.map(m => m.label)).toEqual(["B", "S"]);
 expect(markers[0].color).toBe("#26a69a"); expect(markers[1].color).toBe("#ef5350");
 expect(markers[0].price).toBe(100); expect(markers[0].time % 60_000).toBe(0);
});
it("deduplicates fills and stacks same-side executions in a candle", () => {
 const markers = buildExecutionMarkers([base, base, { ...base, tid: 2 }, { ...base, side: "A", tid: 3 }], "BTC", 60_000);
 expect(markers.map(m => m.stack)).toEqual([0, 1, 0]);
 expect(buildExecutionMarkers([{ ...base, px: "NaN" }, { ...base, side: "unknown" }], "BTC", 60_000)).toEqual([]);
 expect(buildExecutionMarkers([base], "BTC", 0)).toEqual([]);
});
it("aligns calendar month and week marks to their candle start", () => {
 const fill = { ...base, time: Date.UTC(2026, 9, 29, 12) };
 expect(buildExecutionMarkers([fill], "BTC", 30 * 86_400_000)[0].time).toBe(Date.UTC(2026, 9, 1));
 expect(buildExecutionMarkers([fill], "BTC", 7 * 86_400_000)[0].time).toBe(Date.UTC(2026, 9, 26));
});
