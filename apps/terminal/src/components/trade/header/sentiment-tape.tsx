import { useEffect, useState, type CSSProperties } from "react";
import { useAutoTraderSignal } from "@/lib/auto-trader/hooks";
import { cn } from "@/lib/cn";
import type { Signal } from "@/lib/auto-trader/types";

function sentiment(coin:Signal["coins"][number]) {
 if(coin.score===null)return {label:"Unavailable",color:"text-fg-muted",arrow:"—"};
 const label=coin.label??(coin.score>=60?"Strong bullish":coin.score>=20?"Bullish":coin.score<=-60?"Strong bearish":coin.score<=-20?"Bearish":"Neutral");
 return {label,color:coin.score>=20?"text-success":coin.score<=-20?"text-error":"text-fg-muted",arrow:coin.score>=20?"▲":coin.score<=-20?"▼":"•"};
}

export function SentimentTape({className}:{className?:string}) {
 const query=useAutoTraderSignal();
 const [paused,setPaused]=useState(false),[now,setNow]=useState(Date.now);
 useEffect(()=>{const timer=setInterval(()=>setNow(Date.now()),30000);return()=>clearInterval(timer);},[]);
 const coins=query.data?.coins??[];
 const updated=query.data?.timestamp??query.dataUpdatedAt;
 const stale=!!updated&&now-updated>600000;
 const delayed=query.isError||stale;
 const title=updated?`Mood Ring sentiment · updated ${new Date(updated).toLocaleTimeString()} · scores from −100 to +100`:"Mood Ring sentiment · scores from −100 to +100";
 const rows=(copy:boolean)=><ul aria-hidden={copy||undefined} className="sentiment-tape-group">{coins.map(coin=>{
  const view=sentiment(coin),score=coin.score===null?"—":`${coin.score>0?"+":""}${coin.score}`;
  return <li key={coin.coin} className="flex shrink-0 items-center gap-2 border-r border-stroke-weak/60 px-5" aria-label={`${coin.coin}: ${view.label}, score ${coin.score??"unavailable"}`}>
   <span className="font-semibold text-fg">{coin.coin.replace(/^xyz:/,"")}</span>
   <span className={cn("flex items-center gap-1.5",view.color)}><span aria-hidden="true" className="text-[9px]">{view.arrow}</span><span>{view.label}</span><span className="min-w-7 text-right font-semibold tabular-nums">{score}</span></span>
  </li>;
 })}</ul>;
 return <section aria-label="Market sentiment tape" title={title} className={cn("sentiment-tape flex h-8 w-full min-w-0 shrink-0 items-center border-b border-stroke-weak bg-surface text-2xs",className)} data-paused={paused}>
  <div className="z-10 flex h-full shrink-0 items-center gap-2 border-r border-stroke-weak bg-surface px-3">
   <span className={cn("size-1.5 rounded-full",delayed?"bg-warning":"bg-brand")} aria-hidden="true" />
   <span className="font-semibold tracking-widest text-brand">SENTIMENT</span>
   {delayed&&<button type="button" className="text-warning" onClick={()=>void query.refetch()} title="Retry sentiment update">{stale?"Stale":"Retry"}</button>}
  </div>
  {coins.length?<>
   <div className="sentiment-tape-viewport min-w-0 flex-1 overflow-x-auto" tabIndex={0} aria-label="Asset sentiment scores; hover or focus to pause">
    <div className="sentiment-tape-track" style={{"--tape-duration":`${Math.max(30,coins.length*6)}s`} as CSSProperties}>{rows(false)}{rows(true)}</div>
   </div>
   <button type="button" aria-label={paused?"Resume sentiment tape":"Pause sentiment tape"} aria-pressed={paused} onClick={()=>setPaused(value=>!value)} className="h-full w-9 shrink-0 border-l border-stroke-weak text-fg-muted hover:text-brand focus-visible:outline focus-visible:outline-brand"><span aria-hidden="true">{paused?"▶":"Ⅱ"}</span></button>
  </>:<p role="status" className="truncate px-4 text-fg-muted">{query.isError?"Sentiment unavailable":"Loading sentiment…"}{query.isError&&<button type="button" className="ml-3 text-brand" onClick={()=>void query.refetch()}>Retry</button>}</p>}
 </section>;
}
