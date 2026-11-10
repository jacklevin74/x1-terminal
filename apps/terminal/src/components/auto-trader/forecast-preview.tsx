import { Tooltip } from "@hypeterminal/ui";
import { ForecastAction, ScoreChange } from "./forecast-presentation";
import { useEffect, useState, useRef } from "react";
import { HL_ALL_DEXS } from "@/config/app";
import { useAllDexsAccountState } from "@/hooks/trade/use-account-balances";
import { useMarkets, useSubscription } from "@/lib/hyperliquid";
import { forecastTargets, forecastScore, type Forecast } from "@/lib/auto-trader/forecast";
import { accountEquity, EXECUTOR_MARKETS } from "@/lib/auto-trader/targets";
import { executorActionLabel } from "@/lib/auto-trader/action-label";
import type { AutoTraderSettings, AutoTraderStatus, Signal } from "@/lib/auto-trader/types";
import { AutoTraderMarketLabel } from "./market-label";
import { money } from "./status-card";

export function ForecastPreview({ account, settings, status, signal, signalError=false }: {
 account:string;settings:AutoTraderSettings;status?:AutoTraderStatus;signal?:Signal;signalError?:boolean;
}) {
 const state=useAllDexsAccountState(),markets=useMarkets();
 const retained=useRef<{account:string;forecast:Forecast;signalTs:number;quoteTs:number}|null>(null);
 const midEvent=useSubscription("allMids",{dex:HL_ALL_DEXS},{enabled:true});
 const [quoteAt,setQuoteAt]=useState(0),[now,setNow]=useState(Date.now);
 useEffect(()=>{if(midEvent.data)setQuoteAt(Date.now());},[midEvent.data]);
 useEffect(()=>{const timer=setInterval(()=>setNow(Date.now()),1000);return()=>clearInterval(timer);},[]);
 const scoreHistory=useRef<{account:string;latest:Record<string,number|null>;previous:Record<string,number|null>}>({account,latest:{},previous:{}});
 const scores=Object.fromEntries((signal?.coins??[]).map(c=>{try{return [c.coin,forecastScore(c,settings.flowPct)];}catch{return [c.coin,null];}}));
 if(scoreHistory.current.account!==account)scoreHistory.current={account,latest:{},previous:{}};
 // A polling timestamp alone is not a new score cycle. Keep the last distinct snapshot.
 if(Object.keys(scores).length&&JSON.stringify(scores)!==JSON.stringify(scoreHistory.current.latest)){
  scoreHistory.current={account,previous:scoreHistory.current.latest,latest:scores};
 }
 const known=status?.plan?.rows?.map(row=>row.coin).filter(Boolean);
 const universe=known?.length?known:[...EXECUTOR_MARKETS];
 const configuredMissing=(settings.include??[]).filter(coin=>!universe.some(m=>m===coin||m.split(":").at(-1)===coin));
 const main=state.clearinghouseStates.find(([dex])=>dex==="")?.[1],xyz=state.clearinghouseStates.find(([dex])=>dex==="xyz")?.[1];
 const equity=accountEquity(state.accountAbstraction??undefined,main,xyz,{balances:state.spotBalances});
 const positions:Record<string,number>={},decimals:Record<string,number>={};
 for(const [,dex] of state.clearinghouseStates)for(const {position}of dex.assetPositions)positions[position.coin]=Number(position.szi);
 for(const coin of universe){const market=markets.getMarket(coin);if(market&&market.kind!=="spot")decimals[coin]=market.szDecimals;}
 const cycleTs=status?.lastCycle??status?.plan?.ts;
 const dayStart=cycleTs&&new Date(cycleTs).toISOString().slice(0,10)===new Date(now).toISOString().slice(0,10)?status?.plan?.dayStart:null;
 let forecast:Forecast|null=null,error:string|null=null;
 try {
  if(state.isLoading||state.hasError||equity===null)throw Error("Waiting for live account equity and positions.");
  if(!signal||signalError||!signal.timestamp||now-signal.timestamp>600000||signal.timestamp>now+60000||!signal.coins.some(c=>c.score!==null))throw Error("Waiting for a fresh usable signal; no forecast is shown from stale scores.");
  if(!midEvent.data||midEvent.status==="error"||!quoteAt||now-quoteAt>30000)throw Error("Waiting for live market midpoints.");
  const source=(status?.plan as {scoreSource?:string}|undefined)?.scoreSource;
  if(source&&/^at38/i.test(source))throw Error("This account uses a separate signal feed; its forecast requires that account-specific signal.");
  forecast=forecastTargets({settings,signal,universe,equity,positions,mids:midEvent.data.mids,decimals,dayStart});
 } catch(e) {error=e instanceof Error?e.message:"Forecast unavailable.";}
 if(retained.current?.account!==account)retained.current=null;
 if(forecast)retained.current={account,forecast,signalTs:signal!.timestamp!,quoteTs:quoteAt};
 const snapshot=retained.current;
 forecast=forecast??snapshot?.forecast??null;
 const notices=[error&&forecast?`${error} Showing the last successful forecast; it is not current.`:error,status?.state!=="active"?"Auto Trader is not active. These are hypothetical targets; no trade is scheduled.":null,configuredMissing.length?`Excluded from the last reported executor universe: ${configuredMissing.join(", ")}.`:null,!dayStart?"Current daily-loss baseline unavailable; the executor may block increases.":null].filter(Boolean).join(" ");
 return <div aria-label={`Live forecast for ${account}`} className="space-y-3">
  <p className="text-xs text-fg-muted">Live forecast using saved settings, current scores and positions. Neutral holds, leverage caps and minimum orders are included; fills and safety checks can change the next trade.</p>
  <p className="text-xs text-fg-muted">Score Δ compares the previous distinct signal update seen in this tab. Hover over the change to see the previous score.</p>
  <div role="status" className="h-5 overflow-hidden text-xs text-warning" title={notices}><p className="truncate">{notices||"\u00a0"}</p></div>
  {forecast&&<>
   <div className="flex flex-wrap gap-x-5 gap-y-2 min-h-5 text-xs text-fg-muted tabular-nums"><span>Signal: {new Date(snapshot!.signalTs).toLocaleTimeString()}</span><span>Prices: {new Date(snapshot!.quoteTs).toLocaleTimeString()}</span><span>Equity: {money(forecast.equity)}</span><span>Target leverage: {settings.targetLev?`${settings.targetLev}×`:"Not set"}</span><span>k: {forecast.k.toFixed(4)}</span><span>Forecast gross: {money(forecast.gross)}</span></div>
   <div className="overflow-x-auto"><table className="w-full min-w-[1010px] table-fixed whitespace-nowrap text-left text-xs tabular-nums"><colgroup>{[140,120,150,150,150,300].map((width,index)=><col key={index} style={{width}}/>)}</colgroup><thead><tr>{["Market","Score · Δ","Forecast target","Current","Gap","Forecast action"].map(label=><th key={label} className="pb-2 pr-4 font-normal text-fg-muted">{label}</th>)}</tr></thead><tbody>{forecast.rows.map(row=><tr key={row.market} className="h-10">
    <td className="py-1 pr-4"><AutoTraderMarketLabel coin={row.market}/></td><td className="pr-4"><ScoreChange score={row.score} previous={scoreHistory.current.previous[row.market]}/></td><td className="pr-4">{money(row.targetUsd)}</td><td className="pr-4">{money(row.currentUsd)}</td><td className="pr-4">{money(row.gapUsd)}</td>
    <td className="pr-4 overflow-hidden"><div className="h-8 flex items-center gap-2 overflow-hidden"><ForecastAction label={row.targetUsd===null||row.currentUsd===null?row.action:executorActionLabel({...row,targetUsd:row.targetUsd,currentUsd:row.currentUsd})}/><ForecastReason market={row.market} reason={row.reason}/></div></td>
   </tr>)}</tbody></table></div>
  </>}
 </div>;
}

function ForecastReason({market,reason}:{market:string;reason:string}) {
 const [open,setOpen]=useState(false);
 return <Tooltip open={open} onOpenChange={setOpen} content={<div role="tooltip" className="max-w-xs whitespace-normal text-xs leading-relaxed">{reason}</div>}><button type="button" aria-label={`Why ${market}: ${reason}`} onClick={()=>requestAnimationFrame(()=>setOpen(true))} className="inline-flex size-5 shrink-0 items-center justify-center rounded text-fg-muted hover:text-brand focus-visible:outline-2 focus-visible:outline-brand">ⓘ</button></Tooltip>;
}
