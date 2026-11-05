// @vitest-environment jsdom
import {act,type ReactNode} from "react";
import {createRoot} from "react-dom/client";
import {afterEach,expect,it,vi} from "vitest";
import {UserMenu} from "@/components/trade/header/user-menu";
import {useTradingAccountStore} from "@/stores/use-trading-account-store";
const state=vi.hoisted(()=>({owner:`0x${"ab".repeat(20)}` as `0x${string}`,sub:`0x${"12".repeat(20)}` as `0x${string}`,reset:vi.fn(),mutating:0}));
vi.mock("wagmi",()=>({useConnection:()=>({address:state.owner,isConnected:true,connector:{id:"rabby",name:"Rabby Wallet"}}),useDisconnect:()=>({mutate:vi.fn()})}));
vi.mock("@tanstack/react-query",()=>({useIsMutating:()=>state.mutating}));
vi.mock("@/stores/use-order-entry-store",()=>({useOrderEntryActions:()=>({resetForm:state.reset})}));
vi.mock("@/lib/hyperliquid",()=>({removeAgentFromStorage:vi.fn(),useInfo:()=>({data:[{master:state.owner,name:"Ledger bot",subAccountUser:state.sub},{master:state.sub,name:"Other owner",subAccountUser:`0x${"34".repeat(20)}`}],refetch:vi.fn()})}));
vi.mock("@/components/trade/components/account-mode-control",()=>({AccountModeControl:()=>null}));
vi.mock("@/components/trade/components/wallet-modal",()=>({WalletModal:()=>null}));
vi.mock("@/components/trade/components/export-key-modal",()=>({ExportKeyModal:()=>null}));
vi.mock("@hypeterminal/ui",()=>({Button:()=>null,Dropdown:({trigger,items}:{trigger:ReactNode;items:{label:string;disabled?:boolean;onSelect?:()=>void}[]})=><div><span data-trigger>{trigger}</span>{items.map(item=><button key={item.label} disabled={item.disabled} onClick={item.onSelect}>{item.label}</button>)}</div>}));
afterEach(()=>{useTradingAccountStore.getState().select(null);state.mutating=0;state.reset.mockClear();});
it("selects the owner's subaccount from the top-right menu and returns to main",async()=>{
 const host=document.createElement("div");document.body.append(host);const root=createRoot(host);await act(async()=>root.render(<UserMenu />));
 expect(host.textContent).not.toContain("Other owner");
 await act(async()=>[...host.querySelectorAll("button")].find(b=>b.textContent?.includes("Ledger bot"))!.click());
 expect(host.querySelector('[data-trigger]')?.textContent).toContain("Ledger bot");expect(useTradingAccountStore.getState().selection?.address).toBe(state.sub);expect(state.reset).toHaveBeenCalledOnce();
 await act(async()=>[...host.querySelectorAll("button")].find(b=>b.textContent?.includes("Main account"))!.click());expect(useTradingAccountStore.getState().selection).toBeNull();expect(host.querySelector('[data-trigger]')?.textContent).toContain("Rabby");
 await act(async()=>root.unmount());host.remove();
});
it("disables account switching while an operation is pending",async()=>{
 state.mutating=1;const host=document.createElement("div");const root=createRoot(host);await act(async()=>root.render(<UserMenu />));
 const buttons=[...host.querySelectorAll("button")].filter(b=>b.textContent?.includes("Main account")||b.textContent?.includes("Ledger bot"));expect(buttons).toHaveLength(2);expect(buttons.every(b=>b.disabled)).toBe(true);await act(async()=>root.unmount());
});
