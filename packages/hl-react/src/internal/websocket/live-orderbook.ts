import type {IRequestTransport,ISubscriptionTransport,ISubscription,L2BookWsEvent} from "@nktkas/hyperliquid";
import {orderbookPayload,subscribeOrderbook} from "./orderbook";
type Level=L2BookWsEvent["levels"][number][number];
type Bbo={coin:string;time:number;bbo:[Level|null,Level|null]};
export function mergeOrderbook(fast:L2BookWsEvent|undefined,deep:L2BookWsEvent|undefined):L2BookWsEvent|undefined{
 if(!fast)return deep;if(!deep||deep.coin!==fast.coin)return fast;if(deep.time>=fast.time)return deep;
 const levels=fast.levels.map((top,side)=>{
  if(!top.length)return [];
  const boundary=Number(top.at(-1)!.px),opposite=Number(fast.levels[1-side][0]?.px);
  const seen=new Set<number>();
  return [...top,...deep.levels[side].filter(l=>side===0?Number(l.px)<boundary:Number(l.px)>boundary)]
   .filter(l=>{const p=Number(l.px);if(!Number.isFinite(p)||p<=0||!Number.isFinite(Number(l.sz))||Number(l.sz)<=0||seen.has(p)||(Number.isFinite(opposite)&&(side===0?p>=opposite:p<=opposite)))return false;seen.add(p);return true;})
   .sort((a,b)=>side===0?Number(b.px)-Number(a.px):Number(a.px)-Number(b.px)).slice(0,20);
 }) as L2BookWsEvent["levels"];
 return {...fast,levels};
}
/** One fast stream per grouping. Depth is requested via the same socket, never a competing slow stream. */
export async function subscribeLiveOrderbook(transport:ISubscriptionTransport&IRequestTransport,payload:ReturnType<typeof orderbookPayload>,listener:(book:L2BookWsEvent)=>void):Promise<ISubscription>{
 let stopped=false,pending=false,fast:L2BookWsEvent|undefined,deep:L2BookWsEvent|undefined,bbo:Bbo|undefined;
 let frame:ReturnType<typeof setTimeout>|number|undefined;
 let lastSnapshot=-Infinity,deepReceivedAt=0;
 let gapSince:number|undefined;
 let cachedFast:L2BookWsEvent|undefined,cachedDeep:L2BookWsEvent|undefined,cachedBook:L2BookWsEvent|undefined,lastPublished:L2BookWsEvent|undefined;
 const merged=()=>{if(fast!==cachedFast||deep!==cachedDeep){cachedFast=fast;cachedDeep=deep;cachedBook=mergeOrderbook(fast,deep);}return cachedBook;};
 const needsDepth=()=>{const book=merged();return !!book&&!!deep&&book.levels.some((levels,i)=>levels.length<Math.min(20,Math.max(deep!.levels[i].length,lastPublished?.levels[i].length??0)));};
 const subscriptions:ISubscription[]=[],lifetime=new AbortController();
 const raf=typeof requestAnimationFrame==="function";
 const emit=()=>{if(stopped||frame!==undefined)return;const flush=()=>{frame=undefined;if(stopped)return;let book=merged();if(!book)return;
  const shortened=!!lastPublished&&!!deep&&book.levels.some((levels,i)=>levels.length<Math.min(20,lastPublished!.levels[i].length));
  if(shortened){if(Date.now()-deepReceivedAt<1500&&deep!.time>=lastPublished!.time&&deep!.levels.every((levels,i)=>levels.length>=Math.min(20,lastPublished!.levels[i].length))){book=deep!;gapSince=undefined;}else{gapSince??=Date.now();if(Date.now()-gapSince<1500)return;}}else gapSince=undefined;
  let spread=book.spread;const top=bbo&&bbo.time>=book.time?bbo.bbo:[book.levels[0][0],book.levels[1][0]];if(top[0]&&top[1]){const gap=Number(top[1].px)-Number(top[0].px);if(gap>=0)spread=String(gap);}if(lastPublished?.levels===book.levels&&lastPublished.spread===spread&&lastPublished.time===book.time)return;lastPublished={...book,spread};listener(lastPublished);};const schedule=()=>{frame=raf?requestAnimationFrame(flush):setTimeout(flush,16);};schedule();};
 const snapshot=async()=>{
  if(stopped||pending||Date.now()-lastSnapshot<500||(typeof document!=="undefined"&&document.visibilityState==="hidden"))return;
  pending=true;lastSnapshot=Date.now();
  try{const book=await transport.request<L2BookWsEvent>("info",{type:"l2Book",coin:payload.coin,nSigFigs:payload.nSigFigs,mantissa:payload.mantissa},AbortSignal.any([lifetime.signal,AbortSignal.timeout(5000)]));
   if(!stopped&&book.coin===payload.coin&&Number.isFinite(book.time)&&Array.isArray(book.levels)&&(!deep||book.time>deep.time)){deep=book;deepReceivedAt=Date.now();emit();}
  }catch{/* Keep the live top; retry depth on the next tick. */}finally{pending=false;}
 };
 const timer=setInterval(()=>void snapshot(),2000);
 const focus=()=>void snapshot();if(typeof window!=="undefined")window.addEventListener("focus",focus);
 const cleanup=()=>{stopped=true;lifetime.abort();clearInterval(timer);if(typeof window!=="undefined")window.removeEventListener("focus",focus);if(frame!==undefined){if(raf)cancelAnimationFrame(frame as number);else clearTimeout(frame);}return Promise.all(subscriptions.map(s=>s.unsubscribe())).then(()=>{});};
 const keep=async(promise:Promise<ISubscription>)=>{const sub=await promise;if(stopped)await sub.unsubscribe();else subscriptions.push(sub);return sub;};
 void snapshot();
 try{await Promise.all([
  keep(subscribeOrderbook(transport,{...payload,fast:true},book=>{if(!stopped){fast=book;if(needsDepth())void snapshot();emit();}})),
  keep(transport.subscribe<Bbo>("bbo",{type:"bbo",coin:payload.coin},event=>{const next=event.detail;if(!stopped&&next.coin===payload.coin&&Number.isFinite(next.time)&&(!bbo||next.time>bbo.time)){bbo=next;emit();}})),
 ]);}catch(e){await cleanup();throw e;}
 return {unsubscribe:cleanup,failureSignal:AbortSignal.any(subscriptions.map(s=>s.failureSignal).filter((s):s is AbortSignal=>!!s))};
}
