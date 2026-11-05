import {CheckCircleIcon,WarningCircleIcon,QuestionIcon} from "@phosphor-icons/react";
import {HelpTip} from "./help-tip";
import {useEffect,useState} from "react";
import {cycleTiming} from "@/lib/auto-trader/cycle-timing";
import { Trans } from "@lingui/react/macro";
import type { AutoTraderStatus } from "@/lib/auto-trader/types";
export function money(value:unknown){return typeof value==="number"&&Number.isFinite(value)?new Intl.NumberFormat("en-US",{style:"currency",currency:"USD",maximumFractionDigits:2}).format(value):"—";}
export function when(value:unknown){return typeof value==="number"&&Number.isFinite(value)&&value>0?new Date(value).toLocaleString():"—";}
export function executionLabel(status:AutoTraderStatus){
 if(!status.registered)return "Not registered";
 if(status.state==="paused")return "PAUSED";
 if(status.isSubaccount)return "SUBACCOUNT EXECUTION PENDING";
 if(status.state==="flatten-requested")return "CLOSE REQUESTED";
 if(!status.plan||status.plan.state!=="active"||!status.lastCycle)return "WAITING FOR CYCLE";
 if(Date.now()-(status.lastCycle??status.plan.ts)>600000)return "STALE CYCLE";
 if(status.plan.live===true&&status.plan.dryRun!==true)return "LIVE";
 return "DRY-RUN";
}
function Guard({label,value}:{label:string;value:boolean|undefined}){
 const passed=value===true,unknown=value===undefined;
 const Icon=passed?CheckCircleIcon:unknown?QuestionIcon:WarningCircleIcon;
 return <span className={`inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-xs ${passed?"border-success/30 bg-success/5":unknown?"border-stroke-weak bg-background":"border-warning/30 bg-warning/5"}`}><Icon aria-hidden="true" weight={unknown?"regular":"fill"} className={`size-5 shrink-0 ${passed?"text-success":unknown?"text-fg-muted":"text-warning"}`} /><span className="font-medium">{label}</span><HelpTip label={label} /><strong className={passed?"text-success":unknown?"text-fg-muted":"text-warning"}>{unknown?"Unknown":passed?"OK":"Blocked"}</strong></span>;
}

export function StatusCard({status}:{status:AutoTraderStatus}){
 const p=status.plan;
 const [now,setNow]=useState(()=>Date.now());
 useEffect(()=>{const timer=setInterval(()=>setNow(Date.now()),1000);return()=>clearInterval(timer);},[]);
 const next=cycleTiming(status,now);
 return <section className="space-y-4 rounded-xl border border-stroke-weak bg-surface p-4" aria-label="Auto Trader status">
  <div className="flex flex-wrap items-center justify-between gap-3"><h3 className="text-sm font-semibold"><Trans>Executor status</Trans></h3><strong className={executionLabel(status)==="LIVE"?"text-success":"text-brand"}>{executionLabel(status)}</strong></div>
  <div className="grid grid-cols-2 gap-4 text-xs sm:grid-cols-4">{[["Last cycle",when(status.lastCycle??p?.ts)],["Equity",money(p?.equity)],["Day PNL",money(p?.dayPnl)],["Agent expires",when(status.validUntil)]].map(([label,value])=><div key={label}><span className="block text-fg-muted">{label}<HelpTip label={label} /></span><span className="mt-1 block font-medium">{value}</span></div>)}</div>
  <div aria-label="Next Auto Trader cycle" className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-stroke-weak bg-background px-3 py-2"><div><span className="block text-xs text-fg-muted">Next cycle · estimated<HelpTip label="Next cycle" /></span><strong className="tabular-nums text-brand">{next.label}</strong>{next.at&&<span className="ml-2 text-xs text-fg-muted">around {new Date(next.at).toLocaleTimeString()}</span>}</div><p className="max-w-lg text-xs text-fg-muted">The executor waits five minutes after each cycle finishes. This estimate uses the last reported cycle timestamp; execution time can delay it. A cycle checks signals and may send no trades. Status refreshes every 30 seconds.</p></div>
  {status.state==="flatten-requested"&&<p role="status" className="rounded-lg bg-background p-3 text-sm text-warning">Close request accepted. Waiting for the executor’s next cycle (normally every five minutes). Positions are not confirmed closed yet. Check the next cycle’s orders and fills; do not resend the request while it is queued.</p>}
  {status.agent&&<p className="break-all font-mono text-xs text-fg-muted">Agent: {status.agent}</p>}
  {status.renewSoon&&<p role="status" className="text-sm text-warning"><Trans>Your agent expires within 14 days. Renew its API wallet, register the new key, then enable Auto Trader again.</Trans></p>}
  <div className="flex flex-wrap gap-2"><Guard label="Agent approval" value={p?.agentApproved} /><Guard label="Builder fee" value={p?.builderFeeOk} /><Guard label="Daily loss stop" value={p?p.killed===true?false:p.killed===false?true:undefined:undefined} /><Guard label="Signal freshness" value={p?.signalTs?Date.now()-p.signalTs<=600000:undefined} /><Guard label="Minimum equity" value={typeof p?.equity==="number"?p.equity>=15:undefined} /></div>
  {(p?.skip||p?.sendNote)&&<p role="status" className="rounded-lg bg-background p-3 text-sm text-warning">{p.skip??p.sendNote}</p>}
  {p?.killed&&<p className="text-sm text-warning"><Trans>Daily loss stop reached. Opens and adds are blocked; the executor can only reduce exposure until the UTC daily reset.</Trans></p>}
  <p className="text-xs text-fg-muted"><Trans>Plans run about every five minutes. Active does not guarantee live trading: execution also requires the operator's live gate. Paused and dry-run plans send no orders.</Trans></p>
  <details className="text-xs"><summary className="cursor-pointer text-brand"><Trans>Cycle orders and fills</Trans> ({p?.orders?.length??0} / {p?.fills?.length??0})</summary><div className="mt-3 overflow-x-auto"><table className="w-full whitespace-nowrap text-left"><thead><tr>{["Type","Market","Action","Side","Size","Price","Value / result"].map(h=><th key={h} className="pb-2 pr-4 font-normal text-fg-muted">{h}</th>)}</tr></thead><tbody>
   {p?.orders?.map((o,i)=><tr key={`o${i}`}><td className="py-1.5 pr-4">Planned</td><td className="pr-4">{o.coin}</td><td className="pr-4">{o.tag}{o.reduceOnly?" · reduce only":""}</td><td className="pr-4">{o.isBuy?"Buy":"Sell"}</td><td className="pr-4">{o.sz}</td><td className="pr-4">{money(o.px)}</td><td>{money(o.ntl)}</td></tr>)}
   {p?.fills?.map((f,i)=><tr key={`f${i}`}><td className="py-1.5 pr-4">Result</td><td className="pr-4">{f.coin}</td><td className="pr-4">{f.tag}</td><td className="pr-4">{f.side==="B"?"Buy":"Sell"}</td><td className="pr-4">{f.filled??"—"} / {f.sz}</td><td className="pr-4">{money(f.avgPx)}</td><td className={f.error?"text-error":""}>{f.error??"No error reported"}</td></tr>)}
   {!p?.orders?.length&&!p?.fills?.length&&<tr><td colSpan={7} className="py-3 text-fg-muted">No cycle orders or fills reported.</td></tr>}
  </tbody></table></div></details>
 </section>;
}
