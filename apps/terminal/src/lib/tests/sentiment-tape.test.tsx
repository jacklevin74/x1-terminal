// @vitest-environment jsdom
import {act,createElement} from "react";
import {createRoot} from "react-dom/client";
import {beforeEach,expect,it,vi} from "vitest";
import {SentimentTape} from "@/components/trade/header/sentiment-tape";
const state=vi.hoisted(()=>({query:{data:undefined as undefined|{coins:{coin:string;score:number|null;label?:string}[];timestamp:number},dataUpdatedAt:0,isError:false,refetch:vi.fn()}}));
vi.mock("@/lib/auto-trader/hooks",()=>({useAutoTraderSignal:()=>state.query}));
beforeEach(()=>{state.query.data=undefined;state.query.isError=false;state.query.refetch.mockClear();});
it("renders every API asset with its label and signed score, keeping the animation duplicate hidden",async()=>{
 state.query.data={timestamp:Date.now(),coins:[{coin:"BTC",score:-27,label:"Bearish"},{coin:"xyz:MU",score:-71,label:"Strong bearish"},{coin:"HYPE",score:31,label:"Bullish"},{coin:"xyz:NEW",score:null}]};
 const node=document.createElement("div"),root=createRoot(node);await act(async()=>root.render(createElement(SentimentTape)));
 const group=node.querySelector('ul:not([aria-hidden])')!;expect(group.children).toHaveLength(4);expect(group.textContent).toContain("Strong bearish");expect(group.textContent).toContain("+31");expect(group.textContent).toContain("NEW");expect(group.textContent).toContain("Unavailable");expect(node.querySelector('ul[aria-hidden="true"]')).not.toBeNull();
 const pause=node.querySelector<HTMLButtonElement>('[aria-label="Pause sentiment tape"]')!;await act(async()=>pause.click());expect(node.querySelector('section')?.dataset.paused).toBe("true");expect(pause.getAttribute("aria-label")).toBe("Resume sentiment tape");await act(async()=>root.unmount());
});
it("shows loading and unavailable states without invented scores and allows retry",async()=>{
 const node=document.createElement("div"),root=createRoot(node);await act(async()=>root.render(createElement(SentimentTape)));expect(node.textContent).toContain("Loading sentiment");expect(node.querySelector('ul')).toBeNull();
 state.query.isError=true;await act(async()=>root.render(createElement(SentimentTape)));expect(node.textContent).toContain("Sentiment unavailable");await act(async()=>[...node.querySelectorAll('button')].at(-1)!.click());expect(state.query.refetch).toHaveBeenCalledOnce();await act(async()=>root.unmount());
});
it("marks stale cached data and keeps it visible when refresh fails",async()=>{
 state.query.data={timestamp:Date.now()-660000,coins:[{coin:"BTC",score:0,label:"Neutral"}]};state.query.isError=true;
 const node=document.createElement("div"),root=createRoot(node);await act(async()=>root.render(createElement(SentimentTape)));expect(node.textContent).toContain("Stale");expect(node.textContent).toContain("Neutral");await act(async()=>root.unmount());
});
