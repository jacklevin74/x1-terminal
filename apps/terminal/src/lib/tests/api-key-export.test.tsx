// @vitest-environment jsdom
import {act,createElement,type ReactNode} from "react";
import {createRoot} from "react-dom/client";
import {expect,it,vi,afterEach} from "vitest";
import {ApiKeyExport} from "@/components/api-wallets/api-key-export";
import {privateKeyToAccount} from "viem/accounts";
vi.mock("@hypeterminal/ui",()=>{const tag=({children}:{children:ReactNode})=>createElement("div",null,children);return {Modal:tag,ModalPopup:tag,ModalHeader:tag,ModalTitle:tag,ModalContent:tag};});
afterEach(()=>{vi.restoreAllMocks();vi.unstubAllGlobals();});
const key=`0x${"11".repeat(32)}` as const,agent=privateKeyToAccount(key).address,owner=`0x${"ab".repeat(20)}` as const;
function button(node:HTMLElement,label:string){return [...node.querySelectorAll("button")].find(b=>b.textContent===label)!;}
it("requires acknowledgement before revealing and copies only the matching API key",async()=>{
 const copy=vi.fn().mockResolvedValue(undefined);Object.defineProperty(navigator,"clipboard",{configurable:true,value:{writeText:copy}});const saved=vi.fn();const node=document.createElement("div"),root=createRoot(node);await act(async()=>root.render(createElement(ApiKeyExport,{owner,agent,network:"Mainnet",resolveKey:()=>key,onClose:vi.fn(),onSaved:saved})));
 expect(node.querySelector("textarea")).toBeNull();expect(button(node,"Reveal private key").disabled).toBe(true);expect(copy).not.toHaveBeenCalled();await act(async()=>node.querySelector<HTMLInputElement>('input[type="checkbox"]')!.click());await act(async()=>button(node,"Reveal private key").click());expect(node.querySelector("textarea")?.value).toBe(key);
 await act(async()=>button(node,"Copy private key").click());expect(copy).toHaveBeenCalledWith(key);expect(saved).toHaveBeenCalledTimes(1);
 await act(async()=>window.dispatchEvent(new Event("blur")));expect(node.querySelector("textarea")).toBeNull();expect(button(node,"Reveal private key").disabled).toBe(true);await act(async()=>root.unmount());
});
it("refuses to reveal a key that does not match the selected API wallet",async()=>{
 const node=document.createElement("div"),root=createRoot(node);await act(async()=>root.render(createElement(ApiKeyExport,{owner,agent:owner,network:"Mainnet",resolveKey:()=>key,onClose:vi.fn(),onSaved:vi.fn()})));await act(async()=>node.querySelector<HTMLInputElement>('input[type="checkbox"]')!.click());await act(async()=>button(node,"Reveal private key").click());expect(node.querySelector("textarea")).toBeNull();expect(node.querySelector('[role="alert"]')?.textContent).toContain("API wallet changed");await act(async()=>root.unmount());
});
