import {useEffect,useState} from "react";
import type {TargetPreviewRow} from "@/lib/auto-trader/action-explanation";
import {AutoTraderMarketLabel} from "./market-label";
import {HelpTip} from "./help-tip";
import {TargetActionTooltip} from "./target-action-tooltip";
import {money} from "./status-card";

export function TargetPreviewTable({rows,minOrderUsd,unsaved,executionNote,refreshing=false}:{rows:TargetPreviewRow[]|null;minOrderUsd:number;unsaved:boolean;executionNote:string;refreshing?:boolean}){
 const [previous,setPrevious]=useState<{rows:TargetPreviewRow[];minOrderUsd:number}|null>(null);
 useEffect(()=>{if(rows)setPrevious({rows,minOrderUsd});},[rows,minOrderUsd]);
 const snapshot=rows?{rows,minOrderUsd}:previous;
 const retained=!rows&&!!previous;
 return <>
  <p role="status" className={`min-h-4 text-xs ${retained?"text-warning":"text-fg-muted"}`}>{retained?"Showing the last available preview while settings or refreshed data are unavailable. Values will update when valid data arrives.":refreshing?"Updating preview…":"Preview updates automatically."}</p>
  {snapshot?<div className="overflow-x-auto"><table className="w-full whitespace-nowrap text-left text-xs"><thead><tr>{["Market","Score","Target","Current","Gap","Action"].map(h=><th className="pb-2 pr-4 font-normal text-fg-muted" key={h}>{h}<HelpTip label={h} /></th>)}</tr></thead><tbody>{snapshot.rows.map(row=><tr key={row.coin}><td className="py-1.5 pr-4"><AutoTraderMarketLabel coin={row.coin} /></td><td className="pr-4">{row.score??"—"}</td><td className="pr-4">{money(row.target)}</td><td className="pr-4">{money(row.current)}</td><td className="pr-4">{money(row.gap)}</td><td><div className="flex items-center gap-1">{row.actions.map(action=><TargetActionTooltip key={action} row={row} action={action} minOrderUsd={snapshot.minOrderUsd} unsaved={unsaved} executionNote={`${retained?"These values are from the previous available snapshot. ":""}${executionNote}`} />)}</div></td></tr>)}</tbody></table></div>:<p className="text-xs text-fg-muted">Waiting for valid settings, account balances, prices and signal data. No target values are assumed.</p>}
 </>;
}
