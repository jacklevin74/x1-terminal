// @vitest-environment jsdom
import { act, createElement, type ReactNode } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, expect, it, vi } from "vitest";
import { EditOrderModal } from "@/components/trade/positions/edit-order-modal";
import type { OpenOrder } from "@/lib/trade/open-orders";
const state=vi.hoisted(()=>({modify:vi.fn(),close:vi.fn(),address:"0xowner"}));
vi.mock("sonner",()=>({toast:{success:vi.fn()}}));
vi.mock("@/hooks/use-trading-account",()=>({useTradingAccount:()=>({address:state.address})}));
vi.mock("@/lib/hyperliquid",()=>({useMarkets:()=>({getMarket:()=>({assetId:0,szDecimals:3,kind:"perp",shortName:"BTC"})}),useUserPositions:()=>({getPosition:()=>({szi:"3"})}),useExchange:()=>({mutateAsync:state.modify,isPending:false})}));
vi.mock("@/components/ui/number-input",()=>({NumberInput:({label,onChange,...props}:any)=>createElement("label",null,label,createElement("input",{...props,onInput:onChange}))}));
vi.mock("@hypeterminal/ui",()=>{
 const block=({children}: {children:ReactNode})=>createElement("div",null,children);
 return {Modal:block,ModalPopup:block,ModalHeader:block,ModalTitle:block,ModalContent:block,ModalFooter:block,Button:({children,variant,size,...props}:any)=>createElement("button",props,children)};
});
const order={timestamp:1,triggerCondition:"N/A",triggerPx:"0",oid:1,coin:"BTC",side:"A",limitPx:"100",sz:"2",origSz:"3",reduceOnly:false,tif:"Alo",orderType:"Limit",isTrigger:false,isPositionTpsl:false,children:[],cloid:null} as OpenOrder;
let root:ReturnType<typeof createRoot>;
afterEach(async()=>{await act(async()=>root?.unmount());vi.clearAllMocks();state.address="0xowner";});
it("edits notional through the existing modify client and only closes after acceptance",async()=>{
 const node=document.createElement("div");root=createRoot(node);state.modify.mockResolvedValue({status:"ok"});
 await act(async()=>root.render(createElement(EditOrderModal,{order,field:"value",onClose:state.close})));
 const input=node.querySelector("input")!;
 await act(async()=>{Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,"value")!.set!.call(input,"150");input.dispatchEvent(new Event("input",{bubbles:true}));});
 await act(async()=>[...node.querySelectorAll("button")].find(b=>b.textContent==="Update order")!.click());
 expect(state.modify).toHaveBeenCalledWith({oid:1,order:{a:0,b:false,p:"100",s:"1.5",r:false,t:{limit:{tif:"Alo"}}}});
 expect(state.close).toHaveBeenCalledOnce();
});
it("blocks stale or switched-account edits before any request",async()=>{
 const node=document.createElement("div");root=createRoot(node);
 await act(async()=>root.render(createElement(EditOrderModal,{order,field:"amount",onClose:state.close})));
 state.address="0xother";
 await act(async()=>root.render(createElement(EditOrderModal,{order,field:"amount",onClose:state.close})));
 expect(node.querySelector('[role="alert"]')?.textContent).toContain("account changed");
 expect([...node.querySelectorAll("button")].find(b=>b.textContent==="Update order")?.disabled).toBe(true);
 expect(state.modify).not.toHaveBeenCalled();
});
it("leaves the editor open and displays exchange rejection",async()=>{
 const node=document.createElement("div");root=createRoot(node);state.modify.mockResolvedValue({status:"err",response:"insufficient margin"});
 await act(async()=>root.render(createElement(EditOrderModal,{order,field:"amount",onClose:state.close})));
 await act(async()=>[...node.querySelectorAll("button")].find(b=>b.textContent==="Update order")!.click());
 expect(node.querySelector('[role="alert"]')?.textContent).toBe("insufficient margin");expect(state.close).not.toHaveBeenCalled();
});

it("edits limit price through modify while keeping remaining size",async()=>{
 const node=document.createElement("div");root=createRoot(node);state.modify.mockResolvedValue({status:"ok"});
 await act(async()=>root.render(createElement(EditOrderModal,{order,field:"price",onClose:state.close})));
 const input=node.querySelector('input[aria-label="New limit price"]')!;
 await act(async()=>{Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,"value")!.set!.call(input,"101.5");input.dispatchEvent(new Event("input",{bubbles:true}));});
 await act(async()=>[...node.querySelectorAll("button")].find(b=>b.textContent==="Update order")!.click());
 expect(state.modify).toHaveBeenCalledWith({oid:1,order:{a:0,b:false,p:"101.5",s:"2",r:false,t:{limit:{tif:"Alo"}}}});
 expect(state.close).toHaveBeenCalledOnce();
});
