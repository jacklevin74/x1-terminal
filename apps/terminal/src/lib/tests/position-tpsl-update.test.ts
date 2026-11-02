import {expect,it} from "vitest";
import {buildPositionTpSlUpdate} from "@/domain/trade/position-tpsl-update";
const base={assetId:110000,isLong:true,tpPriceNum:120,slPriceNum:90};
it("creates reduce-only whole-position TP and SL",()=>{
 const update=buildPositionTpSlUpdate(base);expect(update.cancels).toEqual([]);expect(update.orders).toHaveLength(2);
 expect(update.orders.map(o=>({asset:o.a,buy:o.b,size:o.s,reduceOnly:o.r}))).toEqual([{asset:110000,buy:false,size:"0",reduceOnly:true},{asset:110000,buy:false,size:"0",reduceOnly:true}]);
});
it("replaces only the changed trigger and preserves the other protection",()=>{
 const update=buildPositionTpSlUpdate({...base,existingTpOrderId:1,existingSlOrderId:2,existingTpPrice:110,existingSlPrice:90});
 expect(update.cancels).toEqual([{a:110000,o:1}]);expect(update.orders).toHaveLength(1);expect(update.orders[0].t).toMatchObject({trigger:{tpsl:"tp",triggerPx:"120"}});
});
it("allows clearing both and makes unchanged edits a no-op",()=>{
 const old={existingTpOrderId:1,existingSlOrderId:2,existingTpPrice:120,existingSlPrice:90};
 expect(buildPositionTpSlUpdate({...base,...old})).toEqual({orders:[],cancels:[]});
 expect(buildPositionTpSlUpdate({...base,...old,tpPriceNum:null,slPriceNum:null})).toEqual({orders:[],cancels:[{a:110000,o:1},{a:110000,o:2}]});
});
it("uses buy-side closing triggers for short positions",()=>{expect(buildPositionTpSlUpdate({...base,isLong:false,tpPriceNum:80,slPriceNum:110}).orders.every(o=>o.b&&o.r&&o.s==="0")).toBe(true);});

it("displays only whole-position protective triggers and keeps builder markets distinct",async()=>{
 const {buildTpSlOrdersByCoin}=await import("@/lib/trade/open-orders");
 const orders=[
  {coin:"xyz:SILVER",oid:1,isTrigger:true,isPositionTpsl:true,reduceOnly:true,orderType:"Take Profit Market",triggerPx:"55"},
  {coin:"xyz:SILVER",oid:2,isTrigger:true,isPositionTpsl:true,reduceOnly:true,orderType:"Stop Market",triggerPx:"47"},
  {coin:"xyz:SILVER",oid:3,isTrigger:true,isPositionTpsl:false,reduceOnly:false,orderType:"Stop Market",triggerPx:"80"},
  {coin:"other:SILVER",oid:4,isTrigger:true,isPositionTpsl:true,reduceOnly:true,orderType:"Take Profit Market",triggerPx:"60"},
 ] as unknown as Parameters<typeof buildTpSlOrdersByCoin>[0];
 const values=buildTpSlOrdersByCoin(orders);expect(values.get("xyz:SILVER")).toEqual({tpPrice:55,tpOrderId:1,slPrice:47,slOrderId:2});expect(values.get("other:SILVER")?.tpOrderId).toBe(4);
});
