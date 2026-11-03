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
export function ApiWalletsPage(){
 const {address,connector}=useConnection();const {data:wallet}=useWalletClient();const {env}=useHyperliquid();
 const ownerRef=useRef(address);ownerRef.current=address;const envRef=useRef(env);envRef.current=env;
 const agents=useInfo("extraAgents",{user:address??zeroAddress},{enabled:!!address,refetchOnWindowFocus:true});
 const fee=useInfo("maxBuilderFee",{user:address??zeroAddress,builder:builderAddress},{enabled:!!address&&BUILDER_CONFIGURED,refetchOnWindowFocus:true});
 const approve=useExchange("approveAgent"),approveFee=useExchange("approveBuilderFee");
 const [name,setName]=useState("X1 Bot"),[agent,setAgent]=useState(""),[days,setDays]=useState(30);
 const [secret,setSecret]=useState<Hex|null>(null),[saved,setSaved]=useState(false),[exportTarget,setExportTarget]=useState<Address|null>(null);
 const [error,setError]=useState<string|null>(null),[message,setMessage]=useState<string|null>(null),[pendingRemove,setPendingRemove]=useState<string|null>(null);
 const [feeMessage,setFeeMessage]=useState<string|null>(null),[feeError,setFeeError]=useState<string|null>(null);
 const [busy,setBusy]=useState(false);const lock=useRef(false);
 useEffect(()=>{setSecret(null);setAgent("");setSaved(false);setExportTarget(null);setError(null);setMessage(null);setPendingRemove(null);setFeeMessage(null);setFeeError(null);},[address,env]);
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
   if(!wallet)throw new Error("Unlock and connect your wallet to authorize an API wallet.");
   if(!BUILDER_CONFIGURED)throw new Error("The terminal builder address is not configured.");
   if(remove){
    await approve.mutateAsync({agentAddress:zeroAddress,agentName:apiWalletBaseName(remove.name)||null});check();
    if(readAgentFromStorage(env,owner)?.publicKey.toLowerCase()===remove.address.toLowerCase())removeAgentFromStorage(env,owner);
    setPendingRemove(null);setMessage("API wallet removed.");
   }else{
    if(secret&&!saved)throw new Error("Save your generated API key before authorizing.");
    const publicKey=validateApiWalletAddress(agent.trim(),owner),agentName=apiWalletName(name,days);
    const current=await agents.refetch();check();if(!current.data)throw new Error("Could not check existing API wallets. Refresh and retry.");
    if(current.data.some(row=>apiWalletBaseName(row.name).toLowerCase()===apiWalletBaseName(agentName).toLowerCase()))throw new Error("That name is already authorized. Choose a new name or remove the old API wallet first.");
    if(current.data.some(row=>row.address.toLowerCase()===publicKey.toLowerCase()))throw new Error("That API wallet address is already authorized. Generate a new key for a new authorization.");
    const fees=await fee.refetch();check();if(fees.data===undefined)throw new Error("Could not check fee approval. Refresh and retry.");
    if(fees.data<Number(builderFee)){setMessage("Confirm the 0.05% builder fee in your wallet.");await approveFee.mutateAsync({builder:builderAddress,maxFeeRate:builderFeeRate});check();}
    setMessage("Confirm API wallet authorization in your wallet.");await approve.mutateAsync({agentAddress:publicKey,agentName});check();setMessage("API wallet authorized. Use its key with the local trading script.");
   }
   await agents.refetch();await fee.refetch();
  }catch(e){if(ownerRef.current===owner&&envRef.current===startEnv){setMessage(null);setError(e instanceof Error?e.message:"Authorization failed.");}}
  finally{lock.current=false;setBusy(false);}
 }
 return <main className="min-h-dvh bg-background p-4 text-fg sm:p-8"><div className="mx-auto max-w-7xl space-y-5">
  <header className="flex items-center justify-between gap-4"><a href="/" className="text-sm text-brand">← X1 Terminal</a><UserMenu /></header>
  <div><h1 className="text-3xl font-semibold">API</h1><p className="mt-3 max-w-4xl text-sm text-fg-muted">API wallets can trade on behalf of your account without withdrawal permissions. Use your account address for balance, position and order queries.</p><p className="mt-2 break-all font-mono text-xs text-fg-muted">{env} · Account: {address??"Connect your wallet"}</p></div>
  <section aria-label="Builder fee approval" className="rounded-xl border border-stroke-weak bg-surface p-4">
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
   {secret&&<div className="mt-4 space-y-3 rounded-lg border border-stroke-weak bg-background p-3"><p className="text-xs text-warning">Save this trading key before leaving. Anyone with it can trade this account and cause losses. It cannot be recovered from the terminal.</p><div className="flex flex-wrap items-center gap-3"><input aria-label="Generated API private key" type="password" value={secret} readOnly autoComplete="off" className={`${field} min-w-0 flex-1 font-mono`} /><button type="button" className="text-sm text-brand" onClick={()=>setExportTarget(agent as Address)}>Export private key</button><button type="button" className={button} onClick={download}>Save .env.agent</button></div></div>}
   <p className="mt-3 text-xs text-fg-muted">Orders sent through the X1 script include a 0.05% builder fee, in addition to exchange fees. Authorization requires your connected wallet.</p>
   {error&&<p role="alert" className="mt-3 text-sm text-error">{error}</p>}{message&&<p role="status" className="mt-3 text-sm text-brand">{message}</p>}
  </section>
  <p className="text-xs text-fg-muted">All API wallets below belong to the owner account shown here. Builder fee approval is shared by its agents; it is not a separate permission on each API key.</p>
  <section className="overflow-x-auto rounded-xl border border-stroke-weak bg-surface"><table className="w-full whitespace-nowrap text-left text-sm"><thead className="text-xs text-fg-muted"><tr>{["API Wallet Name","API Wallet Address","Owner Account","Valid Until","Builder Fee","Action"].map(h=><th key={h} className="px-4 py-3 font-normal">{h}</th>)}</tr></thead><tbody>
   {agents.data?.map(row=><tr key={row.address}><td className="px-4 py-2">{apiWalletBaseName(row.name)||"Unnamed"}</td><td className="px-4 py-2 font-mono text-xs">{row.address}</td><td className="px-4 py-2 font-mono text-xs" title={address}>{address?`${address.slice(0,6)}…${address.slice(-4)}`:"—"}</td><td className="px-4 py-2">{new Date(row.validUntil).toLocaleString()}</td><td className="px-4 py-2"><span className="mr-3 text-xs text-fg-muted">{fee.isError||fee.data===undefined?"Not verified":fee.data>=Number(builderFee)?`Account approved · ${builderFeeRate}`:"Approval required"}</span><button type="button" disabled={busy||!address||!BUILDER_CONFIGURED} title="Signed by the owner; applies to all agents of this account" aria-label={`Approve account fee for ${apiWalletBaseName(row.name)||row.address}`} className="text-xs text-brand disabled:opacity-40" onClick={()=>void updateFeeApproval(true)}>{fee.data!==undefined&&fee.data>=Number(builderFee)?"Reapprove":"Approve fee"}</button></td><td className="px-4 py-2"><button type="button" disabled={busy||!hasLocalKey(row.address)} title={hasLocalKey(row.address)?"Export API private key":"Private key is unavailable on this device. Use your original backup."} className="mr-4 text-brand disabled:opacity-40" onClick={()=>setExportTarget(row.address)}>Export key</button>{pendingRemove===row.address?<span className="inline-flex gap-3"><button disabled={busy} className="text-error" onClick={()=>void authorize(row)}>Confirm removal</button><button disabled={busy} className="text-fg-muted" onClick={()=>setPendingRemove(null)}>Cancel</button></span>:<button disabled={busy} className="text-error" onClick={()=>setPendingRemove(row.address)}>Remove</button>}</td></tr>)}
   {!agents.data?.length&&<tr><td colSpan={6} className="px-4 py-5 text-fg-muted">{!address?"Connect a wallet to manage API access.":agents.isError?"Could not load API wallets.":agents.isLoading?"Loading API wallets…":"No API wallets authorized."}</td></tr>}
  </tbody></table></section>
  <p className="text-xs text-fg-muted">Key export is available only for keys held on this device. Hyperliquid cannot recover private keys.</p>
  <section className="space-y-2 text-sm"><h2 className="font-medium">Trade from a script</h2><p className="text-fg-muted">Save the generated file in your project folder. Check access, then preview an order before executing it.</p><pre className="overflow-x-auto rounded-lg bg-surface p-4 text-xs">{`node --env-file=.env.agent apps/terminal/scripts/x1-agent.mjs status\nnode --env-file=.env.agent apps/terminal/scripts/x1-agent.mjs order --file examples/api-order.json\n# Add --execute to submit the order`}</pre></section>
  {exportTarget&&address&&<ApiKeyExport key={`${address}:${env}:${exportTarget}`} owner={address} agent={exportTarget} network={env} resolveKey={()=>localKey(exportTarget)} onClose={()=>setExportTarget(null)} onSaved={()=>{if(exportTarget.toLowerCase()===agent.toLowerCase())setSaved(true);}} />}
 </div></main>;
}
