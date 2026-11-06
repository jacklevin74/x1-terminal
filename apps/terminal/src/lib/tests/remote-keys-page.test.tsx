// @vitest-environment jsdom
import {act} from "react";
import {createRoot} from "react-dom/client";
import {QueryClient,QueryClientProvider} from "@tanstack/react-query";
import {afterEach,beforeEach,expect,it,vi} from "vitest";
import {RemoteKeysPage} from "@/components/remote-keys/remote-keys-page";
const state=vi.hoisted(()=>({owner:`0x${"11".repeat(20)}`,account:`0x${"22".repeat(20)}`,available:false,get:vi.fn(),mutate:vi.fn(),approve:vi.fn()}));
vi.mock("wagmi",()=>({useConnection:()=>({address:state.owner}),useWalletClient:()=>({data:{signTypedData:vi.fn()}})}));
vi.mock("@/hooks/use-trading-account",()=>({useTradingAccount:()=>({address:state.account,subaccount:{name:"Strategy"}})}));
vi.mock("@/components/trade/header/user-menu",()=>({UserMenu:()=> <button>Account selector</button>}));
vi.mock("@/lib/hyperliquid",()=>({useHyperliquid:()=>({env:"Mainnet"}),useExchange:()=>({mutateAsync:state.approve}),useInfo:()=>({data:[],isError:false,refetch:vi.fn()})}));
vi.mock("@/lib/remote-keys/api",()=>({getRemoteKeys:(...args:unknown[])=>state.get(...args),remoteKeysMutation:(...args:unknown[])=>state.mutate(...args)}));
const data=()=>({version:1,supported:true,owner:state.owner,account:state.account,region:"us-east-2",canCreate:true,agents:[]});
let cleanup:(()=>Promise<void>)|undefined;
beforeEach(()=>{state.owner=`0x${"11".repeat(20)}`;state.account=`0x${"22".repeat(20)}`;state.get.mockReset();state.mutate.mockReset();state.approve.mockReset();});
afterEach(async()=>{await cleanup?.();cleanup=undefined;});
async function setup(){const host=document.createElement("div");document.body.append(host);const root=createRoot(host),client=new QueryClient({defaultOptions:{queries:{retry:false},mutations:{retry:false}}});const render=()=>root.render(<QueryClientProvider client={client}><RemoteKeysPage /></QueryClientProvider>);cleanup=async()=>{await act(async()=>root.unmount());client.clear();host.remove();};await act(async()=>{render();await new Promise(resolve=>setTimeout(resolve,30));});return {host,render};}
const button=(host:HTMLElement,name:string)=>[...host.querySelectorAll('button')].find(b=>b.textContent?.includes(name))!;
it("shows an unavailable service honestly and blocks key creation",async()=>{
 state.get.mockRejectedValue(Error("not connected"));const {host}=await setup();await act(async()=>{await new Promise(resolve=>setTimeout(resolve,30));});
 expect(host.textContent).toContain("Remote signing service not connected");expect(button(host,"Create KMS agent").disabled).toBe(true);expect(state.mutate).not.toHaveBeenCalled();expect(host.querySelector('input[type="password"]')).toBeNull();expect(host.textContent).toContain("Do not deposit");
});
it("creates an agent only through the remote service and leaves owner approval as a separate step",async()=>{
 state.get.mockResolvedValue(data());state.mutate.mockResolvedValue({...data(),agents:[{id:"test-agent",agent:`0x${"33".repeat(20)}`,name:"X1 Remote",state:"awaiting_approval",createdAt:Date.now(),validUntil:Date.now()+86400000,lastSignedAt:null}]});
 const {host}=await setup();await act(async()=>{await new Promise(resolve=>setTimeout(resolve,30));});expect(button(host,"Create KMS agent").disabled).toBe(false);
 await act(async()=>button(host,"Create KMS agent").click());
 expect(state.mutate).toHaveBeenCalledWith("kms-create",{name:"X1 Remote",days:30},expect.objectContaining({owner:state.owner,account:state.account}));
 expect(host.textContent).toContain("Awaiting approval");expect(button(host,"Register remote signer").disabled).toBe(true);expect(state.approve).not.toHaveBeenCalled();
});
it("does not show another selected account's remote agents",async()=>{
 state.get.mockResolvedValue({...data(),agents:[{id:"one",agent:`0x${"33".repeat(20)}`,name:"Old account agent",state:"paused",createdAt:Date.now(),validUntil:null,lastSignedAt:null}]});
 const {host,render}=await setup();await act(async()=>{await new Promise(resolve=>setTimeout(resolve,30));});expect(host.textContent).toContain("Old account agent");
 state.account=`0x${"44".repeat(20)}`;state.get.mockRejectedValue(Error("not connected"));await act(async()=>{render();await new Promise(resolve=>setTimeout(resolve,30));});expect(host.textContent).not.toContain("Old account agent");
});
