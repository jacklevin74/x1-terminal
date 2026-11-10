import { Ec2KmsKeys } from "./ec2-kms-keys";
import { ApiKeysView } from "./api-keys-view";
import {useTradingAccount} from "@/hooks/use-trading-account";
import {SubaccountsSection} from "./subaccounts-section";
import { CopyIcon, CheckIcon } from "@phosphor-icons/react";
import { useCopyToClipboard } from "@/hooks/ui/use-copy-to-clipboard";
import { AutoTraderPanel } from "@/components/auto-trader/auto-trader-panel";
import { AutoTraderControls } from "./auto-trader-controls";
import { ApiKeyExport } from "./api-key-export";
import { useEffect, useRef, useState } from "react";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";
import { zeroAddress, type Address, type Hex } from "viem";
import { useConnection, useWalletClient } from "wagmi";
import { DEFAULT_BUILDER_CONFIG, BUILDER_CONFIGURED } from "@/config/hyperliquid";
import { useExchange, useInfo, useHyperliquid, removeAgentFromStorage, readAgentFromStorage } from "@/lib/hyperliquid";
import { apiWalletBaseName, apiWalletEnv, apiWalletName, validateApiWalletAddress } from "@/lib/trade/api-wallets";
import { UserMenu } from "@/components/trade/header/user-menu";

