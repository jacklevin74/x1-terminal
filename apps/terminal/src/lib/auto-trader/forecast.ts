import type { AutoTraderSettings, Signal } from "./types";
export interface ForecastRow {market:string;score:number|null;targetUsd:number|null;currentUsd:number|null;gapUsd:number|null;action:string;reason:string}
export interface Forecast {equity:number;k:number;capScale:number;gross:number;rows:ForecastRow[];killed:boolean}
/** Read-only estimate of executor.js planFollower (hl-ws bc5745c).
 * Runtime gates, stop/re-entry state, pending orders and fills are not predicted. */
export function forecastTargets(input:{settings:AutoTraderSettings;signal:Signal;universe:string[];equity:number;positions:Record<string,number|undefined>;mids:Record<string,string>;decimals:Record<string,number>;dayStart?:number|null}):Forecast {
 const {settings,signal,equity,positions,mids,decimals}=input;
 const selected=[...new Set(input.universe)].filter(coin=>(!settings.include||settings.include.includes(coin)||settings.include.includes(coin.split(":").at(-1)!))&&!(settings.exclude??[]).some(ex=>ex===coin||ex===coin.split(":").at(-1)));
 if(!selected.length||!Number.isFinite(equity)||equity<15)throw Error("Forecast requires selected markets and at least $15 in verified equity.");
 const per=equity*Math.min(5,Math.max(1,settings.leverage||1))/selected.length;
 const coins=new Map(signal.coins.map(coin=>[coin.coin,coin]));
 const plans=selected.map(market=>{
  const coin=coins.get(market),score=coin?forecastScore(coin,settings.flowPct):null;
  const weight=score===null||Math.abs(score)<15?0:score/100;
  const mid=Number(mids[market]),current=positions[market]??0;
  const valid=Number.isFinite(mid)&&mid>0&&Number.isInteger(decimals[market]);
  return {market,score,weight,mid,current,valid,hold:current!==0&&weight===0,currentUsd:current*mid,target:weight*per};
 });
 const targetLev=Number(settings.targetLev)||0;
 let k=1;if(targetLev>0){const held=plans.filter(p=>p.valid&&p.hold).reduce((sum,p)=>sum+Math.abs(p.currentUsd),0),weights=plans.filter(p=>p.valid&&p.weight).reduce((sum,p)=>sum+Math.abs(p.weight),0);if(weights>0&&per>0)k=Math.max(0,targetLev*equity-held)/(per*weights);}
 const killed=!!input.dayStart&&equity<input.dayStart*(1-settings.killPct);
 for(const p of plans){p.target=(k===1?p.weight:Math.max(-1,Math.min(1,p.weight*k)))*per;if(p.hold)p.target=p.currentUsd;if(killed){if(Math.sign(p.target)!==Math.sign(p.currentUsd))p.target=0;if(Math.abs(p.target)>Math.abs(p.currentUsd))p.target=p.currentUsd;}}
 const before=plans.filter(p=>p.valid).reduce((sum,p)=>sum+Math.abs(p.target),0);
 const capScale=targetLev>0&&before>targetLev*equity+1e-6?targetLev*equity/before:1;
 for(const p of plans)p.target*=capScale;
 const min=settings.minOrderUsd||10;
 const rows=plans.map((p):ForecastRow=>{
  if(!p.valid)return {market:p.market,score:p.score,currentUsd:null,targetUsd:null,gapUsd:null,action:"UNAVAILABLE",reason:"Live midpoint or market metadata unavailable; no action forecast."};
  const targetSize=p.target/p.mid,legs:{size:number;reduce:boolean;tag:string}[]=[];
  if(p.current&&(targetSize===0||Math.sign(targetSize)!==Math.sign(p.current)))legs.push({size:-p.current,reduce:true,tag:targetSize?"FLIP-CLOSE":"CLOSE"});
  const base=legs.length?0:p.current,delta=targetSize-base;
  if(delta&&!(legs.length&&!targetSize))legs.push({size:delta,reduce:base!==0&&Math.abs(targetSize)<Math.abs(base),tag:legs.length?"FLIP-OPEN":base?Math.abs(targetSize)>Math.abs(base)?"ADD":"REDUCE":"OPEN"});
  const actions:string[]=[],reasons:string[]=[];
  if(p.hold&&capScale===1){actions.push("HOLD (neutral)");reasons.push("Neutral or missing score: retain the existing position.");}
  else if(p.hold)reasons.push("Neutral exposure reduced by the whole-book gross cap.");
  if(k!==1&&Math.abs(p.weight*k)>1)reasons.push("Per-market weight capped at 100%.");
  if(capScale<1)reasons.push("Whole-book target leverage cap applied.");
  if(killed)reasons.push("Daily-loss limit estimated from the last reported daily baseline: increases blocked.");
  for(const leg of legs){const size=Number(Math.abs(leg.size).toFixed(decimals[p.market])),value=size*p.mid,full=leg.reduce&&Math.abs(size-Math.abs(p.current))<1e-9;
   if(!size||(value<min&&!full)){actions.push(`skip ${leg.tag} $${value.toFixed(2)}`);reasons.push(`Adjustment is below the $${min} minimum or size increment.`);}
   else if(killed&&!leg.reduce)reasons.push("Increasing leg blocked by estimated daily-loss limit.");
   else actions.push(leg.tag);
  }
  return {market:p.market,score:p.score,targetUsd:p.target,currentUsd:p.currentUsd,gapUsd:p.target-p.currentUsd,action:actions.join(" / ")||"NONE",reason:reasons.join(" ")||"Rebalance toward the signal target; live executor guards still apply."};
 });
 return {equity,k,capScale,gross:plans.filter(p=>p.valid).reduce((sum,p)=>sum+Math.abs(p.target),0),rows,killed};
}
// Mirrors hl-ws PR #28 followerScore; unavailable legs retain the API score.
export function forecastScore(coin:Signal["coins"][number],flowPct:number|undefined):number|null {
 const valid=(v:unknown):v is number=>typeof v==="number"&&Number.isInteger(v)&&v>=0&&v<=40;
 if(!valid(flowPct)||flowPct===(valid(coin.flowPct)?coin.flowPct:40))return coin.score;
 if(coin.flowNorm!==undefined&&coin.flowNorm!=="oi"&&coin.flowNorm!=="share")return coin.score;
 const clamp=(n:number)=>Math.max(-100,Math.min(100,n));
 const P=coin.posScore,F=coin.flowNorm==="share"?coin.flowScoreShare??coin.flowScore:coin.flowNorm==="oi"?coin.flowScore??(coin.flowScoreOi===undefined?undefined:clamp(Math.round(coin.flowScoreOi))):coin.flowScore;
 const wallets=coin.tradersLong===undefined||coin.tradersShort===undefined?undefined:coin.tradersLong+coin.tradersShort;
 if(P===undefined||F===undefined||wallets===undefined||(coin.flowScore===undefined&&coin.flow24h===undefined))return coin.score;
 const pw=(100-flowPct)/100,fw=flowPct/100,hasPosition=wallets>0;
 const flowData=(coin.flowScore??0)!==0||(coin.flow24h??0)!==0||(coin.flowScoreShare??0)!==0||(coin.activeWallets??wallets)>wallets;
 const hasFlow=flowData&&fw>0&&(coin.flowNorm!=="oi"||wallets>0);
 const blended=hasPosition||hasFlow?Math.round((hasPosition?pw*P:0)+(hasFlow?fw*F:0))/(hasPosition&&hasFlow?1:hasPosition?pw:fw):0;
 const raw=clamp(Math.round(blended)),active=flowPct===0?wallets:coin.activeWallets??wallets;
 const full=coin.breadthFullWallets&&coin.breadthFullWallets>0?coin.breadthFullWallets:5;
 return clamp(Math.round(raw*Math.min(1,active/full)))+0;
}
