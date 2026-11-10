import Big from "big.js";
import type { ExchangeParams } from "@/lib/hyperliquid";
import type { OpenOrder } from "./open-orders";
import { getReducibleSize } from "@/domain/trade/order/size";

export function canAmendRestingOrder(order: OpenOrder): boolean {
 return order.orderType === "Limit" && !order.isTrigger && !order.isPositionTpsl && !order.children.length && (order.tif === "Gtc" || order.tif === "Alo") && Number(order.sz) > 0;
}
export function buildOrderAmendment(order: OpenOrder, options: {
 assetId: number; szDecimals: number; input: string; mode: "amount" | "value"; positionSize?: string | null;
}): { params: NonNullable<ExchangeParams<"modify">>; amount: string; value: string } {
 if (!canAmendRestingOrder(order)) throw new Error("Only resting limit orders without attached TP/SL can be edited here.");
 if (!Number.isInteger(options.assetId) || options.assetId < 0) throw new Error("Market metadata is unavailable.");
 const price = new Big(order.limitPx);
 let amount: Big;
 try { amount = options.mode === "value" ? new Big(options.input).div(price) : new Big(options.input); }
 catch { throw new Error("Enter a valid amount or value."); }
 amount = new Big(amount.toFixed(options.szDecimals, Big.roundDown));
 if (amount.lte(0)) throw new Error("Amount must be at least one size increment.");
 const value = amount.times(price);
 if (value.lt(10)) throw new Error("Minimum order value is 10 quote tokens.");
 if (order.reduceOnly && amount.gt(getReducibleSize(options.positionSize, order.side === "B" ? "buy" : "sell", options.szDecimals))) throw new Error("Amount exceeds the position available to reduce.");
 return { amount: amount.toString(), value: value.toString(), params: {
  oid: order.oid,
  order: { a: options.assetId, b: order.side === "B", p: order.limitPx, s: amount.toString(), r: order.reduceOnly,
   t: { limit: { tif: order.tif as "Gtc" | "Alo" } }, ...(order.cloid ? { c: order.cloid } : {}),
  },
 } };
}
export function assertAmendmentAccepted(response: unknown): void {
 const result = response as { status?: string; response?: string | { data?: { statuses?: unknown[] } } };
 if (result?.status !== "ok") throw new Error(typeof result?.response === "string" ? result.response : "Hyperliquid did not confirm the modification.");
 if (typeof result.response === "object") for (const status of result.response.data?.statuses ?? []) {
  if (status && typeof status === "object" && "error" in status) throw new Error(String(status.error));
 }
}
