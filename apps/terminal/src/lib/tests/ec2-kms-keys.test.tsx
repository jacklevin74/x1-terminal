// @vitest-environment jsdom
import {act} from "react";
import {createRoot} from "react-dom/client";
import {QueryClient,QueryClientProvider} from "@tanstack/react-query";
import {afterEach,expect,it,vi} from "vitest";
const state=vi.hoisted(()=>({offline:false,create:vi.fn(),approve:vi.fn(),sign:vi.fn(),approved:[] as any[],rows:[] as any[]}));
const owner=`0x${"ab".repeat(20)}` as const,agent=`0x${"cd".repeat(20)}` as const;
const key={id:"kms-id",name:"X1 KMS",agent,createdAt:Date.now(),validUntil:Date.now()+86400000,state:"awaiting_approval"};
const status=()=>({version:1,supported:true,region:"us-east-2",owner,canCreate:true,pending:0,capabilities:{create:true,sign:false,register:false},agents:state.rows});
vi.mock("wagmi",()=>({useConnection:()=>({address:owner}),useWalletClient:()=>({data:{signTypedData:state.sign}})}));
vi.mock("@/lib/hyperliquid",()=>({useHyperliquid:()=>({env:"Mainnet"}),useExchange:()=>({mutateAsync:state.approve}),useInfo:()=>({data:state.approved,isError:false,refetch:async()=>({data:state.approved})})}));
vi.mock("@/lib/ec2-keys/api",()=>({ec2KeysLocalHost:()=>true,getEc2Keys:async()=>{if(state.offline)throw Error("offline");return status();},createEc2Key:(...args:any[])=>state.create(...args),ec2AgentName:(k:any)=>`X1K${k.agent.slice(2,14)} valid_until ${k.validUntil}`}));
import {Ec2KmsKeys} from "@/components/api-wallets/ec2-kms-keys";
let cleanup:(()=>Promise<void>)|undefined;
afterEach(async()=>{await cleanup?.();state.offline=false;state.rows=[];state.approved=[];vi.clearAllMocks();});
async function mount(){const client=new QueryClient({defaultOptions:{queries:{retry:false}}}),node=document.createElement("div"),root=createRoot(node),authorized=vi.fn();document.body.append(node);cleanup=async()=>{await act(async()=>root.unmount());client.clear();node.remove();};await act(async()=>{root.render(<QueryClientProvider client={client}><Ec2KmsKeys onAuthorized={authorized}/></QueryClientProvider>);});await act(async()=>{await new Promise(r=>setTimeout(r,30));});return {node,authorized};}
const button=(node:HTMLElement,label:string)=>[...node.querySelectorAll('button')].find(b=>b.textContent===label)!;
it("shows connected creation controls without creating or signing anything on mount",async()=>{
 const {node}=await mount();expect(node.textContent).toContain("EC2 connected");expect(button(node,"Create KMS key").disabled).toBe(false);expect(state.create).not.toHaveBeenCalled();expect(state.sign).not.toHaveBeenCalled();expect(state.approve).not.toHaveBeenCalled();
 state.create.mockResolvedValue({...status(),createdAgentId:key.id,agents:[key]});await act(async()=>button(node,"Create KMS key").click());expect(state.create).toHaveBeenCalledWith(expect.objectContaining({owner,name:"X1 KMS",days:30}));expect(node.textContent).toContain("Awaiting owner approval");expect(node.textContent).toContain("does not register a bot");expect(state.approve).not.toHaveBeenCalled();
});
it("fails closed when the EC2 service is disconnected",async()=>{state.offline=true;const {node}=await mount();expect(button(node,"Create KMS key").disabled).toBe(true);expect(node.textContent).toContain("EC2 service unavailable");expect(state.create).not.toHaveBeenCalled();});
it("authorizes only on explicit action and verifies approval before reporting success",async()=>{
 state.rows=[key];const {node,authorized}=await mount();state.approve.mockImplementationOnce(async()=>{state.approved=[{address:agent,name:"X1Kcdcdcdcdcdcd",validUntil:key.validUntil}];return {status:"ok"};});
 await act(async()=>button(node,"Authorize on Hyperliquid").click());expect(state.approve).toHaveBeenCalledWith({agentAddress:agent,agentName:`X1K${agent.slice(2,14)} valid_until ${key.validUntil}`});expect(authorized).toHaveBeenCalledOnce();expect(node.textContent).toContain("No bot or remote trade signing was enabled");
});