const builderAddress=DEFAULT_BUILDER_CONFIG?.b??zeroAddress;
const builderFee=DEFAULT_BUILDER_CONFIG?.f??50;
const builderFeeRate=`${Number(builderFee)/1000}%`;
const field="rounded-lg border border-stroke-weak bg-background px-3 py-2.5 text-sm text-fg outline-none focus:border-brand";
const button="rounded-lg bg-brand px-4 py-2.5 text-sm font-medium text-fg-inverse disabled:opacity-40";
export function ApiWalletsPage({managementOnly=false}:{managementOnly?:boolean}){
 const {address:tradingAddress}=useTradingAccount();
 const {address,connector}=useConnection();const {data:wallet}=useWalletClient();const {env}=useHyperliquid();
 const ownerRef=useRef(address);ownerRef.current=address;const envRef=useRef(env);envRef.current=env;
 const agents=useInfo("extraAgents",{user:address??zeroAddress},{enabled:!!address,refetchOnWindowFocus:true});
 const fee=useInfo("maxBuilderFee",{user:address??zeroAddress,builder:builderAddress},{enabled:!!address&&BUILDER_CONFIGURED,refetchOnWindowFocus:true});
 const approve=useExchange("approveAgent"),approveFee=useExchange("approveBuilderFee");
 const [name,setName]=useState("X1 Bot"),[agent,setAgent]=useState(""),[days,setDays]=useState(30);
 const [secret,setSecret]=useState<Hex|null>(null),[saved,setSaved]=useState(false),[exportTarget,setExportTarget]=useState<Address|null>(null);
 const [error,setError]=useState<string|null>(null),[message,setMessage]=useState<string|null>(null),[pendingRemove,setPendingRemove]=useState<string|null>(null);
 const [feeMessage,setFeeMessage]=useState<string|null>(null),[feeError,setFeeError]=useState<string|null>(null);
 const [removeFeedback,setRemoveFeedback]=useState<{address:string;error?:string;message?:string}|null>(null);
 const [busy,setBusy]=useState(false);const lock=useRef(false);
 useEffect(()=>{setSecret(null);setAgent("");setSaved(false);setExportTarget(null);setError(null);setMessage(null);setPendingRemove(null);setRemoveFeedback(null);setFeeMessage(null);setFeeError(null);},[address,env]);
 function generate(){const key=generatePrivateKey();setSecret(key);setAgent(privateKeyToAccount(key).address);setSaved(false);setExportTarget(null);setError(null);}
 function download(){if(!secret||!address)return;const blob=new Blob([apiWalletEnv(address,secret,env)],{type:"text/plain"});const url=URL.createObjectURL(blob);const link=document.createElement("a");link.href=url;link.download=".env.agent";document.body.append(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);setSaved(true);}
 function localKey(target:string){
  if(!address||ownerRef.current!==address||envRef.current!==env)throw new Error("Connected account changed.");
  if(secret&&agent.toLowerCase()===target.toLowerCase())return secret;
  const stored=readAgentFromStorage(env,address);
  if(stored?.publicKey.toLowerCase()===target.toLowerCase())return stored.privateKey;
  throw new Error("This key is not stored on this device. Use your original backup or generate a new API wallet.");
 }
 function hasLocalKey(target:string){try{localKey(target);return true;}catch{return false;}}
 async function updateFeeApproval(sign:boolean){
  if(lock.current||!address)return;
  lock.current=true;setBusy(true);setFeeError(null);setFeeMessage(null);
  const owner=address,startEnv=env;
  const check=()=>{if(ownerRef.current!==owner||envRef.current!==startEnv)throw new Error("Wallet or network changed. Start again with the intended account.");};
  try{
   if(!BUILDER_CONFIGURED)throw new Error("The terminal builder address is not configured.");
   if(sign){
    if(!wallet)throw new Error("Unlock and connect the account owner's wallet to approve the fee. An API wallet cannot approve it.");
    setFeeMessage(connector?.id==="x1"?"Submitting approval with your X1-derived Hyperliquid account…":`Confirm the ${builderFeeRate} builder fee approval in your wallet.`);
    await approveFee.mutateAsync({builder:builderAddress,maxFeeRate:builderFeeRate});check();
   }
   const result=await fee.refetch();check();
   if(result.error||result.data===undefined)throw new Error(sign?"Approval submitted, but its on-chain status could not be verified. Refresh status before retrying your bot.":"Could not check the on-chain fee approval. Retry refresh.");
   if(result.data>=Number(builderFee))setFeeMessage(`Verified: this account has approved the ${builderFeeRate} X1 builder fee on ${env}.`);
   else setFeeMessage(sign?"Approval submitted but not yet reflected on-chain. Refresh status before retrying your bot.":"The current approval is below the required fee. Approve the fee with the account owner's wallet.");
  }catch(e){if(ownerRef.current===owner&&envRef.current===startEnv){setFeeMessage(null);setFeeError(e instanceof Error?e.message:"Could not approve the fee.");}}
  finally{lock.current=false;setBusy(false);}
 }
 async function authorize(remove?:{name:string;address:string}){
  if(lock.current||!address)return;lock.current=true;setBusy(true);setError(null);setMessage(null);
  const owner=address,startEnv=env;const check=()=>{if(ownerRef.current!==owner||envRef.current!==startEnv)throw new Error("Wallet or network changed. Please start again.");};
  try{
   if(!wallet)throw new Error("Unlock and connect your owner wallet to manage API wallets.");
   if(remove){
    setRemoveFeedback({address:remove.address,message:"Confirm API wallet removal in your owner wallet…"});
    await approve.mutateAsync({agentAddress:zeroAddress,agentName:apiWalletBaseName(remove.name)||null});check();
    const verified=await agents.refetch();check();
    if(verified.isError||!verified.data)throw new Error("Removal submitted, but its status could not be verified. Refresh wallets before retrying.");
    if(verified.data.some(row=>row.address.toLowerCase()===remove.address.toLowerCase()))throw new Error("Removal submitted, but this API wallet is still listed. Refresh wallets before retrying.");
    if(readAgentFromStorage(env,owner)?.publicKey.toLowerCase()===remove.address.toLowerCase())removeAgentFromStorage(env,owner);
    setPendingRemove(null);setRemoveFeedback(null);setMessage("API wallet removed.");
   }else{
    if(!managementOnly&&!BUILDER_CONFIGURED)throw new Error("The terminal builder address is not configured.");
    if(secret&&!saved)throw new Error("Save your generated API key before authorizing.");
    const publicKey=validateApiWalletAddress(agent.trim(),owner),agentName=apiWalletName(name,days);
    const current=await agents.refetch();check();if(!current.data)throw new Error("Could not check existing API wallets. Refresh and retry.");
    if(current.data.some(row=>apiWalletBaseName(row.name).toLowerCase()===apiWalletBaseName(agentName).toLowerCase()))throw new Error("That name is already authorized. Choose a new name or remove the old API wallet first.");
    if(current.data.some(row=>row.address.toLowerCase()===publicKey.toLowerCase()))throw new Error("That API wallet address is already authorized. Generate a new key for a new authorization.");
    if(!managementOnly){const fees=await fee.refetch();check();if(fees.data===undefined)throw new Error("Could not check fee approval. Refresh and retry.");
    if(fees.data<Number(builderFee)){setMessage("Confirm the 0.05% builder fee in your wallet.");await approveFee.mutateAsync({builder:builderAddress,maxFeeRate:builderFeeRate});check();}}
    setMessage("Confirm API wallet authorization in your wallet.");await approve.mutateAsync({agentAddress:publicKey,agentName});check();setMessage("API wallet authorized. Use its key with the local trading script.");
   }
   await agents.refetch();await fee.refetch();
  }catch(e){if(ownerRef.current===owner&&envRef.current===startEnv){setMessage(null);if(remove)setRemoveFeedback({address:remove.address,error:e instanceof Error?e.message:"Removal failed."});else setError(e instanceof Error?e.message:"Authorization failed.");}}
  finally{lock.current=false;setBusy(false);}
 }
 const backup=secret&&<div className="mt-4 space-y-3 rounded-lg border border-stroke-weak bg-background p-3"><p className="text-xs text-warning">Save this trading key before leaving. Anyone with it can trade this account and cause losses. It cannot be recovered from the terminal.</p><div className="flex flex-wrap items-center gap-3"><input aria-label="Generated API private key" type="password" value={secret} readOnly autoComplete="off" className={`${field} min-w-0 flex-1 font-mono`} /><button type="button" className="text-sm text-brand" onClick={()=>setExportTarget(agent as Address)}>Export private key</button><button type="button" className={button} onClick={download}>Save .env.agent</button></div></div>;
 if(managementOnly)return <><ApiKeysView owner={address} network={env} agents={agents.data} loading={agents.isLoading} failed={agents.isError} name={name} agent={agent} days={days} busy={busy} canAuthorize={!busy&&!!address&&!!agent&&(!secret||saved)} onName={setName} onAgent={value=>{setAgent(value);setSecret(null);setSaved(false);}} onDays={setDays} onGenerate={generate} onAuthorize={()=>void authorize()} onRefresh={()=>void agents.refetch()} onRemove={row=>void authorize({name:row.name,address:row.address})} onRequestRemove={value=>{setPendingRemove(value);setRemoveFeedback(null);}} pendingRemove={pendingRemove} feedback={removeFeedback} error={error} message={message} backup={backup} remoteKeys={<Ec2KmsKeys key={`${address}:${env}`} onAuthorized={()=>void agents.refetch()} />}/>{exportTarget&&address&&<ApiKeyExport key={`${address}:${env}:${exportTarget}`} owner={address} agent={exportTarget} network={env} resolveKey={()=>localKey(exportTarget)} onClose={()=>setExportTarget(null)} onSaved={()=>{if(exportTarget.toLowerCase()===agent.toLowerCase())setSaved(true);}} />}</>;
 return <main className="min-h-dvh bg-background p-4 text-fg sm:p-8"><div className="mx-auto max-w-7xl space-y-5">
  <header className="flex items-center justify-between gap-4"><a href="/" className="text-sm text-brand">← X1 Terminal</a><div className="flex items-center gap-4"><a href="/api_keys" className="text-sm text-brand">Manage API keys ↗</a><UserMenu /></div></header>
  <div><h1 className="text-3xl font-semibold">API</h1><p className="mt-3 max-w-4xl text-sm text-fg-muted">API wallets can trade on behalf of your account without withdrawal permissions. Use your account address for balance, position and order queries.</p><p className="mt-2 break-all font-mono text-xs text-fg-muted">{env} · Account: {address??"Connect your wallet"}</p></div>
  <section id="builder-fee-approval" aria-label="Builder fee approval" className="rounded-xl border border-stroke-weak bg-surface p-4">
   <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-sm font-semibold">X1 trading fee · {builderFeeRate}</h2><p className="mt-1 text-xs text-fg-muted">{connector?.id==="x1"?"Approve with your X1-derived Hyperliquid account.":"Approve with the account owner's wallet."} This is separate from API wallet authorization.</p></div><span role="status" className="text-sm text-brand">{!address?"Wallet not connected":fee.isError?"Status unavailable":fee.data===undefined?"Checking approval…":fee.data>=Number(builderFee)?"Fee approved":"Fee approval required"}</span></div>
   <div className="mt-3 space-y-1 break-all font-mono text-xs text-fg-muted"><p>Account: {address??"—"} · {env}</p><p>Builder: {builderAddress}</p><p>Current approved cap: {fee.data!==undefined&&!fee.isError?`${Number(fee.data)/1000}%`:"—"}</p></div>
   <div className="mt-4 flex flex-wrap gap-3"><button type="button" className={button} disabled={busy||!address||!BUILDER_CONFIGURED} onClick={()=>void updateFeeApproval(true)}>{fee.data!==undefined&&fee.data>=Number(builderFee)?`Reapprove ${builderFeeRate} fee`:`Approve ${builderFeeRate} fee`}</button><button type="button" className="px-3 py-2 text-sm text-brand disabled:opacity-40" disabled={busy||!address||!BUILDER_CONFIGURED} onClick={()=>void updateFeeApproval(false)}>Refresh fee status</button></div>
   {feeMessage&&<p role="status" className="mt-3 text-sm text-brand">{feeMessage}</p>}{feeError&&<p role="alert" className="mt-3 text-sm text-error">{feeError}</p>}
  </section>
  <section aria-label="Authorize API wallet" className="rounded-xl border border-stroke-weak bg-surface p-4">
   <div className="flex flex-col gap-3 lg:flex-row"><label className="flex flex-1 flex-col gap-1 text-xs text-fg-muted">API wallet name<input aria-label="API wallet name" maxLength={16} value={name} disabled={busy} onChange={e=>setName(e.target.value)} className={field} /></label>
    <label className="flex flex-[2] flex-col gap-1 text-xs text-fg-muted">API wallet address<input aria-label="API wallet address" value={agent} disabled={busy} placeholder="0x…" onChange={e=>{setAgent(e.target.value);setSecret(null);setSaved(false);}} className={`${field} font-mono`} /></label>
    <label className="flex flex-col gap-1 text-xs text-fg-muted">Expires in<select aria-label="API wallet expiry" value={days} disabled={busy} onChange={e=>setDays(Number(e.target.value))} className={field}>{[7,30,90,180].map(value=><option key={value} value={value}>{value} days</option>)}</select></label>
    <div className="flex items-end gap-2"><button type="button" disabled={busy||!address} onClick={generate} className="px-3 py-2.5 text-sm text-brand disabled:opacity-40">Generate</button><button type="button" className={button} disabled={busy||!address||!agent||!BUILDER_CONFIGURED||!!secret&&!saved} onClick={()=>void authorize()}>{busy?"Confirm in wallet…":"Authorize API Wallet"}</button></div>
   </div>
   {backup}
   <p className="mt-3 rounded-lg border border-warning/30 bg-warning/5 p-3 text-xs leading-relaxed"><strong className="text-warning">Do not send funds to API wallet addresses.</strong> Fund the intended Hyperliquid trading account instead. API wallets only sign trades using the selected main account or subaccount’s balance; the signing key needs no separate deposit.</p>
   <p className="mt-3 text-xs text-fg-muted">Orders sent through the X1 script include a 0.05% builder fee, in addition to exchange fees. Authorization requires your connected wallet.</p>
   {error&&<p role="alert" className="mt-3 text-sm text-error">{error}</p>}{message&&<p role="status" className="mt-3 text-sm text-brand">{message}</p>}
  </section>
  <section id="api-wallets" aria-label="API wallets" className="space-y-4 scroll-mt-4">
   <div className="flex flex-wrap items-start justify-between gap-3"><div><div className="flex items-center gap-2"><h2 className="text-lg font-semibold">API wallets</h2><span className="rounded-full border border-stroke-weak px-2 py-0.5 text-xs text-fg-muted">{agents.data?.length??0}</span></div><p className="mt-1 text-xs text-fg-muted">Trading access for your owner account. These addresses are for signing, not deposits. Builder fee approval is shared across its API wallets.</p></div><button type="button" disabled={busy||!address} className="rounded-lg border border-stroke-weak px-3 py-2 text-xs text-brand hover:bg-fill-hover disabled:opacity-40" onClick={()=>void agents.refetch()}>Refresh wallets</button></div>
   <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
    {agents.data?.map(row=>{
     const label=apiWalletBaseName(row.name)||"Unnamed";
     const expired=row.validUntil<=Date.now();
     const local=hasLocalKey(row.address);
     const feedback=removeFeedback?.address===row.address?removeFeedback:null;
     return <article key={row.address} data-api-wallet={row.address} className="min-w-0 rounded-xl border border-stroke-weak bg-surface p-3">
      <header className="flex items-center justify-between gap-2"><div className="flex min-w-0 items-center gap-2"><h3 className="truncate text-sm font-semibold" title={label}>{label}</h3><span title={expired?"Expired":"Authorized"} aria-label={expired?"Expired":"Authorized"} className={`size-1.5 shrink-0 rounded-full ${expired?"bg-warning":"bg-success"}`} /></div><button type="button" disabled={busy} aria-label={`Remove API wallet ${label}`} className="shrink-0 rounded-md border border-error/30 px-2 py-1 text-[11px] font-medium text-error hover:bg-error/10 disabled:opacity-40" onClick={()=>{setPendingRemove(row.address);setRemoveFeedback(null);}}>Remove</button></header>
      <ApiWalletAddress address={row.address} name={label} />
      <div className="mt-1 flex flex-wrap items-center gap-x-2 text-[11px] text-fg-muted"><span>{env}</span><span aria-hidden="true">·</span><span data-wallet-owner title={address}>Owner {address?`${address.slice(0,6)}…${address.slice(-4)}`:"—"}</span></div>
      <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px]"><span title={new Date(row.validUntil).toLocaleString()} className={expired?"text-warning":"text-fg-muted"}>{expired?"Expired":"Expires"} {new Date(row.validUntil).toLocaleDateString(undefined,{month:"short",day:"numeric",year:"2-digit"})}</span><span>{fee.isError||fee.data===undefined?"Fee not verified":fee.data>=Number(builderFee)?`${builderFeeRate} approved`:"Fee approval required"}</span></div>
      <div className="mt-2 flex flex-wrap items-start gap-1.5 border-t border-stroke-weak pt-2"><button type="button" disabled={busy||!local} title={local?"Export API private key":apiWalletBaseName(row.name)==="X1 AutoTrader"?"Auto Trader keys are sealed for execution. Renew the key in Auto Trader instead.":"Private key is unavailable on this device. Use your original backup."} className="rounded-md border border-stroke-weak px-2 py-1 text-[11px] text-brand hover:bg-fill-hover disabled:opacity-40" onClick={()=>setExportTarget(row.address)}>Export key</button><button type="button" disabled={busy||!address||!BUILDER_CONFIGURED} title="Signed by the owner; applies to all agents of this account" aria-label={`Approve account fee for ${label}`} className="rounded-md border border-stroke-weak px-2 py-1 text-[11px] text-brand hover:bg-fill-hover disabled:opacity-40" onClick={()=>void updateFeeApproval(true)}>{fee.data!==undefined&&fee.data>=Number(builderFee)?"Reapprove fee":"Approve fee"}</button>{address&&<AutoTraderControls key={`${address}:${env}:${tradingAddress}:${row.address}`} owner={address} account={tradingAddress??address} agent={row.address} validUntil={row.validUntil} resolveKey={()=>localKey(row.address)} />}</div>
      {pendingRemove===row.address&&<div role="group" aria-label={`Confirm removal of ${label}`} className="mt-4 space-y-3 rounded-lg border border-error/30 bg-error/5 p-3"><p className="text-xs leading-relaxed">Revoke {label}'s trading access? Existing positions and submitted orders remain. Confirm with the owner wallet.</p><div className="flex flex-wrap gap-3"><button type="button" disabled={busy} className="rounded-lg bg-error px-3 py-2 text-xs font-medium text-fg-inverse disabled:opacity-40" onClick={()=>void authorize(row)}>{busy?"Confirm in wallet…":"Confirm removal"}</button><button type="button" disabled={busy} className="px-3 py-2 text-xs text-fg-muted" onClick={()=>{setPendingRemove(null);setRemoveFeedback(null);}}>Cancel</button></div></div>}
      {feedback?.error&&<p role="alert" className="mt-3 text-xs text-error">{feedback.error}</p>}{feedback?.message&&<p role="status" className="mt-3 text-xs text-brand">{feedback.message}</p>}
     </article>;
    })}
   </div>
   {!agents.data?.length&&<p className="rounded-xl border border-stroke-weak bg-surface px-4 py-5 text-sm text-fg-muted">{!address?"Connect a wallet to manage API access.":agents.isError?"Could not load API wallets.":agents.isLoading?"Loading API wallets…":"No API wallets authorized."}</p>}
  </section>
  <p className="text-xs text-fg-muted">Key export is available only for keys held on this device. Hyperliquid cannot recover private keys.</p>
  <SubaccountsSection key={`subaccounts:${address??"none"}:${env}`} />
  <AutoTraderPanel />
  <section className="space-y-2 text-sm"><h2 className="font-medium">Trade from a script</h2><p className="text-fg-muted">Save the generated file in your project folder. Check access, then preview an order before executing it.</p><pre className="overflow-x-auto rounded-lg bg-surface p-4 text-xs">{`node --env-file=.env.agent apps/terminal/scripts/x1-agent.mjs status\nnode --env-file=.env.agent apps/terminal/scripts/x1-agent.mjs order --file examples/api-order.json\n# Add --execute to submit the order`}</pre></section>
  {exportTarget&&address&&<ApiKeyExport key={`${address}:${env}:${exportTarget}`} owner={address} agent={exportTarget} network={env} resolveKey={()=>localKey(exportTarget)} onClose={()=>setExportTarget(null)} onSaved={()=>{if(exportTarget.toLowerCase()===agent.toLowerCase())setSaved(true);}} />}
 </div></main>;
}

function ApiWalletAddress({address,name}:{address:Address;name:string}){
 const {copy,copied}=useCopyToClipboard(1800);
 return <div className="mt-1 flex min-w-0 items-center gap-1"><span title={address} className="min-w-0 truncate select-all font-mono text-[11px] leading-5">{address}</span><button type="button" aria-label={copied?`Copied API wallet address for ${name}`:`Copy API wallet address for ${name}`} title={copied?"Copied":"Copy API wallet address"} onClick={()=>void copy(address)} className="inline-flex size-5 shrink-0 items-center justify-center rounded text-fg-muted hover:bg-fill-hover hover:text-brand focus-visible:outline-2 focus-visible:outline-brand">{copied?<CheckIcon aria-hidden="true" className="size-3.5 text-success" />:<CopyIcon aria-hidden="true" className="size-3.5" />}</button></div>;
}
