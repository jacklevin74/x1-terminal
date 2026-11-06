import {useEffect,useRef,useState} from "react";
import {useMutation,useQuery,useQueryClient} from "@tanstack/react-query";
import {CloudIcon,KeyIcon,ShieldCheckIcon,CheckCircleIcon,CopyIcon,ArrowClockwiseIcon} from "@phosphor-icons/react";
import {useConnection,useWalletClient} from "wagmi";
import {zeroAddress,type Address} from "viem";
import {UserMenu} from "@/components/trade/header/user-menu";
import {useTradingAccount} from "@/hooks/use-trading-account";
import {useExchange,useHyperliquid,useInfo} from "@/lib/hyperliquid";
import {DEMO_OWNER,getDemoKeys,demoKeysMutation,isLocalKeysHost,type DemoStatus,type LocalProof} from "@/lib/remote-keys/demo";
import {getRemoteKeys,remoteAgentApprovalName,remoteKeysMutation,type RemoteAgent} from "@/lib/remote-keys/api";
import {agentApprovalCurrent} from "@/lib/trade/api-wallets";

const panel="rounded-xl border border-stroke-weak bg-surface p-4 sm:p-5";
const primary="inline-flex items-center justify-center gap-2 rounded-lg bg-brand px-4 py-2 text-sm font-medium text-fg-inverse disabled:cursor-not-allowed disabled:opacity-40";
const secondary="inline-flex items-center justify-center gap-2 rounded-lg border border-stroke-weak px-3 py-2 text-xs text-fg hover:border-brand disabled:cursor-not-allowed disabled:opacity-40";
const field="rounded-lg border border-stroke-weak bg-background px-3 py-2 text-sm text-fg focus:border-brand focus:outline-none";
const short=(address:string)=>`${address.slice(0,8)}…${address.slice(-6)}`;
const date=(timestamp:number|null)=>timestamp?new Date(timestamp).toLocaleString():"—";
const stateLabel={awaiting_approval:"Awaiting approval",approved:"Approved",paused:"Registered · paused",disabled:"Signing disabled"};

