import Big from "big.js";
import type { HistoricalOrdersResponse } from "@nktkas/hyperliquid";
export function orderHistoryDetails(entry: HistoricalOrdersResponse[number], spot: boolean) {
 const order = entry.order;
 const buy = order.side === "B";
 const market = /market/i.test(order.orderType);
 const original = Big(order.origSz);
 const remaining = Big(order.sz);
 const difference = original.minus(remaining);
 const filled = entry.status === "filled" ? original : difference.gt(0) ? difference : Big(0);
 const children = order.children.flatMap(child => {
  if (!child || typeof child !== "object") return [];
  const value = child as { orderType?: unknown; triggerPx?: unknown };
  if (typeof value.triggerPx !== "string" || !(Number(value.triggerPx) > 0)) return [];
  const label = typeof value.orderType === "string" && value.orderType.startsWith("Take Profit") ? "TP" : typeof value.orderType === "string" && value.orderType.startsWith("Stop") ? "SL" : null;
  return label ? [`${label} ${value.triggerPx}`] : [];
 });
 return {
  direction: spot ? buy ? "Buy" : "Sell" : order.reduceOnly ? buy ? "Close Short" : "Close Long" : buy ? "Long" : "Short",
  market,
  size: remaining.gt(0) ? remaining.toString() : null,
  filled: filled.gt(0) ? filled.toString() : null,
  value: !market && remaining.gt(0) ? remaining.times(order.limitPx).toString() : null,
  trigger: order.isTrigger ? order.triggerCondition || `Price ${order.triggerPx}` : "N/A",
  tpsl: children.length ? children.join(" / ") : order.isPositionTpsl ? `${order.orderType.startsWith("Take Profit") ? "TP" : "SL"} ${order.triggerPx}` : "--",
 };
}
