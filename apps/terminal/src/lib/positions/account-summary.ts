import {getAccountUnrealizedPnl} from "./valuation";
import type {AllDexsAccountState} from "@/hooks/trade/use-account-balances";
type State=AllDexsAccountState["clearinghouseStates"];
const value=(input:unknown)=>typeof input==="string"&&input.trim()!==""&&Number.isFinite(Number(input))?Number(input):null;
export function summarizeAccount({states,balances,mode,prices={},collateral={},ready=true}:{states:State;balances:AllDexsAccountState["spotBalances"];mode:string|null;prices?:Record<number,number>;collateral?:Record<string,number>;ready?:boolean}){
 const unrealizedPnl=getAccountUnrealizedPnl(states);
 if(!ready||!mode)return {portfolioValue:null,unrealizedPnl,maintenance:null,ratio:null,leverage:null};
 let spotValue:number|null=0;
 for(const balance of balances){const amount=value(balance.total),price=balance.token===0?1:prices[balance.token];if(amount===null){spotValue=null;break;}if(!amount)continue;if(!(price>0)){spotValue=null;break;}spotValue+=amount*price;}
 let gross:number|null=0,maintenance:number|null=0,perpValue:number|null=0;
 const groups=new Map<number,{maintenance:number;isolated:number}>();let completeCollateral=true,completeStandardRatio=true,standardRatio=0;
 for(const [dex,state] of states){
  const mm=value(state.crossMaintenanceMarginUsed),equity=value(state.marginSummary?.accountValue),cross=value(state.crossMarginSummary?.accountValue);
  if(mm===null)maintenance=null;else if(maintenance!==null)maintenance+=mm;
  if(equity===null)perpValue=null;else if(perpValue!==null)perpValue+=equity;
  if(mm===null||cross===null)completeStandardRatio=false;
  if(mm!==null&&cross!==null)standardRatio=Math.max(standardRatio,cross>0?mm/cross:mm>0?Infinity:0);
  const token=collateral[dex];if(token===undefined||mm===null){completeCollateral=false;}else{
   const group=groups.get(token)??{maintenance:0,isolated:0};group.maintenance+=mm;
   for(const {position} of state.assetPositions)if(position.leverage?.type==="isolated"){const used=value(position.marginUsed);if(used===null)completeCollateral=false;else group.isolated+=used;}
   groups.set(token,group);
  }
  for(const {position} of state.assetPositions){if(value(position.szi)===0)continue;const ntl=value(position.positionValue);if(ntl===null)gross=null;else if(gross!==null)gross+=Math.abs(ntl);}
 }
 const unified=mode==="unifiedAccount"||mode==="portfolioMargin";
 // Unified balances already contain equity; adding unrealized PNL again double-counts it.
 const portfolioValue=mode==="portfolioMargin"?null:unified?spotValue:spotValue!==null&&perpValue!==null?spotValue+perpValue:null;
 let ratio:number|null=mode==="portfolioMargin"||!completeStandardRatio?null:standardRatio;
 if(mode==="unifiedAccount"){
  ratio=completeCollateral?0:null;
  if(ratio!==null)for(const [token,group] of groups){const balance=balances.filter(b=>b.token===token).reduce((sum,b)=>sum+Number(b.total),0),available=balance-group.isolated;if(!Number.isFinite(available)){ratio=null;break;}ratio=Math.max(ratio,available>0?group.maintenance/available:group.maintenance>0?Infinity:0);}
 }
 return {portfolioValue,unrealizedPnl,maintenance,ratio,leverage:portfolioValue!==null&&portfolioValue>0&&gross!==null?gross/portfolioValue:gross===0&&portfolioValue===0?0:null};
}
