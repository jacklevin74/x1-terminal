// @vitest-environment jsdom
import {act} from "react";
import {createRoot} from "react-dom/client";
import {afterEach,beforeEach,expect,it,vi} from "vitest";
import {SubaccountsSection} from "@/components/api-wallets/subaccounts-section";
const state=vi.hoisted(()=>({address:`0x${"ab".repeat(20)}` as string|undefined,create:vi.fn(),refetch:vi.fn(),tradingCreate:vi.fn(),info:vi.fn(),accounts:{} as Record<string,{name:string;master:string;subAccountUser:string}[]>}));
vi.mock("wagmi",()=>({useConnection:()=>({address:state.address,connector:{id:"rabby",name:"Rabby Wallet"}})}));
vi.mock("@/lib/hyperliquid",()=>({useHyperliquid:()=>({env:"Mainnet"}),useHyperliquidClients:()=>({user:state.address?{createSubAccount:state.create}:null,trading:{createSubAccount:state.tradingCreate}}),useInfo:(method:string,params:{user:string})=>{state.info(method,params);return {data:state.accounts[params.user]??[],isLoading:false,isError:false,refetch:state.refetch}}}));
let host:HTMLDivElement,root:ReturnType<typeof createRoot>;
beforeEach(async()=>{state.address=`0x${"ab".repeat(20)}`;state.create.mockReset().mockResolvedValue({response:{data:`0x${"cd".repeat(20)}`}});state.refetch.mockReset().mockResolvedValue({isError:false});state.tradingCreate.mockClear();state.info.mockClear();state.accounts={};host=document.createElement("div");document.body.append(host);root=createRoot(host);await act(async()=>root.render(<SubaccountsSection />));});
afterEach(async()=>{await act(async()=>root.unmount());host.remove();});
async function name(value:string){await act(async()=>{const input=host.querySelector("input")!;Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,"value")!.set!.call(input,value);input.dispatchEvent(new Event("input",{bubbles:true}));});}
async function submit(){await act(async()=>host.querySelector("form")!.dispatchEvent(new Event("submit",{bubbles:true,cancelable:true})));}
it("creates using the owner client, refreshes accounts, and explicitly reports no funding or bot setup",async()=>{await name("  Strategy 1  ");await submit();expect(state.create).toHaveBeenCalledExactlyOnceWith({name:"Strategy 1"});expect(state.tradingCreate).not.toHaveBeenCalled();expect(state.refetch).toHaveBeenCalledOnce();expect(host.textContent).toContain("No funds were transferred");expect(host.textContent).toContain("not connected to Auto Trader");});
it("does not submit without an owner or a valid name",async()=>{await submit();expect(state.create).not.toHaveBeenCalled();expect(host.textContent).toContain("1 to 16 characters");state.address=undefined;await act(async()=>root.render(<SubaccountsSection />));await name("Strategy");await submit();expect(state.create).not.toHaveBeenCalled();expect(host.textContent).toContain("Connect and unlock your owner wallet");});
it("reports exchange errors without automatic retries",async()=>{state.create.mockRejectedValue(new Error("Insufficient trading volume"));await name("Strategy");await submit();expect(state.create).toHaveBeenCalledOnce();expect(host.querySelector('[role="alert"]')?.textContent).toContain("Insufficient trading volume");expect(host.textContent).toContain("Refresh accounts before retrying");});
it("blocks duplicate submissions while owner signing is pending",async()=>{let resolve!:(value:unknown)=>void;state.create.mockImplementation(()=>new Promise(r=>{resolve=r;}));await name("Strategy");await submit();await submit();expect(state.create).toHaveBeenCalledOnce();await act(async()=>resolve({response:{data:`0x${"cd".repeat(20)}`}}));});

it("lists subaccounts for the connected Rabby owner and replaces the list on account switch",async()=>{
 const first=state.address!;const second=`0x${"12".repeat(20)}`;
 state.accounts[first]=[{name:"First owner bot",master:first,subAccountUser:`0x${"34".repeat(20)}`}];
 state.accounts[second]=[{name:"Ledger subaccount",master:second,subAccountUser:`0x${"56".repeat(20)}`},{name:"Foreign cached account",master:first,subAccountUser:`0x${"78".repeat(20)}`}];
 await act(async()=>root.render(<SubaccountsSection />));expect(host.textContent).toContain("First owner bot");
 state.address=second;await act(async()=>root.render(<SubaccountsSection />));
 expect(state.info).toHaveBeenLastCalledWith("subAccounts",{user:second});expect(host.textContent).toContain("Ledger subaccount");expect(host.textContent).toContain("Rabby Wallet");expect(host.textContent).not.toContain("First owner bot");expect(host.textContent).not.toContain("Foreign cached account");expect(host.querySelector('[data-subaccounts-owner]')?.textContent).toBe(second);
});
