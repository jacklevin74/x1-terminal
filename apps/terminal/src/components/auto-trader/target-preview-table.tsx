import {useEffect,useState} from "react";
import type {ExecutorCycle} from "@/lib/auto-trader/executor-cycle";
import {isRecentExecutorCycle} from "@/lib/auto-trader/executor-cycle";
import {AutoTraderMarketLabel} from "./market-label";
import {HelpTip} from "./help-tip";
import {executorActionLabel,executorReasonLabel} from "@/lib/auto-trader/action-label";
import {money} from "./status-card";
export function TargetPreviewTable({snapshot,account,refreshing=false,unavailable=false}:{snapshot:ExecutorCycle|null;account:string;refreshing?:boolean;unavailable?:boolean}){
 const [previous,setPrevious]=useState<ExecutorCycle|null>(null),[now,setNow]=useState(()=>Date.now());
 useEffect(()=>{setPrevious(old=>snapshot&&snapshot.account.toLowerCase()===account.toLowerCase()&&(!old||old.account.toLowerCase()!==account.toLowerCase()||snapshot.cycleTs>=old.cycleTs)?snapshot:refreshing&&old?.account.toLowerCase()===account.toLowerCase()?old:null);},[snapshot,account,refreshing]);
 useEffect(()=>{const timer=setInterval(()=>setNow(Date.now()),1000);return()=>clearInterval(timer);},[]);
 const candidate=snapshot??(refreshing?previous:null);
 const cycle=!unavailable&&candidate?.account.toLowerCase()===account.toLowerCase()&&isRecentExecutorCycle(candidate,now)?candidate:null;
 return <>
  <p role="status" className={`min-h-4 text-xs ${unavailable?"text-warning":"text-fg-muted"}`}>{!cycle?"No recent executor cycle":refreshing?"Refreshing executor cycle…":"Showing the executor’s recorded decisions, not a forecast."}</p>
  {cycle&&<>
   <div className="flex flex-wrap gap-x-5 gap-y-2 text-xs text-fg-muted"><span>Cycle: <time dateTime={new Date(cycle.cycleTs).toISOString()}>{new Date(cycle.cycleTs).toLocaleString()}</time></span><span>Equity: {money(cycle.equity)}</span><span>Target leverage: {cycle.targetLeverage===null?"—":`${cycle.targetLeverage}×`}</span><span>k: {cycle.k??"—"}</span>{cycle.scale!==null&&<span>Scale: {cycle.scale}</span>}<span>Held neutrals: {cycle.heldNeutrals??"—"}</span><span>Gross before cap: {money(cycle.grossBeforeCap)}</span><span>Gross after cap: {money(cycle.grossAfterCap)}</span></div>
   <div className="overflow-x-auto"><table className="w-full whitespace-nowrap text-left text-xs"><thead><tr>{["Market","Score","Target","Current","Gap","Action","Reason"].map(h=><th className="pb-2 pr-4 font-normal text-fg-muted" key={h}>{h}<HelpTip label={h} /></th>)}</tr></thead><tbody>{cycle.rows.map((row,index)=><tr key={`${row.market}:${index}`}><td className="py-1.5 pr-4"><AutoTraderMarketLabel coin={row.market} /></td><td className="pr-4">{row.score??"—"}</td><td className="pr-4">{money(row.targetUsd)}</td><td className="pr-4">{money(row.currentUsd)}</td><td className="pr-4">{money(row.gapUsd)}</td><td className="pr-4"><span title={`Executor action: ${row.action??"—"}\n${row.reason??"The executor did not provide a reason."}`}>{executorActionLabel(row)}</span></td><td className="max-w-md whitespace-normal text-fg-muted" title={row.reason??undefined}>{executorReasonLabel(row)}</td></tr>)}</tbody></table></div>
   <p className="text-xs text-fg-muted">Positive exposure is long; negative exposure is short. Increasing a short sells; reducing a short buys. Labels clarify the executor’s action; original API text is available on hover. Missing values are shown as —.</p>
  </>}
 </>;
}
