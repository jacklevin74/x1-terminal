export function ScoreChange({score,previous}:{score:number|null;previous?:number|null}) {
 const delta=score!==null&&previous!=null?score-previous:null;
 return <span className="inline-flex items-center gap-2"><span>{score??"—"}</span><span className={`text-[10px] ${delta===null||delta===0?"text-fg-muted":delta>0?"text-success":"text-error"}`} title={previous==null?"Previous signal score is unavailable until the next update.":`Previous signal score: ${previous}; change: ${delta!==null&&delta>0?"+":""}${delta}`}>
 {delta===null?"—":delta===0?"→ 0":delta>0?`▲ +${delta}`:`▼ ${delta}`}</span></span>;
}
export function ForecastAction({label}:{label:string}) {
 const skipped=/^skip/i.test(label),hold=/hold|stay flat/i.test(label);
 const side=hold?"HOLD":/\(buy\)/i.test(label)?"BUY":/\(sell\)/i.test(label)?"SELL":null;
 return <span title={label} className="inline-flex min-w-0 max-w-full flex-nowrap items-center gap-2">{side&&<span className={`inline-flex shrink-0 items-center rounded px-1.5 py-0.5 text-[10px] font-semibold ${skipped?"bg-surface text-fg-muted":side==="BUY"?"bg-success-soft text-success":side==="SELL"?"bg-error-soft text-error":"bg-warning-soft text-warning"}`}>{skipped?"SKIP ":""}{side==="BUY"?"↑ ":side==="SELL"?"↓ ":"● "}{side}</span>}<span className={`truncate ${skipped?"text-fg-muted":""}`}>{label.replace(/ \((buy|sell)\)/gi,"")}</span></span>;
}
