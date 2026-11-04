import {Tooltip} from "@hypeterminal/ui";
import {useId,useState} from "react";
import {explainTargetAction,type TargetPreviewRow} from "@/lib/auto-trader/action-explanation";
export function TargetActionTooltip({row,action,minOrderUsd,unsaved,executionNote}:{row:TargetPreviewRow;action:string;minOrderUsd:number;unsaved:boolean;executionNote:string}){
 const [open,setOpen]=useState(false);
 const tooltipId=useId();
 const explanation=explainTargetAction(row,action,minOrderUsd);
 return <Tooltip open={open} onOpenChange={setOpen} content={<div role="tooltip" id={tooltipId} className="max-w-sm space-y-2 whitespace-normal leading-relaxed"><p className="font-semibold">{row.coin} · {action}</p><p>{explanation.why}</p><p><span className="font-medium">Next cycle: </span>{explanation.next}</p>{unsaved&&<p className="text-warning">These settings are unsaved. Save them before they can affect execution.</p>}<p className="border-t border-stroke-weak pt-2 text-fg-muted">{executionNote} Estimate only: the executor refreshes prices and signals and checks approval, live status, signal freshness, size rounding and stop-loss re-entry blocks. These can prevent or change the order.</p></div>}>
  <button type="button" aria-describedby={open?tooltipId:undefined} aria-label={`Explain ${action} for ${row.coin}`} onClick={()=>requestAnimationFrame(()=>setOpen(true))} className="inline-flex items-center gap-1.5 rounded px-1 py-0.5 text-left underline decoration-dotted decoration-fg-muted underline-offset-4 hover:text-brand focus-visible:outline-2 focus-visible:outline-brand">{action}<span aria-hidden="true" className="text-fg-muted">ⓘ</span></button>
 </Tooltip>;
}
