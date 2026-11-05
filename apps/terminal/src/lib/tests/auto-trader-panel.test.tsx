import {useTradingAccountStore} from "@/stores/use-trading-account-store";
import {getNetwork} from "@/lib/network";
// @vitest-environment jsdom
import {act,createElement,type ReactNode} from "react";
import {createRoot} from "react-dom/client";
import {beforeEach,afterEach,expect,it,vi} from "vitest";
import nacl from "tweetnacl";
import {AutoTraderPanel} from "@/components/auto-trader/auto-trader-panel";
import type {AutoTraderStatus} from "@/lib/auto-trader/types";
const state=vi.hoisted(()=>({owner:`0x${"ab".repeat(20)}`,env:"Mainnet",status:{registered:false} as AutoTraderStatus,agents:[] as {address:string;validUntil:number}[],fee:50,statusTarget:vi.fn(),infoRead:vi.fn(),control:vi.fn(),approve:vi.fn(),sealed:null as Record<string,unknown>|null,pub:""}));
vi.mock("@/lib/auto-trader/close-now",()=>({closeNow:vi.fn(async()=>{expect(state.status.state).toBe("paused");return 2;})}));
vi.mock("@/hooks/trade/use-submit-plan",()=>({useSubmitPlan:()=>({submitPlan:vi.fn()})}));
vi.mock("@lingui/react/macro",()=>({Trans:({children}:{children:ReactNode})=>children}));
vi.mock("wagmi",()=>({useConnection:()=>({address:state.owner,isConnected:true}),useWalletClient:()=>({data:{account:{address:state.owner}}})}));
vi.mock("@/config/hyperliquid",()=>({BUILDER_CONFIGURED:true,DEFAULT_BUILDER_CONFIG:{b:"0x95e1642b6c06e06e6ad9412a90e908dcb09f6c1a",f:50}}));
vi.mock("@/lib/hyperliquid",()=>({readAgentFromStorage:()=>null,useAgentWallet:()=>({isReady:true}),useHyperliquid:()=>({env:state.env}),useExchange:(method:string)=>({mutateAsync:async(p:Record<string,unknown>)=>{state.approve(method,p);if(method==="approveAgent")state.agents.push({address:p.agentAddress as string,validUntil:Date.now()+90*86400000});if(method==="approveBuilderFee")state.fee=50;}}),useInfo:(method:string,params:{dex?:string;user?:string})=>{
 state.infoRead(method,params);
 const get=()=>method==="extraAgents"?state.agents:method==="maxBuilderFee"?state.fee:method==="userAbstraction"?"disabled":method==="spotClearinghouseState"?{balances:[{coin:"USDC",total:"200"}]}:method==="allMids"?{BTC:"100"}:{marginSummary:{accountValue:params.dex?"0":"200"},assetPositions:[]};return {data:get(),isError:false,refetch:async()=>({data:get(),isError:false})};
}}));
vi.mock("@/lib/auto-trader/hooks",()=>({useAutoTraderStatus:(target:string)=>{state.statusTarget(target);return ({data:state.status,isLoading:false,isError:false,refetch:async()=>({data:state.status})})},useAutoTraderSignal:()=>({data:{coins:[{coin:"BTC",score:100},{coin:"xyz:BRENTOIL",score:20},{coin:"xyz:MU",score:30},{coin:"xyz:INTC",score:40}],timestamp:Date.now()},isError:false}),useAutoTraderMutation:()=>({mutateAsync:async({action,body}:{action:string;body:object|((pub:string)=>Record<string,unknown>)})=>{
 state.control(action);const payload=typeof body==="function"?body(state.pub):body;
 if(action==="register"){state.sealed=payload;state.status={registered:true,master:(payload as {master:`0x${string}`}).master,agent:(payload as {agent:`0x${string}`}).agent,hasKey:true,state:"paused",settings:(payload as {settings:AutoTraderStatus["settings"]}).settings,validUntil:Date.now()+90*86400000};}
 else if(action==="resume")state.status={...state.status,state:"active"};else if(action==="pause")state.status={...state.status,state:"paused"};else if(action==="flatten")state.status={...state.status,state:"flatten-requested"};else if(action==="remove")state.status={registered:false};return state.status;
}})}));
vi.mock("@hypeterminal/ui",()=>{const tag=({children}:{children:ReactNode})=>createElement("div",null,children);return {Tooltip:({children}:{children:ReactNode})=>children,Modal:({open,children}:{open:boolean;children:ReactNode})=>open?children:null,ModalPopup:tag,ModalHeader:tag,ModalTitle:tag,ModalContent:tag};});
// These tests do not call the hosted service or sign any real on-chain action.
beforeEach(()=>{useTradingAccountStore.getState().select(null);state.statusTarget.mockClear();state.infoRead.mockClear();state.owner=`0x${"ab".repeat(20)}`;state.env="Mainnet";state.status={registered:false};state.agents=[];state.fee=50;state.sealed=null;state.control.mockClear();state.approve.mockClear();state.pub=btoa(String.fromCharCode(...nacl.box.keyPair().publicKey));});
afterEach(()=>{useTradingAccountStore.getState().select(null);vi.restoreAllMocks();});
function button(node:HTMLElement,label:string){return [...node.querySelectorAll("button")].find(b=>b.textContent===label)!;}
it("onboards a dedicated sealed agent, stays paused, and requires explicit enable confirmation",async()=>{
 const local=vi.spyOn(Storage.prototype,"setItem"),node=document.createElement("div"),root=createRoot(node);await act(async()=>root.render(createElement(AutoTraderPanel)));
 expect(state.control).not.toHaveBeenCalled();expect(state.approve).not.toHaveBeenCalled();await act(async()=>button(node,"Create Auto Trader API wallet").click());expect(state.approve).toHaveBeenCalledTimes(1);expect(state.approve.mock.calls[0][1].agentName).toMatch(/^X1 AutoTrader valid_until \d+$/);
 await act(async()=>button(node,"Register Auto Trader").click());expect(state.control).toHaveBeenCalledWith("register");expect(state.sealed).toHaveProperty("sealedKey");expect(JSON.stringify(state.sealed)).not.toContain("privateKey");expect(node.textContent).toContain("PAUSED");expect(button(node,"Register Auto Trader")).toBeUndefined();expect(local).not.toHaveBeenCalled();
 await act(async()=>button(node,"Start Auto Trader").click());expect(state.control).toHaveBeenCalledTimes(1);await act(async()=>button(node,"Confirm").click());expect(state.control.mock.calls.map(c=>c[0])).toEqual(["register","resume"]);expect(node.textContent).toContain("WAITING FOR CYCLE");expect(node.textContent).toContain("No returns are promised");
 await act(async()=>root.unmount());
});
it("requires confirmation to flatten or remove, while pause is an immediate signed request",async()=>{
 state.agents=[{address:`0x${"cd".repeat(20)}`,validUntil:Date.now()+60000}];state.status={registered:true,master:state.owner as `0x${string}`,agent:state.agents[0].address as `0x${string}`,hasKey:true,state:"active",settings:{leverage:3,killPct:0.1,minOrderUsd:10,include:null,exclude:[]}};
 const node=document.createElement("div"),root=createRoot(node);await act(async()=>root.render(createElement(AutoTraderPanel)));
 await act(async()=>button(node,"Close & pause").click());expect(state.control).not.toHaveBeenCalled();expect(node.textContent).toContain("including manual positions");await act(async()=>button(node,"Cancel").click());expect(state.control).not.toHaveBeenCalled();
 await act(async()=>button(node,"Stop Auto Trader").click());expect(state.control).toHaveBeenCalledWith("pause");
 await act(async()=>button(node,"Remove Auto Trader").click());expect(state.control).toHaveBeenCalledTimes(1);await act(async()=>button(node,"Confirm").click());expect(state.control.mock.calls.map(c=>c[0])).toEqual(["pause","remove"]);expect(state.approve).not.toHaveBeenCalled();await act(async()=>root.unmount());
});
it("discards unregistered setup when switching owner and blocks the mainnet service on testnet",async()=>{
 const node=document.createElement("div"),root=createRoot(node);await act(async()=>root.render(createElement(AutoTraderPanel)));await act(async()=>button(node,"Create Auto Trader API wallet").click());expect(button(node,"Register Auto Trader")).toBeDefined();
 state.owner=`0x${"12".repeat(20)}`;await act(async()=>root.render(createElement(AutoTraderPanel)));expect(button(node,"Register Auto Trader")).toBeUndefined();expect(state.control).not.toHaveBeenCalled();
 state.env="Testnet";await act(async()=>root.render(createElement(AutoTraderPanel)));expect(node.textContent).toContain("supports Mainnet only");expect(button(node,"Create Auto Trader API wallet")).toBeUndefined();await act(async()=>root.unmount());
});

