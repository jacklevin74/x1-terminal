// @vitest-environment jsdom
import { act, createElement, type ReactNode } from "react";
import { createRoot } from "react-dom/client";
import { it, expect, vi } from "vitest";
import { X1Setup } from "@/components/trade/components/x1-setup";
const state=vi.hoisted(()=>({wallet:true,register:vi.fn().mockResolvedValue("0xagent")}));
vi.mock("wagmi",()=>({useConnection:()=>({address:"0x123",connector:{id:"x1"}}),useWalletClient:()=>({data:state.wallet?{}:undefined})}));
vi.mock("@/lib/hyperliquid",()=>({useAgentStatus:()=>({isReady:false,needsAgent:true,needsBuilderFee:true,isLoading:false}),useAgentRegistration:()=>({register:state.register,status:"idle",error:null})}));
vi.mock("@/config/hyperliquid",()=>({BUILDER_CONFIGURED:true}));
vi.mock("@/stores/use-global-settings-store",()=>({useIsTestnet:()=>false}));
vi.mock("@/components/trade/components/wallet-modal",()=>({WalletModal:({open}:{open:boolean})=>open?createElement("p",null,"Wallet connection"):null}));
vi.mock("@hypeterminal/ui",()=>{
 const tag=({children}:{children:ReactNode})=>createElement("div",null,children);
 return {Modal:({open,children}:{open:boolean;children:ReactNode})=>open?children:null,ModalPopup:tag,ModalContent:tag,ModalHeader:tag,ModalTitle:tag};
});
it("shows explicit approval on trade request and only signs after user clicks",async()=>{
 state.wallet=true;state.register.mockClear();const node=document.createElement("div"),root=createRoot(node);
 await act(async()=>root.render(createElement(X1Setup)));
 await act(async()=>window.dispatchEvent(new Event("x1:setup")));
 expect(node.textContent).toContain("Approve trading");expect(node.textContent).toContain("saved on this device");expect(state.register).not.toHaveBeenCalled();
 await act(async()=>node.querySelector("button")!.click());expect(state.register).toHaveBeenCalledTimes(1);
 await act(async()=>root.unmount());
});
it("offers wallet reconnection instead of a dead approval button",async()=>{
 state.wallet=false;const node=document.createElement("div"),root=createRoot(node);
 await act(async()=>root.render(createElement(X1Setup)));await act(async()=>window.dispatchEvent(new Event("x1:setup")));
 expect(node.textContent).toContain("Unlock and connect");const button=node.querySelector("button")!;expect(button.disabled).toBe(false);
 await act(async()=>button.click());expect(node.textContent).toContain("Wallet connection");await act(async()=>root.unmount());
});
