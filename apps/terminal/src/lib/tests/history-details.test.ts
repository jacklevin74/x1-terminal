import { expect, it } from "vitest";
import { orderHistoryDetails } from "../trade/order-history";
import { historyCsv } from "../trade/history-csv";
import { getAccumulateConfig } from "@hypeterminal/hl-react/registries/subscription";
const entry: Parameters<typeof orderHistoryDetails>[0] = { status: "open", statusTimestamp: 1, order: { coin: "BTC", side: "A", limitPx: "100", sz: "2", oid: 1, timestamp: 1, origSz: "3", triggerCondition: "", isTrigger: false, triggerPx: "0", children: [], isPositionTpsl: false, reduceOnly: true, orderType: "Limit", tif: "Gtc", cloid: null } };
it("calculates remaining, filled and limit order value, and close directions", () => {
 expect(orderHistoryDetails(entry, false)).toMatchObject({ size: "2", filled: "1", value: "200", direction: "Close Long", trigger: "N/A", tpsl: "--" });
 expect(orderHistoryDetails({ ...entry, status: "filled", order: { ...entry.order, sz: "0" } }, false)).toMatchObject({ size: null, filled: "3", value: null });
 expect(orderHistoryDetails(entry, true).direction).toBe("Sell");
 expect(orderHistoryDetails({ ...entry, order: { ...entry.order, side: "B", orderType: "Market" } }, false)).toMatchObject({ direction: "Close Short", market: true, value: null });
});
it("includes actual trigger and TP/SL details without inventing child orders", () => {
 expect(orderHistoryDetails({ ...entry, order: { ...entry.order, isTrigger: true, triggerPx: "80", triggerCondition: "Price below 80", isPositionTpsl: true, orderType: "Stop Market" } }, false)).toMatchObject({ trigger: "Price below 80", tpsl: "SL 80" });
});
it("keeps multiple status events for one order and deduplicates the same event", () => {
 const config = getAccumulateConfig("userHistoricalOrders")!;
 const first = config.buffer.getKey(entry);
 expect(config.buffer.getKey({ ...entry, status: "filled" })).not.toBe(first);
 expect(config.buffer.getKey({ ...entry, statusTimestamp: 2 })).not.toBe(first);
 expect(config.buffer.getKey({ ...entry })).toBe(first);
});
it("exports quoted CSV with exact values and protects spreadsheet formulas", () => {
 expect(historyCsv([["Market", "Payment"], ["BTC", "-0.0001"], ['=HYPERLINK("x")', "1"]])).toBe('"Market","Payment"\r\n"BTC","-0.0001"\r\n"\'=HYPERLINK(""x"")","1"');
});