it("lists each API wallet and blocks start until the selected wallet is registered",async()=>{
 state.agents=[{address:`0x${"cd".repeat(20)}`,validUntil:Date.now()+60000},{address:`0x${"12".repeat(20)}`,validUntil:Date.now()+60000}];
 state.status={registered:true,agent:state.agents[0].address as `0x${string}`,hasKey:true,state:"paused"};
 const node=document.createElement("div"),root=createRoot(node);await act(async()=>root.render(createElement(AutoTraderPanel)));
 const select=node.querySelector<HTMLSelectElement>('[aria-label="Auto Trader API wallet"]')!;expect(select.options).toHaveLength(3);
 await act(async()=>{select.value=state.agents[1].address;select.dispatchEvent(new Event("change",{bubbles:true}));});
 expect(button(node,"Start Auto Trader").disabled).toBe(true);expect(button(node,"Stop Auto Trader").disabled).toBe(true);
 await act(async()=>button(node,"Register selected API wallet").click());expect(state.control).not.toHaveBeenCalled();expect(node.textContent).toContain("Enter the private key matching");
 await act(async()=>root.unmount());
});

it("renders market choices supplied by the API rather than the former fixed list",async()=>{
 const node=document.createElement("div"),root=createRoot(node);await act(async()=>root.render(createElement(AutoTraderPanel)));
 const labels=[...node.querySelectorAll('label')].filter(l=>l.querySelector('input[type="checkbox"]')).map(l=>l.textContent);
 expect(labels).toEqual(["BTC","xyz:BRENTOIL","xyz:MU","xyz:INTC"]);expect(labels).not.toContain("ETH");
 await act(async()=>root.unmount());
});

