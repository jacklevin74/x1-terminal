import type { AutoTraderSettings } from "./types";
// Executor signal.js universe, reconciled with copybot-position-logic.md (2026-11-04).
// Public sentiment tracking may include markets the executor does not trade.
export const EXECUTOR_MARKETS = ["BTC","ETH","SOL","HYPE","ZEC","NEAR","xyz:GOOGL","xyz:NVDA","xyz:BRENTOIL","xyz:GOLD","xyz:MU","xyz:INTC"] as const;
export function validateSettings(settings:AutoTraderSettings, markets:readonly string[]){
 if(!Number.isInteger(settings.leverage)||settings.leverage<1||settings.leverage>5)throw new Error("Leverage must be an integer from 1 to 5.");
 if(!Number.isFinite(settings.killPct)||settings.killPct<=0||settings.killPct>0.5)throw new Error("Daily loss stop must be above 0% and at most 50%.");
 if(!Number.isFinite(settings.minOrderUsd)||settings.minOrderUsd<10)throw new Error("Minimum order must be at least $10.");
 for(const list of [settings.include,settings.exclude])if(list!==null&&(!Array.isArray(list)||list.some(m=>!markets.includes(m))))throw new Error("Select supported Auto Trader markets.");
 if(!allowedMarkets(settings,markets).length)throw new Error("Select at least one market.");
 return settings;
}
export function allowedMarkets(settings:Pick<AutoTraderSettings,"include"|"exclude">, markets:readonly string[]){return markets.filter(coin=>(EXECUTOR_MARKETS as readonly string[]).includes(coin)&&(!settings.include||settings.include.includes(coin)||settings.include.includes(coin.split(":").at(-1)!))&&!(settings.exclude?.includes(coin)||settings.exclude?.includes(coin.split(":").at(-1)!)));}
// Inputs are live snapshots; missing values remain unavailable, never fabricated zero.
export function accountEquity(mode:string|undefined,main:{marginSummary:{accountValue:string};assetPositions:{position:{unrealizedPnl:string}}[]}|undefined,xyz:typeof main,spot:{balances:{coin:string;total:string}[]}|undefined):number|null{
 if(!mode||!main||!xyz||!["disabled","default","dexAbstraction","unifiedAccount"].includes(mode))return null;
 const value=mode==="unifiedAccount"?spot?Number(spot.balances.find(b=>b.coin==="USDC")?.total??"0")+[...main.assetPositions,...xyz.assetPositions].reduce((n,p)=>n+Number(p.position.unrealizedPnl),0):NaN:Number(main.marginSummary.accountValue)+Number(xyz.marginSummary.accountValue);
 return Number.isFinite(value)?value:null;
}
