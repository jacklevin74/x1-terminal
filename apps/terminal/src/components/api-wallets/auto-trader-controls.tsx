import { useEffect, useRef, useState } from "react";
import type { Address, Hex } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { useWalletClient } from "wagmi";
import { useHyperliquid, useInfo } from "@/lib/hyperliquid";
import { useAutoTraderMutation, useAutoTraderStatus, useAutoTraderSignal } from "@/lib/auto-trader/hooks";
import { sealAgentKey } from "@/lib/auto-trader/api";
import { accountEquity, validateSettings } from "@/lib/auto-trader/targets";
import { AUTO_TRADER_BUILDER, AUTO_TRADER_DEFAULTS } from "@/config/auto-trader";

export function AutoTraderControls({owner,agent,validUntil,resolveKey}:{owner:Address;agent:Address;validUntil:number;resolveKey:()=>Hex}){
 const {env}=useHyperliquid(),{data:wallet}=useWalletClient();
 const signal=useAutoTraderSignal();
 const status=useAutoTraderStatus(owner),control=useAutoTraderMutation(owner);
 const agents=useInfo("extraAgents",{user:owner}),fee=useInfo("maxBuilderFee",{user:owner,builder:AUTO_TRADER_BUILDER});
 const main=useInfo("clearinghouseState",{user:owner}),xyz=useInfo("clearinghouseState",{user:owner,dex:"xyz"}),spot=useInfo("spotClearinghouseState",{user:owner}),mode=useInfo("userAbstraction",{user:owner});
 const [open,setOpen]=useState(false),[key,setKey]=useState(""),[busy,setBusy]=useState(false),[message,setMessage]=useState("");
 const lock=useRef(false),alive=useRef(true);
 useEffect(()=>{alive.current=true;return()=>{alive.current=false;};},[]);
 const selected=status.data?.registered&&status.data.agent?.toLowerCase()===agent.toLowerCase();
 async function run(start:boolean){
  if(lock.current)return;lock.current=true;setBusy(true);setMessage("");
  try{
   if(env!=="Mainnet"||!wallet)throw new Error("Connect your owner wallet on Mainnet.");
   const current=await status.refetch();if(!alive.current)return;
   if(current.isError||!current.data)throw new Error("Could not verify Auto Trader status.");
   const matches=current.data.registered&&current.data.agent?.toLowerCase()===agent.toLowerCase();
   if(!start){
    if(!matches)throw new Error("This API wallet is not the registered Auto Trader.");
    await control.mutateAsync({action:"pause",body:{}});
   }else{
    const feed=await signal.refetch();if(!alive.current)return;
    if(feed.isError||!feed.data)throw new Error("Market list unavailable. Refresh to retry.");
    validateSettings(current.data.settings??AUTO_TRADER_DEFAULTS,feed.data.coins.map(c=>c.coin));
    const [a,f,m,x,s,ab]=await Promise.all([agents.refetch(),fee.refetch(),main.refetch(),xyz.refetch(),spot.refetch(),mode.refetch()]);
    if(!alive.current)return;
    if([a,f,m,x,s,ab].some(q=>q.isError))throw new Error("Could not verify account readiness.");
    if(!a.data?.some(row=>row.address.toLowerCase()===agent.toLowerCase()&&row.validUntil>Date.now()))throw new Error("This API wallet is expired or no longer approved.");
    if(f.data===undefined||f.data<50)throw new Error("Approve the 0.05% builder fee first.");
    const equity=accountEquity(ab.data,m.data,x.data,s.data);
    if(equity===null||equity<15)throw new Error("Auto Trader requires at least $15 in verified account equity.");
    if(!matches||!current.data.hasKey){
     let secret:Hex;try{secret=resolveKey();}catch{secret=key.trim() as Hex;}
     if(!/^0x[\da-f]{64}$/i.test(secret)||privateKeyToAccount(secret).address.toLowerCase()!==agent.toLowerCase())throw new Error("Enter the private key matching this API wallet.");
     await control.mutateAsync({action:"register",body:pub=>({master:owner,agent,sealedKey:sealAgentKey(secret,pub),settings:current.data.settings??AUTO_TRADER_DEFAULTS})});
     secret="0x";setKey("");
    }
    await control.mutateAsync({action:"resume",body:{}});
   }
   if(alive.current){setOpen(false);setKey("");setMessage(start?"Auto Trader start accepted. Check service status below.":"Auto Trader stopped. Existing positions remain open.");await status.refetch();}
  }catch(error){if(alive.current)setMessage(error instanceof Error?error.message:"Auto Trader request failed. Refresh status before retrying.");}
  finally{lock.current=false;if(alive.current)setBusy(false);}
 }
 return <span className="mr-4 inline-flex flex-col items-start gap-2 whitespace-normal">
  <span className="flex gap-3"><button type="button" disabled={busy||env!=="Mainnet"||validUntil<=Date.now()||status.isError||!status.data||!!selected&&status.data.state==="active"} className="text-brand disabled:opacity-40" onClick={()=>{setMessage("");setOpen(true);}}>Start Auto Trader</button><button type="button" disabled={busy||!selected||status.isError||status.data?.state==="paused"||env!=="Mainnet"} className="text-error disabled:opacity-40" onClick={()=>void run(false)}>Stop Auto Trader</button></span>
  {open&&<span role="group" aria-label={`Start Auto Trader for ${agent}`} className="max-w-sm space-y-2 rounded border border-stroke-weak p-3 text-xs">
   <span className="block">Start using {agent}? This manages account-wide positions and may cause losses. One Auto Trader runs per owner; selecting this key replaces any other registered key. Settings from the Auto Trader panel apply (defaults: 3× leverage, 10% daily loss stop, $10 minimum order).</span>
   {(!selected||!status.data?.hasKey)&&<label className="block">Private key if unavailable on this device<input type="password" autoComplete="off" aria-label={`Auto Trader private key for ${agent}`} value={key} onChange={e=>setKey(e.target.value)} className="mt-1 w-full rounded bg-background p-2" /></label>}
   <button type="button" disabled={busy} className="mr-3 text-brand" onClick={()=>void run(true)}>{busy?"Confirm in wallet…":"Confirm start"}</button><button type="button" disabled={busy} onClick={()=>{setOpen(false);setKey("");}}>Cancel</button>
  </span>}
  {message&&<span role="status" className="max-w-sm text-xs">{message}</span>}
 </span>;
}