it("pauses before submitting immediate close orders and never queues a scheduled flatten",async()=>{
 state.agents=[{address:`0x${"cd".repeat(20)}`,validUntil:Date.now()+60000}];state.status={registered:true,agent:state.agents[0].address as `0x${string}`,state:"active",hasKey:true};
 const node=document.createElement("div"),root=createRoot(node);await act(async()=>root.render(createElement(AutoTraderPanel)));
 await act(async()=>button(node,"Close & pause").click());expect(state.control).not.toHaveBeenCalled();
 await act(async()=>button(node,"Confirm").click());expect(state.control.mock.calls.map(c=>c[0])).toEqual(["pause"]);expect(node.textContent).toContain("Positions verified closed");await act(async()=>root.unmount());
});

it("uses selected subaccount for readiness, status and registration while approvals use the signing owner",async()=>{
 const sub=`0x${"12".repeat(20)}` as const;useTradingAccountStore.getState().select({owner:state.owner as `0x${string}`,address:sub,name:"Ledger strategy",network:getNetwork()});
 const node=document.createElement("div"),root=createRoot(node);await act(async()=>root.render(createElement(AutoTraderPanel)));
 expect(node.textContent).toContain(`Signing owner: ${state.owner}`);expect(node.textContent).toContain(`Trading account: Ledger strategy · ${sub}`);expect(state.statusTarget).toHaveBeenCalledWith(sub);
 expect(state.infoRead).toHaveBeenCalledWith("clearinghouseState",{user:sub});expect(state.infoRead).toHaveBeenCalledWith("extraAgents",{user:state.owner});
 await act(async()=>button(node,"Create Auto Trader API wallet").click());await act(async()=>button(node,"Register Auto Trader").click());expect(state.sealed?.master).toBe(sub);expect(state.sealed?.master).not.toBe(state.owner);
 await act(async()=>root.unmount());
});
