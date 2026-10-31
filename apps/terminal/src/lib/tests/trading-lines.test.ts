import { expect, it } from "vitest";
import { buildTradingLines } from "../chart/trading-lines";
const position = { szi: "2", entryPx: "100", liquidationPx: "75", unrealizedPnl: "12.34" };
const order = { oid: 1, coin: "BTC", side: "B" as const, isTrigger: false, triggerPx: "0", limitPx: "90", sz: "1", label: "Limit Buy" };
it("includes entry, liquidation, limits and TP/SL trigger prices", () => {
 const lines = buildTradingLines("BTC", position, [order, { ...order, oid: 2, isTrigger: true, triggerPx: "120", label: "TP" }, { ...order, oid: 3, isTrigger: true, triggerPx: "80", label: "SL" }]);
 expect(lines.map(l => l.price)).toEqual([100, 75, 90, 120, 80]);
 expect(lines[0].label).toContain("Long · 2 · PNL 12.34");
 expect(lines[1].label).toBe("Liquidation");
});
it("omits missing liquidation prices, flat positions, invalid prices and other markets", () => {
 expect(buildTradingLines("BTC", { ...position, liquidationPx: null }, [])).toHaveLength(1);
 expect(buildTradingLines("BTC", { ...position, szi: "0" }, [{ ...order, coin: "xyz:BTC" }, { ...order, limitPx: "NaN" }])).toEqual([]);
 expect(buildTradingLines("BTC", { ...position, szi: "-2" }, [])[0].label).toContain("Short");
});
