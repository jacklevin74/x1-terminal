import type { InfoClient } from "@nktkas/hyperliquid";
import type { Address } from "viem";
import { buildOrderPlan } from "@/domain/trade/order-intent";
import type { SubmitPlanInput } from "@/hooks/trade/use-submit-plan";
import type { OrderResult } from "@/lib/trade/extract-order-status";

// Discover every perpetual venue, including positions outside the signal list.
export async function closeNow({info,master,check,submit}:{info:InfoClient;master:Address;check:()=>void;submit:(plan:SubmitPlanInput)=>Promise<OrderResult>}){
 const dexes=await info.perpDexs();check();
 const venues=[{dex:"",index:-1},...dexes.flatMap((dex,index)=>dex?.name?[{dex:dex.name,index}]:[])];
 const snapshot=await Promise.all(venues.map(async venue=>{
  const [state,meta,mids]=await Promise.all([info.clearinghouseState({user:master,dex:venue.dex}),info.meta({dex:venue.dex}),info.allMids({dex:venue.dex})]);
  return {venue,state,meta,mids};
 }));check();
 const plans=snapshot.flatMap(({venue,state,meta,mids})=>state.assetPositions.filter(p=>Number(p.position.szi)!==0).map(({position})=>{
  const index=meta.universe.findIndex(m=>m.name===position.coin),market=meta.universe[index];
  const size=Math.abs(Number(position.szi)),price=Number(mids[position.coin]);
  if(!market||!Number.isFinite(size)||size<=0||!Number.isFinite(price)||price<=0)throw new Error(`Cannot verify close inputs for ${position.coin}. No close orders were sent.`);
  const plan=buildOrderPlan({kind:"marketClose",assetId:venue.index<0?index:100000+venue.index*10000+index,size,szDecimals:market.szDecimals,isLong:Number(position.szi)>0,markPx:price,slippageBps:100});
  if(plan.errors.length)throw new Error(plan.errors.join("; "));
  plan.orders=plan.orders.map(order=>({...order,t:{limit:{tif:"Ioc" as const}}}));
  return {coin:position.coin,plan};
 }));
 for(const {coin,plan} of plans){check();const result=await submit(plan);check();if(!result.ok)throw new Error(`Close stopped at ${coin}: ${result.error.replace(/[.\s]+$/,"")}. Auto Trader remains paused. Check positions before retrying.`);}
 const remaining=await Promise.all(venues.map(v=>info.clearinghouseState({user:master,dex:v.dex})));check();
 if(remaining.some(s=>s.assetPositions.some(p=>Number(p.position.szi)!==0)))throw new Error("Close orders submitted, but positions remain open or fills are not yet reflected. Auto Trader is paused. Refresh positions before retrying.");
 return plans.length;
}
