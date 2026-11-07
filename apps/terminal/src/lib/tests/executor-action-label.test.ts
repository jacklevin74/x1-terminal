import {expect,it} from "vitest";
import {executorActionLabel,executorReasonLabel} from "@/lib/auto-trader/action-label";
const row=(action:string|null,currentUsd:number,targetUsd:number,reason:string|null=null)=>({action,currentUsd,targetUsd,reason});
it.each([
 ["ADD",-4097.11,-4252.16,"Increase short (sell)"],
 ["REDUCE",-7522.85,-5264.58,"Reduce short (buy)"],
 ["ADD",5102.98,5264.58,"Increase long (buy)"],
 ["REDUCE",5000,4000,"Reduce long (sell)"],
 ["OPEN",0,-1000,"Open short (sell)"],
 ["OPEN",0,1000,"Open long (buy)"],
 ["CLOSE",-1000,0,"Close short (buy)"],
 ["CLOSE",1000,0,"Close long (sell)"],
 ["FLIP-CLOSE / FLIP-OPEN",1000,-1000,"Close long (sell) / Open short (sell)"],
 ["FLIP-CLOSE / FLIP-OPEN",-1000,1000,"Close short (buy) / Open long (buy)"],
 ["HOLD (neutral)",-3275.59,-3275.59,"Hold short (neutral)"],
 ["HOLD_NEUTRAL",2699.95,2699.95,"Hold long (neutral)"],
 ["HOLD_NEUTRAL",0,0,"Stay flat (neutral)"],
 ["skip ADD $120.22",-5954.54,-6074.51,"Skip increase short (sell) · $120.22"],
 ["skip REDUCE $105.85",-8812.58,-8706.8,"Skip reduce short (buy) · $105.85"],
 ["BUY",-1000,-500,"Buy"],
 ["SELL",-1000,-1500,"Sell"],
 ["CAPPED",-1000,-1000,"CAPPED"],
 [null,-1000,-1500,"—"],
])("%s at %s to %s is described as %s",(action,current,target,label)=>{
 expect(executorActionLabel(row(action,current,target))).toBe(label);
});
it("clarifies reason tags and preserves executor amounts, cap/minimum explanations and raw data",()=>{
 const input=row("skip REDUCE $22.34",-11964.78,-11942.82,"Per-coin weight cap: |weight×k| limited to 1; skip REDUCE $22.34: below minOrderUsd 150 (adjustment $22.34)");
 const original=structuredClone(input);
 expect(executorReasonLabel(input)).toBe("Per-coin weight cap: |weight×k| limited to 1; Skip reduce short (buy) · $22.34: below minOrderUsd 150 (adjustment $22.34)");
 expect(executorReasonLabel(row("ADD",-4097.11,-4252.16,"ADD: signed adjustment -$155.05"))).toBe("Increase short (sell): exposure change -$155.05");
 expect(input).toEqual(original);
});