export function RemoteKeysPage({demo=false}:{demo?:boolean}={}){
 const {address:connectedOwner}=useConnection(),{data:wallet}=useWalletClient();
 const active=useTradingAccount();
 const owner=demo?(connectedOwner??DEMO_OWNER):connectedOwner,account=demo?(active.address??owner):active.address;
 const {env}=useHyperliquid();
 const identity=useRef({owner,account,env});identity.current={owner,account,env};
 const alive=useRef(true);useEffect(()=>{alive.current=true;return()=>{alive.current=false;};},[]);
 const requestScope=useRef("");const operationLock=useRef(false);
 const client=useQueryClient();
 const queryKey=["remote-keys",demo?"local-demo":"live",env,owner?.toLowerCase(),account?.toLowerCase()];
 const enabled=!!owner&&!!account&&(demo||env==="Mainnet");
 const status=useQuery({queryKey,queryFn:({signal})=>demo?getDemoKeys(owner!,account!):getRemoteKeys(owner!,account!,signal),enabled,retry:false,refetchInterval:30000});
 const approvals=useInfo("extraAgents",{user:owner??zeroAddress},{enabled:enabled&&!demo,refetchInterval:30000});
 const authorize=useExchange("approveAgent");
 const [provider,setProvider]=useState<"kms"|"mock">("kms"),[proof,setProof]=useState<LocalProof|null>(null);
 const [name,setName]=useState("X1 Remote"),[days,setDays]=useState(30),[copied,setCopied]=useState<string|null>(null);
 const [error,setError]=useState<string|null>(null),[message,setMessage]=useState<string|null>(null);
 useEffect(()=>{setError(null);setMessage(null);setCopied(null);setProof(null);},[owner,account,env]);
 const verified=(row:RemoteAgent)=>demo?["approved","paused"].includes(row.state):!approvals.isError&&(approvals.data??[]).some(a=>a.address.toLowerCase()===row.agent.toLowerCase()&&agentApprovalCurrent(a.validUntil));
 const operation=useMutation({retry:false,mutationFn:async({action,row}:{action:"create"|"approve"|"register"|"sign"|"remove";row?:RemoteAgent})=>{
  if(!owner||!account||!demo&&(!wallet||env!=="Mainnet"))throw new Error("Connect the account owner’s wallet on Mainnet.");
  if(operationLock.current)throw new Error("A remote key request is already in progress.");
  operationLock.current=true;try{
  const original={owner,account,env};requestScope.current=`${owner}:${account}:${env}`;
  const assertAccount=()=>{const current=identity.current;if(!alive.current||current.owner!==original.owner||current.account!==original.account||current.env!==original.env)throw new Error("The selected account changed. Refresh before continuing.");};
  assertAccount();setError(null);setMessage(null);
  if(demo){
   const token=(status.data as DemoStatus|undefined)?.csrf;if(!token)throw new Error("Refresh the local demo connection first.");
   const result=await demoKeysMutation(action,action==="create"?{name:name.trim(),days,provider}:{id:row?.id},owner,account,token);assertAccount();client.setQueryData(queryKey,result);
   if(result.proof)setProof(result.proof);
   setMessage(action==="sign"?`AWS KMS signature verified in the browser (${result.proof?.ms} ms). No exchange request was sent.`:action==="create"?provider==="kms"?"AWS KMS test key created. Approval and registration below are simulated.":"Mock agent created. No AWS key was created.":action==="remove"?"Test agent removed. Any KMS key was scheduled for deletion in seven days.":action==="approve"?"Demo approval simulated. Hyperliquid was not contacted.":"Demo registration simulated in a paused state. No backend registration was created.");return;
  }
  if(!wallet)throw new Error("Connect your owner wallet.");
  if(action==="sign"||action==="remove")throw new Error("Test operations require local demo mode.");
  if(action==="approve"){
   if(!row||row.state==="disabled"||!agentApprovalCurrent(row.validUntil))throw new Error(row?.state==="disabled"?"Signing is disabled for this key.":"Create a current remote agent before authorizing it.");
   setMessage("Confirm agent approval in your owner wallet. This authorizes trading; it does not start a bot.");
   await authorize.mutateAsync({agentAddress:row.agent,agentName:remoteAgentApprovalName(row.agent,row.validUntil)});assertAccount();
   const result=await approvals.refetch();assertAccount();
   if(result.error||!result.data?.some(a=>a.address.toLowerCase()===row.agent.toLowerCase()&&agentApprovalCurrent(a.validUntil)))throw new Error("Approval submitted but not verified. Refresh before retrying.");
   setMessage("Agent approval verified. Register the remote signer to finish setup.");return;
  }
  if(action==="register"&&(!row||row.state==="disabled"||!verified(row)||!agentApprovalCurrent(row.validUntil)))throw new Error(row?.state==="disabled"?"Signing is disabled for this key.":"Verify the current owner’s agent approval first.");
  setMessage(action==="create"?"Confirm the remote key request in your owner wallet…":"Confirm registration in your owner wallet…");
  const result=await remoteKeysMutation(action==="create"?"kms-create":"kms-register",action==="create"?{name:name.trim(),days}:{id:row!.id,agent:row!.agent},{owner,account,assertAccount,sign:request=>wallet.signTypedData(request)});
  assertAccount();client.setQueryData(queryKey,result);
  setMessage(action==="create"?"Remote agent created. Approve its public address on Hyperliquid next.":"Remote signer registered in a paused state. Trading has not started.");
  }finally{operationLock.current=false;}
 },onError:failure=>{if(alive.current&&requestScope.current===`${identity.current.owner}:${identity.current.account}:${identity.current.env}`){setMessage(null);setError(failure instanceof Error?failure.message:"Remote signer action could not be confirmed.");}}});
 const busy=operation.isPending;
 const statusMessage=status.error instanceof Error?status.error.message:"";
 const signingDisabled=!demo&&statusMessage==="Remote signing is disabled.";
 const serviceReady=enabled&&status.isSuccess&&!status.isError&&!!status.data;
 const agents=serviceReady?status.data!.agents:[];
 async function copy(address:Address){try{await navigator.clipboard.writeText(address);setCopied(address);}catch{setError("Could not copy the address. Select and copy it manually.");}}

 return <main className="min-h-dvh bg-background p-4 text-fg sm:p-8"><div className="mx-auto max-w-6xl space-y-5">
  <header className="flex flex-wrap items-center justify-between gap-4"><a href="/" className="text-sm font-semibold tracking-wide text-brand">X1 TERMINAL</a><div className="flex min-w-0 flex-wrap items-center justify-end gap-3"><UserMenu /></div></header>
  <div className="flex flex-wrap items-end justify-between gap-3"><div><p className="mb-2 text-xs uppercase tracking-widest text-brand">Wallet infrastructure</p><h1 className="text-2xl font-semibold">Remote signing keys</h1><p className="mt-2 max-w-2xl text-sm text-fg-muted">Trade with an API wallet whose private key stays in AWS KMS. Your owner wallet approves access; the remote service signs trading actions.</p></div><a href="/API" className={secondary}>API wallets ↗</a></div>
  {demo?<div role="note" className="rounded-xl border border-warning/40 bg-surface p-4 text-sm"><strong className="text-warning">Local demo · approval and registration are simulated</strong><p className="mt-1 text-xs text-fg-muted">AWS KMS keys and test signatures are real when selected. No wallet signature, Hyperliquid approval or trade will be sent. Test keys can be deleted below and are cleaned up when the bridge stops.</p><a className="mt-2 inline-block text-xs text-brand" href="/keys?mode=live">Use backend API instead</a></div>:isLocalKeysHost()&&<a href="/keys" className="inline-block text-sm text-brand">Try the local demo with AWS signing</a>}
  <div className="grid gap-3 sm:grid-cols-3">{[{icon:ShieldCheckIcon,title:"Keys stay in KMS",text:"No private key to download or save in your browser."},{icon:KeyIcon,title:"Trading access only",text:"Approve the agent with your owner wallet. Keep funds in your trading account."},{icon:CloudIcon,title:"Remote execution",text:"The execution service signs approved actions. Creating a key does not start trading."}].map(({icon:Icon,title,text})=><div className="flex gap-3 rounded-xl border border-stroke-weak bg-surface p-4" key={title}><Icon size={21} className="shrink-0 text-brand" /><div><h2 className="text-xs font-semibold">{title}</h2><p className="mt-1 text-xs leading-relaxed text-fg-muted">{text}</p></div></div>)}</div>
  <section className={panel} aria-label="Remote signer connection"><div className="flex flex-wrap items-center justify-between gap-3"><div className="flex items-center gap-2"><span aria-hidden="true" className={`size-2 rounded-full ${serviceReady?"bg-success":"bg-warning"}`} /><h2 className="text-sm font-semibold">{demo?(serviceReady?"Local demo connected":"Local demo bridge not connected"):!owner?"Connect your owner wallet":env!=="Mainnet"?"Mainnet required":status.isFetching&&!status.data?"Checking remote signer…":serviceReady?"Remote signer connected":signingDisabled?"Remote signing is disabled":"Remote signing service not connected"}</h2></div><button type="button" className={secondary} disabled={!enabled||status.isFetching||busy} onClick={()=>void status.refetch()}><ArrowClockwiseIcon size={14} />Refresh status</button></div>
   <dl className="mt-4 grid gap-4 text-xs sm:grid-cols-3"><div><dt className="text-fg-muted">Owner wallet</dt><dd className="mt-1 break-all font-mono" title={owner}>{owner?short(owner):"Connect wallet above"}</dd></div><div><dt className="text-fg-muted">Trading account</dt><dd className="mt-1" title={account}>{account?<><span className="mr-2">{active.subaccount?.name??"Main account"}</span><span className="font-mono">{short(account)}</span></>:"—"}</dd></div><div><dt className="text-fg-muted">Key storage</dt><dd className="mt-1">{demo?"Local demo · optional AWS KMS":"AWS KMS · us-east-2"}</dd></div></dl>
   {enabled&&!serviceReady&&!status.isFetching&&<p className="mt-4 text-xs text-fg-muted">{demo?"Start npm run demo:keys in tools/remote-keys-demo to enable the local demo.":signingDisabled?"Remote signing is disabled. Creation and registration stay unavailable until the service reports supported.":"Remote key creation and registration become available when the signing service is connected."} Existing API wallets continue to work on the <a className="text-brand" href="/API">API page</a>.</p>}
  </section>
  <section className={panel} aria-label="Create remote agent"><div className="mb-4 flex items-center gap-2"><span className="flex size-6 items-center justify-center rounded-full bg-brand/10 text-xs text-brand">1</span><h2 className="text-sm font-semibold">Create a remote agent</h2></div><div className="flex flex-wrap items-end gap-3"><label className="flex min-w-48 flex-1 flex-col gap-2 text-xs text-fg-muted">Agent name<input className={field} value={name} maxLength={24} onChange={e=>setName(e.target.value)} disabled={busy} /></label><label className="flex flex-col gap-2 text-xs text-fg-muted">Approval duration<select className={field} value={days} disabled={busy} onChange={e=>setDays(Number(e.target.value))}>{[7,30,90].map(d=><option key={d} value={d}>{d} days</option>)}</select></label>{demo&&<label className="flex flex-col gap-2 text-xs text-fg-muted">Signing mode<select className={field} value={provider} disabled={busy} onChange={e=>setProvider(e.target.value as "kms"|"mock")}><option value="kms">AWS KMS · real test key</option><option value="mock">Mock only · no AWS calls</option></select></label>}<button type="button" className={primary} disabled={!serviceReady||!status.data?.canCreate||(!demo&&!wallet)||busy||!name.trim()||!/^[\w -]{1,24}$/.test(name.trim())} onClick={()=>operation.mutate({action:"create"})}><KeyIcon size={16} />{demo?(provider==="kms"?"Create KMS test agent":"Create mock agent"):"Create KMS agent"}</button></div><p className="mt-3 text-xs text-fg-muted">{demo?"KMS mode creates a billable AWS test key in us-east-2. Mock mode creates only a demo record. Neither authorizes trading.":"Creates a new public agent address for the selected trading account. You will confirm the request in your owner wallet."}</p></section>
  {message&&<p role="status" className="rounded-lg border border-stroke-weak bg-surface p-3 text-sm text-brand">{message}</p>}{error&&<p role="alert" className="rounded-lg border border-error/30 bg-surface p-3 text-sm text-error">{error}</p>}
  <section className="space-y-3" aria-label="Remote agents"><div className="flex items-center justify-between"><h2 className="text-sm font-semibold">Your remote agents <span className="ml-2 text-fg-muted">{agents.length}</span></h2><span className="text-xs text-fg-muted">Selected trading account only</span></div>
   {!agents.length?<div className={`${panel} flex items-center gap-4`}><KeyIcon size={28} className="shrink-0 text-fg-muted" /><div><p className="text-sm">{serviceReady?"No remote agents yet":"Remote agents will appear here"}</p><p className="mt-1 text-xs text-fg-muted">Create an agent, approve it on Hyperliquid, then register remote signing.</p></div></div>:agents.map(row=><article key={row.id} className={panel}><div className="flex flex-wrap items-center justify-between gap-3"><div><div className="flex items-center gap-3"><h3 className="text-sm font-semibold">{row.name}</h3>{demo&&<span className="text-[10px] text-warning">{(row as RemoteAgent&{provider?:string}).provider==="kms"?"Real KMS test key":"Mock only"}</span>}<span className={`rounded-full border border-stroke-weak px-2 py-1 text-[10px] ${row.state==="paused"?"text-success":"text-fg-muted"}`}>{stateLabel[row.state]}</span></div><div className="mt-2 flex items-center gap-2"><span className="font-mono text-xs text-fg-muted" title={row.agent}>{short(row.agent)}</span><button type="button" className="shrink-0 text-brand" aria-label={`Copy ${row.name} address`} onClick={()=>void copy(row.agent)}>{copied===row.agent?<CheckCircleIcon size={16} />:<CopyIcon size={16} />}</button></div></div><div className="flex flex-wrap gap-2">{row.state!=="disabled"&&row.state!=="paused"&&<><button type="button" className={secondary} disabled={busy||(!demo&&!wallet)||verified(row)||(!demo&&approvals.isError)||!agentApprovalCurrent(row.validUntil)} onClick={()=>operation.mutate({action:"approve",row})}>{verified(row)?demo?"Demo approval complete":"Owner approval verified":demo?"2 · Simulate approval":"2 · Approve on Hyperliquid"}</button><button type="button" className={primary} disabled={busy||(!demo&&!wallet)||!verified(row)||!agentApprovalCurrent(row.validUntil)} onClick={()=>operation.mutate({action:"register",row})}>{demo?"3 · Simulate registration":"3 · Register remote signer"}</button></>}{demo&&<><button type="button" className={secondary} disabled={busy||(row as RemoteAgent&{provider?:string}).provider!=="kms"} onClick={()=>operation.mutate({action:"sign",row})}>Test AWS signature</button><button type="button" className={`${secondary} text-error`} disabled={busy} onClick={()=>operation.mutate({action:"remove",row})}>Delete test agent</button></>}{!demo&&row.state==="paused"&&<a href="/API#auto-trader" className={secondary}>Configure Auto Trader ↗</a>}</div></div><div className="mt-4 flex flex-wrap gap-x-6 gap-y-2 border-t border-stroke-weak pt-3 text-xs text-fg-muted"><span>Created {date(row.createdAt)}</span><span>{row.validUntil==null?"Approval does not expire":`Approval expires ${date(row.validUntil)}`}</span><span>Last signature {date(row.lastSignedAt)}</span></div>{row.state==="disabled"&&<p className="mt-3 text-xs text-warning">Signing is disabled for this key. It cannot be approved or registered.</p>}</article>)}
  </section>
  {demo&&proof&&<section className={panel} aria-label="Verified AWS signature"><h2 className="text-sm font-semibold text-success">AWS KMS signature verified</h2><p className="mt-2 text-xs text-fg-muted">A harmless demo proof was signed in KMS and independently recovered in your browser. It cannot place a Hyperliquid order.</p><dl className="mt-3 space-y-2 break-all font-mono text-xs"><div>Agent: {proof.recovered}</div><div>Latency: {proof.ms} ms</div><div>Digest: {proof.digest}</div></dl><details className="mt-3 text-xs"><summary className="cursor-pointer text-brand">View public signature</summary><pre className="mt-2 overflow-x-auto">{JSON.stringify(proof.signature,null,2)}</pre></details></section>}
  <p className="pb-6 text-xs leading-relaxed text-fg-muted">API wallets are signing identities. Do not deposit funds into these addresses. Subaccount agents are approved by the owner and sign for the selected subaccount. Registration starts paused; existing exchange and builder fees still apply.</p>
 </div></main>;
}
