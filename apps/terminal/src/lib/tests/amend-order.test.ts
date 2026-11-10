import { expect, it } from "vitest";
import { assertAmendmentAccepted, buildOrderAmendment, canAmendRestingOrder, canAmendOrderPrice } from "../trade/amend-order";
import type { OpenOrder } from "../trade/open-orders";
const order={timestamp:1,triggerCondition:"N/A",triggerPx:"0",oid:123,coin:"BTC",side:"A",limitPx:"100",sz:"2",origSz:"3",reduceOnly:false,tif:"Alo",orderType:"Limit",isTrigger:false,isPositionTpsl:false,children:[],cloid:`0x${"ab".repeat(16)}`} as OpenOrder;
const options={assetId:0,szDecimals:3,input:"1.2349",mode:"amount" as const};
it("amends remaining size, preserves side, price, reduce-only, post-only and client ID",()=>{
 const amended=buildOrderAmendment(order,options);
 expect(amended.params).toEqual({oid:123,order:{a:0,b:false,p:"100",s:"1.234",r:false,t:{limit:{tif:"Alo"}},c:order.cloid}});
 expect(amended.value).toBe("123.4");
});
it("converts value into valid size increments without exceeding requested notional",()=>{
 const amended=buildOrderAmendment({...order,limitPx:"3"},{...options,mode:"value",input:"100"});
 expect(amended.amount).toBe("33.333");expect(amended.value).toBe("99.999");
});
it("rejects invalid, dust and oversize reduce-only amendments",()=>{
 for(const input of ["", "-1", "0", "0.001", "NaN"])expect(()=>buildOrderAmendment(order,{...options,input})).toThrow();
 expect(()=>buildOrderAmendment({...order,reduceOnly:true},{...options,positionSize:"1"})).toThrow("exceeds");
 expect(buildOrderAmendment({...order,reduceOnly:true},{...options,input:"1",positionSize:"2"}).params.order!.r).toBe(true);
});
it("does not silently convert trigger, attached TP/SL, market or unknown-TIF orders",()=>{
 expect(canAmendRestingOrder({...order,isTrigger:true})).toBe(false);
 expect(canAmendRestingOrder({...order,tif:null})).toBe(false);
 expect(canAmendRestingOrder({...order,orderType:"Market"})).toBe(false);
 expect(canAmendRestingOrder({...order,children:[{}] as any})).toBe(false);
});
it("requires exchange confirmation and surfaces per-order rejections",()=>{
 expect(()=>assertAmendmentAccepted({status:"ok"})).not.toThrow();
 expect(()=>assertAmendmentAccepted({status:"ok",response:{data:{statuses:[{error:"insufficient margin"}]}}})).toThrow("insufficient margin");
 expect(()=>assertAmendmentAccepted({})).toThrow("did not confirm");
});

it("changes price without changing remaining amount or execution flags",()=>{
 const result=buildOrderAmendment(order,{...options,mode:"price",input:"123.45"});
 expect(result.params.order).toMatchObject({p:"123.45",s:"2",b:false,r:false,t:{limit:{tif:"Alo"}},c:order.cloid});
 expect(result.value).toBe("246.9");
});
it("validates price ticks for perpetuals and spot, allowing integer prices",()=>{
 for(const input of ["0","-1","NaN","", "123.456", "0.0001"])expect(()=>buildOrderAmendment(order,{...options,mode:"price",input})).toThrow();
 expect(buildOrderAmendment(order,{...options,mode:"price",input:"123456"}).price).toBe("123456");
 expect(buildOrderAmendment({...order,sz:"200000"},{...options,isSpot:true,mode:"price",input:"0.00012"}).price).toBe("0.00012");
});
it.each(["Stop Limit","Take Profit Limit"])("preserves the trigger when editing standalone %s execution price",orderType=>{
 const trigger={...order,orderType,isTrigger:true,tif:null,triggerPx:"95"} as OpenOrder;
 expect(canAmendOrderPrice(trigger)).toBe(true);
 const result=buildOrderAmendment(trigger,{...options,mode:"price",input:"94.5"});
 expect(result.params.order).toMatchObject({p:"94.5",s:"2",t:{trigger:{isMarket:false,triggerPx:"95",tpsl:orderType==="Stop Limit"?"sl":"tp"}}});
 expect(()=>buildOrderAmendment(trigger,options)).toThrow();
 expect(canAmendOrderPrice({...trigger,isPositionTpsl:true})).toBe(false);
});
it("excludes market triggers, attached orders and provides a clear post-only rejection",()=>{
 expect(canAmendOrderPrice({...order,isTrigger:true,orderType:"Stop Market"})).toBe(false);
 expect(canAmendOrderPrice({...order,children:[{}] as any})).toBe(false);
 expect(()=>assertAmendmentAccepted({status:"ok",response:{data:{statuses:[{error:"Post only order would have immediately matched"}]}}})).toThrow("Post-only order would fill immediately");
});
