// @vitest-environment jsdom
import {act,type ReactNode} from "react";
import {createRoot} from "react-dom/client";
import {afterEach,expect,it,vi} from "vitest";
import {TargetPreviewTable} from "@/components/auto-trader/target-preview-table";
import {targetRows} from "@/lib/auto-trader/targets";
import {AUTO_TRADER_DEFAULTS} from "@/config/auto-trader";
vi.mock("@hypeterminal/ui",()=>({Tooltip:({children}:{children:ReactNode})=>children}));
const rows=(equity:number)=>targetRows({equity,settings:{...AUTO_TRADER_DEFAULTS,leverage:1,include:["BTC"]},signal:{coins:[{coin:"BTC",score:100}],timestamp:null},current:{}});
const props={minOrderUsd:10,unsaved:false,executionNote:"Preview only."};
let cleanup:(()=>Promise<void>)|undefined;
afterEach(async()=>{await cleanup?.();cleanup=undefined;});
function setup(){const host=document.createElement("div");document.body.append(host);const root=createRoot(host);cleanup=async()=>{await act(async()=>root.unmount());host.remove();};return {host,root};}
it("keeps the same table and rows while refresh data is unavailable, then updates values in place",async()=>{
 const {host,root}=setup();await act(async()=>root.render(<TargetPreviewTable {...props} rows={rows(100)} />));
 const table=host.querySelector("table"),row=host.querySelector("tbody tr");expect(table?.textContent).toContain("$100.00");
 await act(async()=>root.render(<TargetPreviewTable {...props} rows={null} refreshing />));
 expect(host.querySelector("table")).toBe(table);expect(host.querySelector("tbody tr")).toBe(row);expect(table?.textContent).toContain("$100.00");expect(host.textContent).toContain("last available preview");
 await act(async()=>root.render(<TargetPreviewTable {...props} rows={rows(200)} />));
 expect(host.querySelector("table")).toBe(table);expect(host.querySelector("tbody tr")).toBe(row);expect(table?.textContent).toContain("$200.00");expect(host.textContent).not.toContain("last available preview");
});
it("does not invent rows before the initial snapshot or reuse another account's preview",async()=>{
 const {host,root}=setup();await act(async()=>root.render(<TargetPreviewTable key="account-a" {...props} rows={null} />));expect(host.querySelector("table")).toBeNull();expect(host.textContent).toContain("Waiting for valid settings");
 await act(async()=>root.render(<TargetPreviewTable key="account-a" {...props} rows={rows(100)} />));expect(host.querySelector("table")).not.toBeNull();
 await act(async()=>root.render(<TargetPreviewTable key="account-b" {...props} rows={null} />));expect(host.querySelector("table")).toBeNull();expect(host.textContent).not.toContain("$100.00");
});
