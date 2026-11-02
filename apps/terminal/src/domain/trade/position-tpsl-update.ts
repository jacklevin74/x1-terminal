import { buildOrderPlan } from "./order-intent";
import type { ExchangeOrder } from "@/config/trade";

export function buildPositionTpSlUpdate(input:{assetId:number;isLong:boolean;tpPriceNum:number|null;slPriceNum:number|null;existingTpPrice?:number;existingSlPrice?:number;existingTpOrderId?:number;existingSlOrderId?:number}){
 const plan=buildOrderPlan({kind:"positionTpsl",...input});
 const orders:ExchangeOrder[]=[],cancels:{a:number;o:number}[]=[];
 for(const leg of ["tp","sl"] as const){
  const price=leg==="tp"?input.tpPriceNum:input.slPriceNum;
  const previous=leg==="tp"?input.existingTpPrice:input.existingSlPrice;
  const oid=leg==="tp"?input.existingTpOrderId:input.existingSlOrderId;
  if(oid!==undefined && price===previous)continue;
  if(oid!==undefined)cancels.push({a:input.assetId,o:oid});
  if(price!==null){const order=plan.orders.find(order=>"trigger" in order.t && order.t.trigger.tpsl===leg);if(order)orders.push(order);}
 }
 return {orders,cancels};
}
