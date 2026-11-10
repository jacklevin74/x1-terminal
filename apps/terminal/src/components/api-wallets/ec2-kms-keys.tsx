import {useEffect,useRef,useState} from "react";
import {useMutation,useQuery,useQueryClient} from "@tanstack/react-query";
import {useConnection,useWalletClient} from "wagmi";
import {type Address,zeroAddress} from "viem";
import {CopyIcon,CheckIcon,CloudIcon} from "@phosphor-icons/react";
import {Modal,ModalContent,ModalFooter,ModalHeader,ModalPopup,ModalTitle} from "@hypeterminal/ui";
import {useExchange,useHyperliquid,useInfo} from "@/lib/hyperliquid";
import {createEc2Key,getEc2Keys,manageEc2Key,ec2AgentName,EC2_UNAVAILABLE,type Ec2Key,type Ec2ManageOp} from "@/lib/ec2-keys/api";
import {agentApprovalCurrent} from "@/lib/trade/api-wallets";
import {useCopyToClipboard} from "@/hooks/ui/use-copy-to-clipboard";
const field="w-full min-w-0 rounded-lg border border-stroke-weak bg-background px-3 py-2.5 text-sm outline-none focus:border-brand disabled:opacity-40";
const small="rounded-md border border-stroke-weak px-2 py-1 text-[11px] hover:bg-fill-hover disabled:opacity-40";
const OP_TITLE:Record<Ec2ManageOp,string>={rename:"Rename",disable:"Disable",enable:"Enable","delete":"Delete","cancel-delete":"Cancel deletion"};
const OP_DONE:Record<Ec2ManageOp,string>={rename:"Key renamed.",disable:"KMS key disabled. It cannot sign until you enable it.",enable:"KMS key enabled.","delete":"KMS key deletion scheduled. Remove its Hyperliquid API wallet below as well.","cancel-delete":"Deletion cancelled. The key stays disabled until you enable it."};
type Pending={op:Ec2ManageOp;key:Ec2Key};
export function Ec2KmsKeys({onAuthorized}:{onAuthorized:()=>void}) {
 const {address:owner}=useConnection(),{data:wallet}=useWalletClient(),{env}=useHyperliquid(),client=useQueryClient();
 const identity=useRef({owner,env});identity.current={owner,env};const alive=useRef(true),lock=useRef(false);
 const [name,setName]=useState("X1 KMS"),[days,setDays]=useState(30),[error,setError]=useState<string|null>(null),[message,setMessage]=useState<string|null>(null);
 const [pending,setPending]=useState<Pending|null>(null),[rename,setRename]=useState("");
 useEffect(()=>{alive.current=true;setError(null);setMessage(null);setPending(null);return()=>{alive.current=false;};},[owner,env]);
 const enabled=!!owner&&env==="Mainnet",queryKey=["ec2-kms-keys",env,owner];
 const keys=useQuery({queryKey,queryFn:({signal})=>getEc2Keys(owner!,signal),enabled,retry:false,refetchInterval:15000,refetchOnWindowFocus:true});
 const approvals=useInfo("extraAgents",{user:owner??zeroAddress},{enabled:!!owner,refetchOnWindowFocus:true});
 const approve=useExchange("approveAgent");
 const approved=(key:Ec2Key)=>approvals.data?.some(a=>a.address.toLowerCase()===key.agent.toLowerCase()&&agentApprovalCurrent(a.validUntil));
 const mutation=useMutation({retry:false,mutationFn:async({action,key,op}:{action:"create"|"approve"|"manage";key?:Ec2Key;op?:Ec2ManageOp})=>{
  if(lock.current)throw Error("Another key action is pending.");lock.current=true;const startOwner=owner,startEnv=env;
  const check=()=>{if(!alive.current||identity.current.owner!==startOwner||identity.current.env!==startEnv)throw Error("Wallet or network changed. Start again with the intended owner.");};
  try{
   check();if(!enabled||!owner||!wallet||keys.isError||!keys.data)throw Error("Connect the owner wallet and EC2 key service first.");setError(null);
   if(action==="create"){
    if(!keys.data.canCreate)throw Error("Key quota reached or a previous request needs reconciliation.");
    setMessage("Confirm key creation in your owner wallet. This creates a billable KMS key; it does not authorize trading.");
    const status=await createEc2Key({owner,name:name.trim(),days,assertOwner:check,sign:args=>wallet.signTypedData(args)});check();client.setQueryData(queryKey,status);setMessage("KMS key created on EC2. Authorize its public address on Hyperliquid below.");
   }else if(action==="manage"){
    if(!op||!key||!keys.data.agents.some(a=>a.id===key.id&&a.agent===key.agent))throw Error("Select a key belonging to this owner.");
    setMessage(`Confirm “${OP_TITLE[op]}” in your owner wallet.`);
    const status=await manageEc2Key({op,owner,id:key.id,...(op==="rename"?{name:rename.trim()}:{}),assertOwner:check,sign:args=>wallet.signTypedData(args)});check();
    client.setQueryData(queryKey,status);setPending(null);setMessage(OP_DONE[op]);
   }else{
    if(!key||!keys.data.agents.some(a=>a.id===key.id&&a.agent===key.agent)||!agentApprovalCurrent(key.validUntil))throw Error("Select a current key belonging to this owner.");
    if(key.state==="disabled"||key.state==="pending_deletion")throw Error("Enable this KMS key before authorizing it.");
    const current=await approvals.refetch();check();if(current.error||!current.data)throw Error("Could not verify existing Hyperliquid authorizations.");
    const approvalName=ec2AgentName(key),base=approvalName.split(" valid_until ")[0];
    if(current.data.some(a=>a.name.split(" valid_until ")[0]===base&&a.address.toLowerCase()!==key.agent.toLowerCase()))throw Error("An existing agent uses this approval name. No replacement was submitted.");
    setMessage("Confirm API wallet authorization in your owner wallet.");await approve.mutateAsync({agentAddress:key.agent,agentName:approvalName});check();
    const result=await approvals.refetch();check();if(result.error||!result.data?.some(a=>a.address.toLowerCase()===key.agent.toLowerCase()&&agentApprovalCurrent(a.validUntil)))throw Error("Authorization submitted but not verified. Refresh before retrying.");
    onAuthorized();setMessage("KMS API wallet authorization verified. No bot or remote trade signing was enabled.");
   }
  }catch(e){if(alive.current&&identity.current.owner===startOwner&&identity.current.env===startEnv){setMessage(null);setError(e instanceof Error?e.message:"Key action could not be confirmed.");}throw e;}finally{lock.current=false;}
 }});
 const busy=mutation.isPending,ready=enabled&&keys.isSuccess&&!keys.isError,manage=ready&&!!keys.data?.capabilities.manage&&!!wallet;
 const ask=(op:Ec2ManageOp,key:Ec2Key)=>{setError(null);setMessage(null);setRename(key.name);setPending({op,key});};
 const stateLabel=(key:Ec2Key)=>key.state==="pending_deletion"?`Deletion scheduled${key.deletionDate?` · ${new Date(key.deletionDate).toLocaleDateString()}`:""}`:key.state==="disabled"?"Disabled":approved(key)?"Authorized on Hyperliquid":"Awaiting owner approval";
 const stateTone=(key:Ec2Key)=>key.state==="pending_deletion"?"text-error":key.state==="disabled"?"text-fg-muted":approved(key)?"text-success":"text-warning";
 return <section aria-label="EC2 KMS keys" className="rounded-xl border border-stroke-weak bg-surface p-4 space-y-3">
  <div className="flex flex-wrap items-center justify-between gap-3"><h2 className="inline-flex items-center gap-2 text-sm font-medium"><CloudIcon className="size-4"/>AWS KMS keys</h2><div className="flex items-center gap-3"><span className={`text-xs ${ready?"text-success":"text-fg-muted"}`}>{!owner?"Connect owner wallet":env!=="Mainnet"?"Mainnet required":keys.isFetching&&!keys.data?"Connecting to EC2…":ready?"EC2 connected · us-east-2":EC2_UNAVAILABLE}</span><button type="button" disabled={!enabled||keys.isFetching||busy} onClick={()=>void keys.refetch()} className="text-xs text-brand disabled:opacity-40">Refresh KMS</button></div></div>
  <p className="text-xs text-fg-muted">Create a non-exportable key through our EC2 service. The private key stays in AWS KMS; no download or deposit is needed. Creating a key is billable.</p>
  <div className="grid items-end gap-3 sm:grid-cols-[minmax(140px,1fr)_auto_auto]"><label className="space-y-1 text-xs text-fg-muted"><span>Key name</span><input aria-label="KMS key name" value={name} maxLength={16} disabled={busy} onChange={e=>setName(e.target.value)} className={field}/></label><label className="space-y-1 text-xs text-fg-muted"><span>Approval duration</span><select aria-label="KMS approval duration" value={days} disabled={busy} onChange={e=>setDays(Number(e.target.value))} className={field}>{[7,30,90].map(d=><option key={d} value={d}>{d} days</option>)}</select></label><button type="button" disabled={!ready||!keys.data?.canCreate||!wallet||busy||!/^[-\w ]{1,16}$/.test(name.trim())} onClick={()=>mutation.mutate({action:"create"})} className="rounded-lg bg-brand px-4 py-2.5 text-sm font-medium text-fg-inverse disabled:opacity-40">{busy?"Confirming…":"Create KMS key"}</button></div>
  {!ready&&enabled&&keys.isError&&<p role="status" className="text-xs text-warning">{EC2_UNAVAILABLE} Creation and changes stay disabled until it responds. Keys already authorized on Hyperliquid keep working.</p>}
  {!!keys.data?.pending&&<p role="status" className="text-xs text-warning">{keys.data.pending} creation request(s) require recovery. Refresh before retrying the same name and duration; do not create replacements.</p>}
  {!pending&&message&&<p role="status" className="text-xs text-brand">{message}</p>}{!pending&&error&&<p role="alert" className="text-xs text-error">{error}</p>}
  {ready&&!!keys.data?.agents.length&&<div className="divide-y divide-stroke-weak border-t border-stroke-weak">{keys.data.agents.map(key=>{const usable=key.state!=="disabled"&&key.state!=="pending_deletion";return <div key={key.id} data-kms-key={key.id} className="flex flex-wrap items-center justify-between gap-3 py-3"><div className="min-w-0 space-y-1"><div className="flex items-center gap-2 text-xs"><strong>{key.name}</strong><span data-kms-state={key.state} className={stateTone(key)}>{stateLabel(key)}</span></div><KmsAddress agent={key.agent}/><p className="text-[10px] text-fg-muted">Approval name: {ec2AgentName(key).split(" valid_until ")[0]} · Expires {new Date(key.validUntil).toLocaleString()}</p></div>
   <div className="flex flex-wrap items-center gap-1.5">
    <button type="button" disabled={busy||!wallet||!usable||approved(key)||approvals.isError||!agentApprovalCurrent(key.validUntil)} onClick={()=>mutation.mutate({action:"approve",key})} className="rounded-lg border border-stroke-weak px-3 py-2 text-xs text-brand disabled:opacity-40">{approved(key)?"Authorized":"Authorize on Hyperliquid"}</button>
    <button type="button" aria-label={`Rename KMS key ${key.name}`} disabled={busy||!manage} onClick={()=>ask("rename",key)} className={`${small} text-brand`}>Rename</button>
    {key.state==="disabled"?<button type="button" aria-label={`Enable KMS key ${key.name}`} disabled={busy||!manage} onClick={()=>ask("enable",key)} className={`${small} text-brand`}>Enable</button>
    :key.state!=="pending_deletion"&&<button type="button" aria-label={`Disable KMS key ${key.name}`} disabled={busy||!manage} onClick={()=>ask("disable",key)} className={`${small} text-warning`}>Disable</button>}
    {key.state==="pending_deletion"?<button type="button" aria-label={`Cancel deletion of KMS key ${key.name}`} disabled={busy||!manage} onClick={()=>ask("cancel-delete",key)} className={`${small} text-brand`}>Cancel deletion</button>
    :<button type="button" aria-label={`Delete KMS key ${key.name}`} disabled={busy||!manage} onClick={()=>ask("delete",key)} className={`${small} border-error/30 text-error`}>Delete</button>}
   </div></div>;})}</div>}
  <p className="text-[10px] text-fg-muted">This connection creates, authorizes and manages keys only. It does not register a bot or enable remote trade signing. Removing an API wallet below revokes Hyperliquid access; deleting a KMS key here does not remove its Hyperliquid approval.</p>
  {pending&&<Modal open onOpenChange={open=>{if(!open&&!busy)setPending(null);}}><ModalPopup size="sm"><ModalHeader><ModalTitle>{OP_TITLE[pending.op]} {pending.key.name}?</ModalTitle></ModalHeader><ModalContent className="space-y-3">
   <p className="break-all font-mono text-xs text-fg-muted">{pending.key.agent}</p>
   {pending.op==="rename"&&<label className="block space-y-1 text-xs text-fg-muted"><span>New name</span><input aria-label="New KMS key name" value={rename} maxLength={16} disabled={busy} onChange={e=>setRename(e.target.value)} className={field}/></label>}
   {pending.op==="rename"&&<p className="text-xs">Changes the display name only. The key and its Hyperliquid approval name stay the same.</p>}
   {pending.op==="disable"&&<p className="text-sm">The key cannot sign while disabled. Its Hyperliquid approval stays in place; you can enable it again.</p>}
   {pending.op==="enable"&&<p className="text-sm">The key can sign again wherever it is authorized.</p>}
   {pending.op==="delete"&&<><p className="text-sm">Schedules permanent deletion of this AWS KMS key in 30 days. Until then you can cancel. After deletion the key and its address can never sign again.</p><p className="rounded-lg border border-warning/30 bg-warning/5 p-2 text-xs text-warning">Also remove this key’s Hyperliquid API wallet in the list below. Deleting the KMS key does not revoke the approval on Hyperliquid.</p></>}
   {pending.op==="cancel-delete"&&<p className="text-sm">Keeps the key. It stays disabled until you enable it.</p>}
   <p className="text-xs text-fg-muted">Confirm with your owner wallet signature.</p>
   {message&&<p role="status" className="text-xs text-brand">{message}</p>}{error&&<p role="alert" className="text-xs text-error">{error}</p>}
  </ModalContent><ModalFooter><button type="button" disabled={busy} onClick={()=>setPending(null)} className="px-4 py-2 text-sm text-fg-muted">Cancel</button><button type="button" disabled={busy||(pending.op==="rename"&&(!/^[-\w ]{1,16}$/.test(rename.trim())||rename.trim()===pending.key.name))} onClick={()=>mutation.mutate({action:"manage",key:pending.key,op:pending.op})} className={`rounded-lg px-4 py-2 text-sm text-fg-inverse disabled:opacity-40 ${pending.op==="delete"||pending.op==="disable"?"bg-error":"bg-brand"}`}>{busy?"Confirm in wallet…":`Confirm ${OP_TITLE[pending.op].toLowerCase()}`}</button></ModalFooter></ModalPopup></Modal>}
 </section>;
}
function KmsAddress({agent}:{agent:Address}){const {copy,copied}=useCopyToClipboard(1800);return <div className="flex min-w-0 items-center gap-2 text-xs"><span className="break-all select-all">{agent}</span><button type="button" aria-label={`Copy KMS address ${agent}`} className="shrink-0 text-brand" onClick={()=>void copy(agent)}>{copied?<CheckIcon className="size-3.5 text-success"/>:<CopyIcon className="size-3.5"/>}</button></div>;}
