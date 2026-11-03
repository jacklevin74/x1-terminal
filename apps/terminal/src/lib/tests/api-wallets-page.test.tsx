// @vitest-environment jsdom
import {act,createElement} from "react";
import {createRoot} from "react-dom/client";
import {afterEach,expect,it,vi} from "vitest";
import {ApiWalletsPage} from "@/components/api-wallets/api-wallets-page";
const state=vi.hoisted(()=>({agents:[] as {name:string;address:string;validUntil:number}[],approve:vi.fn().mockResolvedValue({status:"ok"}),fee:50}));
vi.mock("@/components/api-wallets/auto-trader-controls",()=>({AutoTraderControls:()=>createElement("span",null,"Start Auto Trader · Stop Auto Trader")}));
vi.mock("@/components/auto-trader/auto-trader-panel",()=>({AutoTraderPanel:()=>null}));
vi.mock("wagmi",()=>({useConnection:()=>({address:`0x${"ab".repeat(20)}`}),useWalletClient:()=>({data:{}})}));
vi.mock("@/config/hyperliquid",()=>({BUILDER_CONFIGURED:true,DEFAULT_BUILDER_CONFIG:{b:`0x${"ef".repeat(20)}`,f:50}}));
vi.mock("@/components/trade/header/user-menu",()=>({UserMenu:()=>null}));
vi.mock("@/lib/hyperliquid",()=>({useHyperliquid:()=>({env:"Mainnet"}),useInfo:(method:string)=>({data:method==="extraAgents"?state.agents:state.fee,refetch:async()=>({data:method==="extraAgents"?state.agents:state.fee}),isLoading:false,isError:false}),useExchange:()=>({mutateAsync:state.approve}),readAgentFromStorage:()=>null,removeAgentFromStorage:vi.fn()}));
afterEach(()=>{vi.restoreAllMocks();vi.unstubAllGlobals();state.approve.mockClear();state.agents=[];});
function downloads(){class TestURL extends URL {static createObjectURL(){return "blob:test";}static revokeObjectURL(){}}vi.stubGlobal("URL",TestURL);vi.spyOn(HTMLAnchorElement.prototype,"click").mockImplementation(()=>{});}
function button(node:HTMLElement,label:string){return [...node.querySelectorAll("button")].find(b=>b.textContent===label)!;}
it("generates locally, requires saving the key, and authorizes only after explicit action",async()=>{
 downloads();const node=document.createElement("div"),root=createRoot(node);await act(async()=>root.render(createElement(ApiWalletsPage)));
 expect(state.approve).not.toHaveBeenCalled();await act(async()=>button(node,"Generate").click());expect(button(node,"Authorize API Wallet").disabled).toBe(true);expect(node.querySelector<HTMLInputElement>('[aria-label="Generated API private key"]')?.type).toBe("password");
 await act(async()=>button(node,"Save .env.agent").click());expect(button(node,"Authorize API Wallet").disabled).toBe(false);await act(async()=>button(node,"Authorize API Wallet").click());
 expect(state.approve).toHaveBeenCalledTimes(1);expect(state.approve).toHaveBeenCalledWith(expect.objectContaining({agentName:expect.stringMatching(/^X1 Bot valid_until \d+$/)}));expect(node.textContent).toContain("API wallet authorized");await act(async()=>root.unmount());
});
it("requires confirmation before revoking the selected API wallet",async()=>{
 state.agents=[{name:"External Bot",address:`0x${"cd".repeat(20)}`,validUntil:Date.now()+60000}];const node=document.createElement("div"),root=createRoot(node);await act(async()=>root.render(createElement(ApiWalletsPage)));
 await act(async()=>button(node,"Remove").click());expect(state.approve).not.toHaveBeenCalled();await act(async()=>button(node,"Confirm removal").click());expect(state.approve).toHaveBeenCalledWith({agentAddress:`0x${"00".repeat(20)}`,agentName:"External Bot"});await act(async()=>root.unmount());
});
it("does not overwrite a named key already registered by another process",async()=>{
 downloads();state.agents=[{name:"X1 Bot",address:`0x${"cd".repeat(20)}`,validUntil:Date.now()+60000}];const node=document.createElement("div"),root=createRoot(node);await act(async()=>root.render(createElement(ApiWalletsPage)));await act(async()=>button(node,"Generate").click());await act(async()=>button(node,"Save .env.agent").click());await act(async()=>button(node,"Authorize API Wallet").click());expect(node.querySelector('[role="alert"]')?.textContent).toContain("already authorized");expect(state.approve).not.toHaveBeenCalled();await act(async()=>root.unmount());
});
it("approves the fee independently without creating or changing an API wallet",async()=>{
 state.fee=0;const node=document.createElement("div"),root=createRoot(node);await act(async()=>root.render(createElement(ApiWalletsPage)));
 expect(node.querySelector('[aria-label="Builder fee approval"]')?.textContent).toContain("Fee approval required");
 await act(async()=>button(node,"Approve 0.05% fee").click());expect(state.approve).toHaveBeenCalledTimes(1);expect(state.approve).toHaveBeenCalledWith({builder:`0x${"ef".repeat(20)}`,maxFeeRate:"0.05%"});expect(state.approve.mock.calls[0][0]).not.toHaveProperty("agentAddress");
 expect(node.textContent).not.toContain("Verified: this account");expect(node.textContent).toContain("not yet reflected on-chain");state.fee=50;await act(async()=>button(node,"Refresh fee status").click());expect(node.textContent).toContain("Verified: this account");expect(state.approve).toHaveBeenCalledTimes(1);await act(async()=>root.unmount());state.fee=50;
});
it("allows reapproval even when the stored cap already covers the fee",async()=>{
 state.fee=50;const node=document.createElement("div"),root=createRoot(node);await act(async()=>root.render(createElement(ApiWalletsPage)));await act(async()=>button(node,"Reapprove 0.05% fee").click());expect(state.approve).toHaveBeenCalledWith({builder:`0x${"ef".repeat(20)}`,maxFeeRate:"0.05%"});expect(node.textContent).toContain("Verified: this account");await act(async()=>root.unmount());
});
it("offers approval on each row while sharing the correct owner-account fee status",async()=>{
 state.fee=0;state.agents=[{name:"Bot One",address:`0x${"cd".repeat(20)}`,validUntil:Date.now()+60000},{name:"Bot Two",address:`0x${"12".repeat(20)}`,validUntil:Date.now()+60000}];const node=document.createElement("div"),root=createRoot(node);await act(async()=>root.render(createElement(ApiWalletsPage)));
 const rows=[...node.querySelectorAll("tbody tr")];expect(rows).toHaveLength(2);expect(rows.every(row=>row.textContent?.includes("Approval required"))).toBe(true);
 expect(rows[0].querySelector('td[title]')?.getAttribute("title")).toBe(`0x${"ab".repeat(20)}`);
 await act(async()=>node.querySelector<HTMLButtonElement>('[aria-label="Approve account fee for Bot One"]')!.click());expect(state.approve).toHaveBeenCalledWith({builder:`0x${"ef".repeat(20)}`,maxFeeRate:"0.05%"});expect(state.approve).toHaveBeenCalledTimes(1);
 state.fee=50;await act(async()=>button(node,"Refresh fee status").click());expect([...node.querySelectorAll("tbody tr")].every(row=>row.textContent?.includes("Account approved · 0.05%"))).toBe(true);expect(state.approve).toHaveBeenCalledTimes(1);
 await act(async()=>root.unmount());state.fee=50;
});
