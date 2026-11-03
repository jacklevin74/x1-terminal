import { AUTO_TRADER_DEADBAND } from "@/config/auto-trader";
import type { AutoTraderSettings, Signal } from "./types";
export function validateSettings(settings:AutoTraderSettings, markets:readonly string[]){
 if(!Number.isInteger(settings.leverage)||settings.leverage<1||settings.leverage>5)throw new Error("Leverage must be an integer from 1 to 5.");
 if(!Number.isFinite(settings.killPct)||settings.killPct<=0||settings.killPct>0.5)throw new Error("Daily loss stop must be above 0% and at most 50%.");
 if(!Number.isFinite(settings.minOrderUsd)||settings.minOrderUsd<10)throw new Error("Minimum order must be at least $10.");
 for(const list of [settings.include,settings.exclude])if(list!==null&&(!Array.isArray(list)||list.some(m=>!markets.includes(m))))throw new Error("Select supported Auto Trader markets.");
 if(!allowedMarkets(settings,markets).length)throw new Error("Select at least one market.");
 return settings;
}
export function allowedMarkets(settings:Pick<AutoTraderSettings,"include"|"exclude">, markets:readonly string[]){return markets.filter(coin=>(!settings.include||settings.include.includes(coin)||settings.include.includes(coin.split(":").at(-1)!))&&!(settings.exclude?.includes(coin)||settings.exclude?.includes(coin.split(":").at(-1)!)));}
export function targetRows({equity,settings,signal,current,killed=false}:{equity:number;settings:AutoTraderSettings;signal:Signal;current:Record<string,number>;killed?:boolean}){
 const markets=allowedMarkets(settings,signal.coins.map(c=>c.coin)),perCoin=markets.length?equity*settings.leverage/markets.length:0;
 return markets.map(coin=>{
  const entry=signal.coins.find(c=>c.coin===coin)??signal.coins.find(c=>c.coin===coin.split(":").at(-1));
  const score=entry?.score??null;
  const weight=score===null||Math.abs(score)<AUTO_TRADER_DEADBAND?0:score/100;
  const cur=current[coin]??0,tgt=perCoin*weight,gap=tgt-cur;
  const flip=cur!==0&&tgt!==0&&Math.sign(cur)!==Math.sign(tgt);
  let actions=cur!==0&&(tgt===0||flip)?[flip?"FLIP-CLOSE":"CLOSE",...(flip&&Math.abs(tgt)>=settings.minOrderUsd&&!killed?["FLIP-OPEN"]:[])]:Math.abs(gap)<settings.minOrderUsd?["SKIP"]:cur===0?["OPEN"]:Math.abs(tgt)>Math.abs(cur)?["ADD"]:["REDUCE"];
  if(killed&&actions.some(a=>["OPEN","ADD"].includes(a)))actions=["LOSS STOP"];
  return {coin,score,weight,current:cur,target:tgt,gap,actions};
 });
}
// Inputs are live snapshots; missing values remain unavailable, never fabricated zero.
export function accountEquity(mode:string|undefined,main:{marginSummary:{accountValue:string};assetPositions:{position:{unrealizedPnl:string}}[]}|undefined,xyz:typeof main,spot:{balances:{coin:string;total:string}[]}|undefined):number|null{
 if(!mode||!main||!xyz||!["disabled","default","dexAbstraction","unifiedAccount"].includes(mode))return null;
 const value=mode==="unifiedAccount"?spot?Number(spot.balances.find(b=>b.coin==="USDC")?.total??"0")+[...main.assetPositions,...xyz.assetPositions].reduce((n,p)=>n+Number(p.position.unrealizedPnl),0):NaN:Number(main.marginSummary.accountValue)+Number(xyz.marginSummary.accountValue);
 return Number.isFinite(value)?value:null;
}
