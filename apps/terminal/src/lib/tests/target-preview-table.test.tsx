// @vitest-environment jsdom
import {act,type ReactNode} from "react";
import {createRoot} from "react-dom/client";
import {afterEach,expect,it,vi} from "vitest";
import {TargetPreviewTable} from "@/components/auto-trader/target-preview-table";
import type {ExecutorCycle} from "@/lib/auto-trader/executor-cycle";

vi.mock("@hypeterminal/ui",()=>({Tooltip:({children}:{children:ReactNode})=>children}));
const snapshot=(targetUsd:number):ExecutorCycle=>({account:"account-a",cycleTs:Date.now(),equity:100,targetLeverage:3,k:null,scale:null,heldNeutrals:null,grossBeforeCap:null,grossAfterCap:null,rows:[{market:"BTC",score:null,targetUsd,currentUsd:100,gapUsd:null,action:"HOLD_NEUTRAL",reason:"Executor decision"}]});
const props={account:"account-a"};
let cleanup:(()=>Promise<void>)|undefined;
afterEach(async()=>{await cleanup?.();cleanup=undefined;});
function setup(){const host=document.createElement("div");document.body.append(host);const root=createRoot(host);cleanup=async()=>{await act(async()=>root.unmount());host.remove();};return {host,root};}
it("keeps the same table and rows while refresh data is unavailable, then updates values in place",async()=>{
 const {host,root}=setup();await act(async()=>root.render(<TargetPreviewTable {...props} snapshot={snapshot(100)} />));
 const table=host.querySelector("table"),row=host.querySelector("tbody tr");expect(table?.textContent).toContain("$100.00");
 await act(async()=>root.render(<TargetPreviewTable {...props} snapshot={null} refreshing />));
 expect(host.querySelector("table")).toBe(table);expect(host.querySelector("tbody tr")).toBe(row);expect(table?.textContent).toContain("$100.00");expect(host.textContent).toContain("Refreshing executor cycle");
 await act(async()=>root.render(<TargetPreviewTable {...props} snapshot={snapshot(200)} />));
 expect(host.querySelector("table")).toBe(table);expect(host.querySelector("tbody tr")).toBe(row);expect(table?.textContent).toContain("$200.00");expect(host.textContent).not.toContain("Refreshing executor cycle");
});
it("does not invent rows before the initial snapshot or reuse another account's preview",async()=>{
 const {host,root}=setup();await act(async()=>root.render(<TargetPreviewTable key="account-a" {...props} snapshot={null} />));expect(host.querySelector("table")).toBeNull();expect(host.textContent).toContain("No recent executor cycle");
 await act(async()=>root.render(<TargetPreviewTable key="account-a" {...props} snapshot={snapshot(100)} />));expect(host.querySelector("table")).not.toBeNull();
 await act(async()=>root.render(<TargetPreviewTable {...props} account="account-b" snapshot={null} />));expect(host.querySelector("table")).toBeNull();expect(host.textContent).not.toContain("$100.00");
});

it("hides data when unavailable or older than fifteen minutes",async()=>{
 const {host,root}=setup();const cycle=snapshot(123);cycle.cycleTs-=16*60*1000;
 await act(async()=>root.render(<TargetPreviewTable {...props} snapshot={cycle}/>));expect(host.querySelector("table")).toBeNull();
 await act(async()=>root.render(<TargetPreviewTable {...props} snapshot={snapshot(123)} unavailable/>));expect(host.querySelector("table")).toBeNull();expect(host.textContent).toContain("No recent executor cycle");
});

it("does not replace a newer cycle with a late older response",async()=>{
 const {host,root}=setup();const newer=snapshot(200),older=snapshot(100);older.cycleTs=newer.cycleTs-300000;
 await act(async()=>root.render(<TargetPreviewTable {...props} snapshot={newer}/>));
 await act(async()=>root.render(<TargetPreviewTable {...props} snapshot={older}/>));
 expect(host.querySelector("table")?.textContent).toContain("$200.00");
 expect(host.querySelectorAll("tbody td")[2].textContent).toBe("$200.00");
});
it("shows a successful API check separately from an old executor timestamp",async()=>{
 const {host,root}=setup();const old=snapshot(123);old.cycleTs-=7*60*1000;
 await act(async()=>root.render(<TargetPreviewTable {...props} snapshot={old} checkedAt={Date.now()}/>));
 expect(host.textContent).toContain("API last checked:");expect(host.textContent).toContain("latest API cycle is 7 minutes old");expect(host.querySelector("table")).not.toBeNull();
});
