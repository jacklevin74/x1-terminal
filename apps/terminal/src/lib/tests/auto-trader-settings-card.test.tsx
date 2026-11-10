// @vitest-environment jsdom
import {act,useState,type ReactNode} from "react";
import {createRoot} from "react-dom/client";
import {afterEach,expect,it,vi} from "vitest";
import {SettingsCard} from "@/components/auto-trader/settings-card";
import {AUTO_TRADER_DEFAULTS} from "@/config/auto-trader";
import type {AutoTraderSettings} from "@/lib/auto-trader/types";
vi.mock("@lingui/react/macro",()=>({Trans:({children}:{children:ReactNode})=>children}));
vi.mock("@hypeterminal/ui",()=>({Tooltip:({children}:{children:ReactNode})=>children}));
let cleanup:(()=>Promise<void>)|undefined;
afterEach(async()=>{await cleanup?.();cleanup=undefined;});
async function setup(disabled=false){
 const node=document.createElement("div");document.body.append(node);const root=createRoot(node),changed=vi.fn();
 function Form(){const [value,setValue]=useState<AutoTraderSettings>({...AUTO_TRADER_DEFAULTS,include:["BTC","xyz:SAVED"]});return <SettingsCard markets={["BTC","xyz:SOXL"]} value={value} disabled={disabled} onChange={next=>{changed(next);setValue(next);}} />;}
 cleanup=async()=>{await act(async()=>root.unmount());node.remove();};await act(async()=>root.render(<Form/>));
 const checkbox=(coin:string)=>[...node.querySelectorAll('label')].find(l=>l.textContent?.startsWith(coin))!.querySelector<HTMLInputElement>('input')!;
 return {node,checkbox,changed};
}
it("lets users enable API assets outside the executor snapshot and pending XRP",async()=>{
 const {node,checkbox,changed}=await setup();
 expect(checkbox("xyz:SOXL").disabled).toBe(false);expect(checkbox("XRP").disabled).toBe(false);
 expect(checkbox("xyz:SAVED").checked).toBe(true);
 await act(async()=>checkbox("xyz:SOXL").click());await act(async()=>checkbox("XRP").click());
 expect(checkbox("xyz:SOXL").checked).toBe(true);expect(checkbox("XRP").checked).toBe(true);
 expect(changed.mock.calls.at(-1)![0].include).toEqual(expect.arrayContaining(["BTC","xyz:SOXL","XRP","xyz:SAVED"]));
 expect(changed.mock.calls.at(-1)![0].include).toHaveLength(4);
 expect(node.textContent).toContain("Executor support pending");expect(node.textContent).toContain("Awaiting signal API");
});
it("keeps fieldset-level in-flight protection",async()=>{
 const {node,checkbox,changed}=await setup(true);expect(node.querySelector('fieldset')?.disabled).toBe(true);
 await act(async()=>checkbox("xyz:SOXL").click());expect(changed).not.toHaveBeenCalled();
});

it("shows the default blend and updates only flowPct from the slider",async()=>{
 const {node,changed}=await setup();
 const slider=node.querySelector<HTMLInputElement>('[aria-label="Auto Trader flow weight"]')!;
 expect(slider.value).toBe("40");expect(slider.min).toBe("0");expect(slider.max).toBe("40");expect(slider.step).toBe("1");
 const set=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,"value")!.set!;
 await act(async()=>{set.call(slider,"20");slider.dispatchEvent(new Event("input",{bubbles:true}));slider.dispatchEvent(new Event("change",{bubbles:true}));});
 expect(changed.mock.calls.at(-1)![0]).toMatchObject({...AUTO_TRADER_DEFAULTS,flowPct:20,include:["BTC","xyz:SAVED"]});
 expect(slider.getAttribute("aria-valuetext")).toBe("80% positions, 20% six-hour flow");
 const reset=[...node.querySelectorAll('button')].find(b=>b.textContent==='Reset to 60 / 40')!;
 await act(async()=>reset.click());expect(slider.value).toBe("40");
});
