import Big from "big.js";
import type { ExchangeParams } from "@/lib/hyperliquid";
import type { OpenOrder } from "./open-orders";
import { getReducibleSize } from "@/domain/trade/order/size";

export function canAmendRestingOrder(order: OpenOrder): boolean {
 return order.orderType === "Limit" && !order.isTrigger && !order.isPositionTpsl && !order.children.length && (order.tif === "Gtc" || order.tif === "Alo") && Number(order.sz) > 0;
}
export type OrderEditField = "amount" | "value" | "price";
export function canAmendOrderPrice(order: OpenOrder): boolean {
 return canAmendRestingOrder(order) || (order.isTrigger && !order.isPositionTpsl && !order.children.length && (order.orderType === "Stop Limit" || order.orderType === "Take Profit Limit") && Number(order.sz)>0 && Number(order.triggerPx)>0);
}
function amendmentPrice(input:string,szDecimals:number,isSpot:boolean):Big {
 let price:Big;
 try {price=new Big(input);} catch {throw new Error("Enter a valid limit price.");}
 if(price.lte(0))throw new Error("Limit price must be above zero.");
 const decimals=Math.max(0,price.c.length-1-price.e),maxDecimals=Math.max(0,(isSpot?8:6)-szDecimals);
 if(decimals>maxDecimals || (decimals>0&&price.c.length>5))throw new Error(`Invalid price increment: use at most ${maxDecimals} decimal places and 5 significant figures; whole-number prices are allowed.`);
 return price;
}
export function buildOrderAmendment(order: OpenOrder, options: {
 assetId: number; szDecimals: number; input: string; mode: OrderEditField; isSpot?: boolean; positionSize?: string | null;
}): { params: NonNullable<ExchangeParams<"modify">>; amount: string; value: string; price: string } {
 if (!(options.mode === "price" ? canAmendOrderPrice(order) : canAmendRestingOrder(order))) throw new Error("This order type cannot be edited in the selected mode.");
 if (!Number.isInteger(options.assetId) || options.assetId < 0) throw new Error("Market metadata is unavailable.");
 const price = options.mode === "price" ? amendmentPrice(options.input,options.szDecimals,!!options.isSpot) : new Big(order.limitPx);
 let amount: Big;
 try { amount = options.mode === "price" ? new Big(order.sz) : options.mode === "value" ? new Big(options.input).div(price) : new Big(options.input); }
 catch { throw new Error("Enter a valid amount or value."); }
 amount = new Big(amount.toFixed(options.szDecimals, Big.roundDown));
 if (amount.lte(0)) throw new Error("Amount must be at least one size increment.");
 const value = amount.times(price);
 if (value.lt(10)) throw new Error("Minimum order value is 10 quote tokens.");
 if (order.reduceOnly && amount.gt(getReducibleSize(options.positionSize, order.side === "B" ? "buy" : "sell", options.szDecimals))) throw new Error("Amount exceeds the position available to reduce.");
 return { amount: amount.toString(), value: value.toString(), price: price.toFixed(), params: {
  oid: order.oid,
  order: { a: options.assetId, b: order.side === "B", p: price.toFixed(), s: amount.toString(), r: order.reduceOnly,
   t: order.isTrigger ? { trigger: { isMarket: false, triggerPx: order.triggerPx, tpsl: order.orderType === "Stop Limit" ? "sl" : "tp" } } : { limit: { tif: order.tif as "Gtc" | "Alo" } }, ...(order.cloid ? { c: order.cloid } : {}),
  },
 } };
}
export function assertAmendmentAccepted(response: unknown): void {
 const result = response as { status?: string; response?: string | { data?: { statuses?: unknown[] } } };
 if (result?.status !== "ok") throw new Error(typeof result?.response === "string" ? result.response : "Hyperliquid did not confirm the modification.");
 if (typeof result.response === "object") for (const status of result.response.data?.statuses ?? []) {
  if (status && typeof status === "object" && "error" in status) {const message=String(status.error);throw new Error(/post.only|immediately match|would.*cross/i.test(message)?"Post-only order would fill immediately. Choose a non-crossing limit price.":message); }
 }
}
