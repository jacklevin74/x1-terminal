// @vitest-environment jsdom
import {afterEach,expect,it,vi} from "vitest";
import type {Bar,LibrarySymbolInfo,ResolutionString} from "@/types/charting_library";
const state=vi.hoisted(()=>({snapshot:vi.fn(),last:undefined as Bar|undefined,tick:undefined as ((b:Bar)=>void)|undefined}));
vi.mock("@/lib/hyperliquid",()=>({getInfoClient:()=>({candleSnapshot:state.snapshot}),getDexFromName:()=>undefined,getMarketKindFromName:()=>"perp"}));
vi.mock("@/lib/chart/store",()=>({streamKey:(coin:string,interval:string)=>`${coin}:${interval}`,getCandleStore:()=>({getState:()=>({subscribe:(_k:string,_c:string,_i:string,_id:string,tick:(b:Bar)=>void)=>{state.tick=tick;},unsubscribe:()=>{},setLastBar:(_key:string,b:Bar)=>{state.last=b;},getLastBar:()=>state.last,streams:{}})})}));
import {createDatafeed} from "@/components/trade/chart/datafeed";
afterEach(()=>{vi.useRealTimers();vi.restoreAllMocks();state.last=undefined;state.snapshot.mockReset();});
it("reconciles the focused chart but ignores a snapshot raced by live data or unsubscription",async()=>{
 vi.useFakeTimers();vi.setSystemTime(120000);vi.spyOn(document,"visibilityState","get").mockReturnValue("visible");
 let resolve!:(value:unknown)=>void;state.snapshot.mockImplementation(()=>new Promise(r=>{resolve=r;}));
 const feed=createDatafeed(),tick=vi.fn();feed.subscribeBars({name:"BTC",ticker:"BTC"} as LibrarySymbolInfo,"1" as ResolutionString,tick,"focus-test",()=>{});
 window.dispatchEvent(new Event("focus"));await vi.advanceTimersByTimeAsync(0);expect(state.snapshot).toHaveBeenCalledTimes(1);
 const candle={t:60000,o:"10",h:"12",l:"9",c:"11",v:"1"};resolve([candle]);await vi.advanceTimersByTimeAsync(0);expect(tick).toHaveBeenLastCalledWith(expect.objectContaining({time:60000,close:11}));
 await vi.advanceTimersByTimeAsync(15000);state.tick!({time:60000,open:10,high:14,low:9,close:14,volume:2});resolve([candle]);await vi.advanceTimersByTimeAsync(0);expect(state.last?.close).toBe(14);
 await vi.advanceTimersByTimeAsync(15000);feed.unsubscribeBars("focus-test");const count=tick.mock.calls.length;resolve([{...candle,c:"12"}]);await vi.advanceTimersByTimeAsync(0);expect(tick).toHaveBeenCalledTimes(count);
});
