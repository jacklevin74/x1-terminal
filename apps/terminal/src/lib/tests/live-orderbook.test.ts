import {afterEach,expect,it,vi} from "vitest";
import type {IRequestTransport,ISubscriptionTransport,L2BookWsEvent} from "@nktkas/hyperliquid";
import {mergeOrderbook,subscribeLiveOrderbook} from "../../../../../packages/hl-react/src/internal/websocket/live-orderbook";
import {orderbookPayload} from "../../../../../packages/hl-react/src/internal/websocket/orderbook";
const level=(px:number,sz=1)=>({px:String(px),sz:String(sz),n:1});
const book=(time:number,bids:number[],asks:number[]):L2BookWsEvent=>({coin:"BTC",time,levels:[bids.map(p=>level(p)),asks.map(p=>level(p))]});
afterEach(()=>vi.useRealTimers());
it("merges fresh top levels with only strictly deeper non-crossing snapshot levels",()=>{
 const deep=book(1,[100,99,98,97],[101,102,103,104,105,106,107]);const fast=book(2,[102,101,100],[103,104,105]);fast.levels[0][2].sz="2";
 const result=mergeOrderbook(fast,deep)!;
 expect(result.levels[0].map(l=>l.px)).toEqual(["102","101","100","99","98","97"]);expect(result.levels[1].map(l=>l.px)).toEqual(["103","104","105","106","107"]);expect(result.levels[0][2].sz).toBe("2");
 for(const levels of result.levels)expect(new Set(levels.map(l=>Number(l.px))).size).toBe(levels.length);
 expect(Math.max(...result.levels[0].map(l=>Number(l.px)))).toBeLessThan(Math.min(...result.levels[1].map(l=>Number(l.px))));
 expect(mergeOrderbook(fast,{...deep,time:3})).toEqual({...deep,time:3});expect(mergeOrderbook({...fast,levels:[[],fast.levels[1]]},deep)?.levels[0]).toEqual([]);
});
it("uses one fast subscription, WS depth posts, bbo spread and ignores late data after unsubscribe",async()=>{
 vi.useFakeTimers();let resolve!:(value:L2BookWsEvent)=>void;const callbacks:Record<string,(e:{detail:unknown})=>void>={};const unsubscribe=vi.fn(async()=>{});
 const request=vi.fn().mockResolvedValueOnce(book(1,[100,99,98,97,96,95],[101,102,103,104,105,106])).mockImplementation(()=>new Promise(r=>{resolve=r;}));
 const subscribe=vi.fn(async(channel:string,_payload:unknown,cb:(e:{detail:unknown})=>void)=>{callbacks[channel]=cb;return {unsubscribe,failureSignal:new AbortController().signal};});
 const listener=vi.fn(),sub=await subscribeLiveOrderbook({subscribe,request} as unknown as ISubscriptionTransport&IRequestTransport,orderbookPayload({coin:"BTC",nSigFigs:5}),listener);
 await vi.advanceTimersByTimeAsync(16);expect(listener.mock.calls[0][0].levels[0]).toHaveLength(6);expect(request.mock.calls[0][0]).toBe("info");expect(request.mock.calls[0][1]).toEqual({type:"l2Book",coin:"BTC",nSigFigs:5,mantissa:null});expect(subscribe).toHaveBeenCalledTimes(2);expect(subscribe.mock.calls[0][1]).toMatchObject({fast:true,coin:"BTC"});
 callbacks.l2Book({detail:{...book(2,[100],[101]),fast:false}});await vi.advanceTimersByTimeAsync(16);expect(listener).toHaveBeenCalledTimes(1);
 callbacks.l2Book({detail:{...book(3,[100],[101]),fast:true}});callbacks.bbo({detail:{coin:"BTC",time:4,bbo:[level(100),level(100.5)]}});await vi.advanceTimersByTimeAsync(16);expect(listener.mock.calls.at(-1)![0].spread).toBe("0.5");
 const repaints=listener.mock.calls.length;callbacks.bbo({detail:{coin:"BTC",time:5,bbo:[level(101),level(101.5)]}});await vi.advanceTimersByTimeAsync(16);expect(listener).toHaveBeenCalledTimes(repaints);
 await vi.advanceTimersByTimeAsync(2000);expect(request).toHaveBeenCalledTimes(2);await vi.advanceTimersByTimeAsync(4000);expect(request).toHaveBeenCalledTimes(2);
 await sub.unsubscribe();const count=listener.mock.calls.length;resolve(book(9,[100],[101]));callbacks.l2Book({detail:{...book(10,[100],[101]),fast:true}});await vi.advanceTimersByTimeAsync(4000);expect(listener).toHaveBeenCalledTimes(count);expect(unsubscribe).toHaveBeenCalledTimes(2);
});

it("keeps quote totals cumulative even when deeper bid prices fall",async()=>{const {withQuoteTotals,processLevels}=await import("@/lib/trade/orderbook");const rows=withQuoteTotals(processLevels([level(100,100),level(1,1)]));expect(rows.map(r=>r.total)).toEqual([100,101]);expect(rows.map(r=>r.quoteTotal)).toEqual([10000,10001]);});

