import type {ExecutorTargetRow} from "./executor-cycle";
type Row=Pick<ExecutorTargetRow,"action"|"reason"|"currentUsd"|"targetUsd">;
// Presentation only: translate the executor's tags, never decide or resize a trade.
function leg(tag:string,row:Row){
 const current=Math.sign(row.currentUsd),target=Math.sign(row.targetUsd);
 const lower=tag.toUpperCase();
 if(lower==="BUY"||lower==="SELL")return lower==="BUY"?"Buy":"Sell";
 const closing=lower==="CLOSE"||lower==="FLIP-CLOSE",reducing=lower==="REDUCE";
 const direction=closing||reducing?current:target;
 const verb=closing?"Close":reducing?"Reduce":lower==="ADD"?"Increase":"Open";
 if(!direction)return `${verb} exposure`;
 const side=direction<0?"short":"long",order=closing||reducing?(direction<0?"buy":"sell"):(direction<0?"sell":"buy");
 return `${verb} ${side} (${order})`;
}
function neutral(row:Row){return row.currentUsd<0?"Hold short (neutral)":row.currentUsd>0?"Hold long (neutral)":"Stay flat (neutral)";}
function translate(text:string,row:Row){
 return text.replace(/\bHOLD_NEUTRAL\b|HOLD \(neutral\)/gi,()=>neutral(row))
  .replace(/\bskip\s+(FLIP-CLOSE|FLIP-OPEN|REDUCE|CLOSE|OPEN|ADD|BUY|SELL)(\s+\$[\d,.]+)?/gi,(_match,tag:string,amount:string|undefined)=>`Skip ${leg(tag,row).toLowerCase()}${amount?` · ${amount.trim()}`:""}`)
  .replace(/\b(FLIP-CLOSE|FLIP-OPEN|REDUCE|CLOSE|OPEN|ADD|BUY|SELL)\b/g,tag=>leg(tag,row));
}
export function executorActionLabel(row:Row){return row.action?translate(row.action,row):"—";}
export function executorReasonLabel(row:Row){return row.reason?translate(row.reason,row).replace(/signed adjustment/gi,"exposure change"):"—";}
