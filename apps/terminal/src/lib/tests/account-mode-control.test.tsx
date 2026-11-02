// @vitest-environment jsdom
import { act, createElement, type ReactNode } from "react";
import { createRoot } from "react-dom/client";
import { expect, it, vi } from "vitest";
import { AccountModeControl } from "@/components/trade/components/account-mode-control";
const state=vi.hoisted(()=>({mode:"unifiedAccount",address:`0x${"cd".repeat(20)}`,send:vi.fn(),refetch:vi.fn()}));
vi.mock("wagmi",()=>({useConnection:()=>({address:state.address,isConnected:true})}));
vi.mock("@/stores/use-global-settings-store",()=>({useIsTestnet:()=>false}));
vi.mock("@tanstack/react-query",()=>({useQuery:()=>({data:state.mode,isError:false,refetch:state.refetch})}));
vi.mock("@/lib/hyperliquid",()=>({getInfoClient:()=>({}),useExchange:()=>({mutateAsync:state.send,isPending:false})}));
vi.mock("@hypeterminal/ui",()=>{
 const Wrap=({children}:{children:ReactNode})=>createElement("div",null,children);
 return {Button:({children,...props}:{children:ReactNode})=>createElement("button",props,children),Modal:({open,children}:{open:boolean;children:ReactNode})=>open?createElement("div",null,children):null,ModalContent:Wrap,ModalHeader:Wrap,ModalDescription:Wrap,ModalTitle:Wrap,ModalPopup:Wrap};
});
it("shows Unified and requires an explicit action before switching to Manual",async()=>{
 state.mode="unifiedAccount";state.send.mockReset();state.refetch.mockReset();state.send.mockImplementation(async()=>{state.mode="disabled";});
 const node=document.createElement("div");const root=createRoot(node);
 await act(async()=>root.render(createElement(AccountModeControl)));
 expect(node.textContent).toContain("Mode: Unified");expect(state.send).not.toHaveBeenCalled();
 await act(async()=>node.querySelector<HTMLButtonElement>('button[aria-label="Account mode: Unified"]')!.click());
 expect(node.textContent).toContain("Separate spot and perps balances");expect(state.send).not.toHaveBeenCalled();
 await act(async()=>[...node.querySelectorAll("button")].find(b=>b.textContent==="Switch to Manual")!.click());
 expect(state.send).toHaveBeenCalledExactlyOnceWith({user:state.address,abstraction:"disabled"});
 expect(node.textContent).toContain("Mode: Manual");expect(node.textContent).toContain("Manual mode is active.");
 await act(async()=>root.unmount());
});
it("supports Manual to Unified and reports a rejected signature without changing the mode",async()=>{
 state.mode="default";state.send.mockReset();state.send.mockRejectedValueOnce(new Error("User rejected signature"));
 const node=document.createElement("div");const root=createRoot(node);
 await act(async()=>root.render(createElement(AccountModeControl)));
 expect(node.textContent).toContain("Mode: Manual");
 await act(async()=>node.querySelector<HTMLButtonElement>('button[aria-label="Account mode: Manual"]')!.click());
 await act(async()=>[...node.querySelectorAll("button")].find(b=>b.textContent==="Switch to Unified")!.click());
 expect(state.send).toHaveBeenCalledWith({user:state.address,abstraction:"unifiedAccount"});
 expect(node.querySelector('[role="alert"]')?.textContent).toContain("User rejected signature");
 expect(node.textContent).toContain("Mode: Manual");expect(node.querySelector('[role="status"]')).toBeNull();
 await act(async()=>root.unmount());
});