it("refills depleted depth immediately and coalesces the fast update with the replacement snapshot",async()=>{
 vi.useFakeTimers();let receive!:(e:unknown)=>void;
 const full=(time:number,base:number)=>book(time,Array.from({length:20},(_,i)=>base-i),Array.from({length:20},(_,i)=>base+1+i));
 const request=vi.fn().mockResolvedValueOnce(full(1,100)).mockResolvedValue(full(3,200));
 const transport={request,subscribe:vi.fn(async(channel:string,_p:unknown,cb:(e:unknown)=>void)=>{if(channel==="l2Book")receive=cb;return {unsubscribe:async()=>{},failureSignal:new AbortController().signal};})};
 const listener=vi.fn(),sub=await subscribeLiveOrderbook(transport as unknown as ISubscriptionTransport&IRequestTransport,orderbookPayload({coin:"BTC"}),listener);
 await vi.advanceTimersByTimeAsync(600);receive({detail:{...book(2,[200,199,198,197,196],[201,202,203,204,205]),fast:true}});
 await vi.advanceTimersByTimeAsync(100);expect(request).toHaveBeenCalledTimes(2);expect(listener.mock.calls.every(([b])=>b.levels.every((side:unknown[])=>side.length===20))).toBe(true);
 await sub.unsubscribe();
});

it("does not paint a shortened frame while a slower depth refill is in flight",async()=>{
 vi.useFakeTimers();let receive!:(e:unknown)=>void,resolve!:(book:L2BookWsEvent)=>void;
 const full=(time:number,base:number)=>book(time,Array.from({length:20},(_,i)=>base-i),Array.from({length:20},(_,i)=>base+i+1));
 const request=vi.fn().mockResolvedValueOnce(full(1,100)).mockImplementation(()=>new Promise(r=>{resolve=r;}));
 const transport={request,subscribe:async(channel:string,_p:unknown,cb:(e:unknown)=>void)=>{if(channel==="l2Book")receive=cb;return {unsubscribe:async()=>{},failureSignal:new AbortController().signal};}};
 const listener=vi.fn(),sub=await subscribeLiveOrderbook(transport as unknown as ISubscriptionTransport&IRequestTransport,orderbookPayload({coin:"BTC"}),listener);
 await vi.advanceTimersByTimeAsync(600);receive({detail:{...book(2,[200,199,198,197,196],[201,202,203,204,205]),fast:true}});await vi.advanceTimersByTimeAsync(300);
 expect(listener.mock.calls.every(([b])=>b.levels.every((s:unknown[])=>s.length===20))).toBe(true);resolve(full(3,200));await vi.advanceTimersByTimeAsync(16);expect(listener.mock.calls.at(-1)![0].levels[0][0].px).toBe("200");await sub.unsubscribe();
});

it("does not flash a transient shallow snapshot between complete snapshots",async()=>{
 vi.useFakeTimers();let receive!:(e:unknown)=>void;const full=(t:number)=>book(t,Array.from({length:20},(_,i)=>100-i),Array.from({length:20},(_,i)=>101+i));
 const request=vi.fn().mockResolvedValueOnce(full(1)).mockResolvedValueOnce(book(2,[100],[101])).mockResolvedValue(full(4));
 const transport={request,subscribe:async(channel:string,_p:unknown,cb:(e:unknown)=>void)=>{if(channel==="l2Book")receive=cb;return {unsubscribe:async()=>{},failureSignal:new AbortController().signal};}};
 const listener=vi.fn(),sub=await subscribeLiveOrderbook(transport as unknown as ISubscriptionTransport&IRequestTransport,orderbookPayload({coin:"BTC"}),listener);
 await vi.advanceTimersByTimeAsync(1800);receive({detail:{...book(2,[100,99,98,97,96],[101,102,103,104,105]),fast:true}});await vi.advanceTimersByTimeAsync(300);receive({detail:{...book(3,[100,99,98,97,96],[101,102,103,104,105]),fast:true}});await vi.advanceTimersByTimeAsync(600);receive({detail:{...book(4,[100,99,98,97,96],[101,102,103,104,105]),fast:true}});await vi.advanceTimersByTimeAsync(100);
 expect(listener.mock.calls.every(([b])=>b.levels.every((s:unknown[])=>s.length===20))).toBe(true);await sub.unsubscribe();
});

it("eventually shows a genuinely thin book rather than retaining old depth indefinitely",async()=>{
 vi.useFakeTimers();let receive!:(e:unknown)=>void;
 const full=book(1,Array.from({length:20},(_,i)=>100-i),Array.from({length:20},(_,i)=>101+i));
 const transport={request:vi.fn().mockResolvedValueOnce(full).mockResolvedValue(book(2,[100],[101])),subscribe:async(channel:string,_p:unknown,cb:(e:unknown)=>void)=>{if(channel==="l2Book")receive=cb;return {unsubscribe:async()=>{},failureSignal:new AbortController().signal};}};
 const listener=vi.fn(),sub=await subscribeLiveOrderbook(transport as unknown as ISubscriptionTransport&IRequestTransport,orderbookPayload({coin:"BTC"}),listener);
 await vi.advanceTimersByTimeAsync(2100);expect(listener.mock.calls.at(-1)![0].levels[0]).toHaveLength(20);
 await vi.advanceTimersByTimeAsync(1700);receive({detail:{...book(3,[100],[101]),fast:true}});await vi.advanceTimersByTimeAsync(16);expect(listener.mock.calls.at(-1)![0].levels[0]).toHaveLength(1);await sub.unsubscribe();
});
