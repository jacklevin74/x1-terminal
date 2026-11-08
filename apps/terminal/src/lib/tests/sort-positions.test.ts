import { describe, expect, it } from "vitest";
import type { Position } from "@/lib/hyperliquid";
import { sortPositions, type PositionSortKey } from "../positions/sort-positions";
const position = (coin: string, overrides: Partial<Position> = {}): Position => ({
 coin, szi: "1", positionValue: "10", entryPx: "10", unrealizedPnl: "0", returnOnEquity: "0", liquidationPx: null, marginUsed: "1", leverage: { type: "cross", value: 5 }, cumFunding: { allTime: "0", sinceOpen: "0", sinceChange: "0" }, ...overrides,
} as Position);
describe("position table sorting", () => {
 it.each([
  ["size", { szi: "-2" }, { szi: "10" }],
  ["value", { positionValue: "2" }, { positionValue: "10" }],
  ["entry", { entryPx: "2" }, { entryPx: "10" }],
  ["mark", { szi: "-2", positionValue: "4" }, { szi: "2", positionValue: "20" }],
  ["pnl", { unrealizedPnl: "-2" }, { unrealizedPnl: "10" }],
  ["roe", { returnOnEquity: "-0.2" }, { returnOnEquity: "0.1" }],
  ["liquidation", { liquidationPx: "2" }, { liquidationPx: "10" }],
  ["margin", { marginUsed: "2" }, { marginUsed: "10" }],
  ["funding", { cumFunding: { sinceOpen: "2" } }, { cumFunding: { sinceOpen: "-10" } }],
 ] as const)("sorts %s by the displayed numeric value in both directions", (key, low, high) => {
  const rows = [position("HIGH", high as Partial<Position>), position("LOW", low as Partial<Position>)];
  expect(sortPositions(rows, { key: key as PositionSortKey, descending: false }).map(p => p.coin)).toEqual(["LOW", "HIGH"]);
  expect(sortPositions(rows, { key: key as PositionSortKey, descending: true }).map(p => p.coin)).toEqual(["HIGH", "LOW"]);
  expect(rows[0].coin).toBe("HIGH");
 });
 it("sorts asset names naturally, including builder assets", () => {
  expect(sortPositions([position("xyz:ZEC"), position("BTC"), position("ETH")], { key: "market", descending: false }).map(p => p.coin)).toEqual(["BTC", "ETH", "xyz:ZEC"]);
 });
 it("keeps missing liquidation prices last in either direction", () => {
  const rows = [position("NA"), position("PRICE", { liquidationPx: "2" })];
  for (const descending of [false, true]) expect(sortPositions(rows, { key: "liquidation", descending }).map(p => p.coin)).toEqual(["PRICE", "NA"]);
 });
 it("preserves decimal precision and equal-row order", () => {
  const rows = [position("HIGH", { unrealizedPnl: "1.000000000000000002" }), position("LOW", { unrealizedPnl: "1.000000000000000001" }), position("TIE", { unrealizedPnl: "1.000000000000000001" })];
  expect(sortPositions(rows, { key: "pnl", descending: false }).map(p => p.coin)).toEqual(["LOW", "TIE", "HIGH"]);
 });
 it("sorts TP and SL numerically with unconfigured stops last", () => {
  const rows = [position("NA"), position("A"), position("B")];
  const stops = new Map([["A", { tpPrice: 10, slPrice: 2 }], ["B", { tpPrice: 2, slPrice: 10 }]]);
  expect(sortPositions(rows, { key: "tp", descending: false }, stops).map(p => p.coin)).toEqual(["B", "A", "NA"]);
  expect(sortPositions(rows, { key: "sl", descending: false }, stops).map(p => p.coin)).toEqual(["A", "B", "NA"]);
 });
});
