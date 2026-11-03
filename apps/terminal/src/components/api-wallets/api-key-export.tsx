import { Modal, ModalPopup, ModalHeader, ModalTitle, ModalContent } from "@hypeterminal/ui";
import { useEffect, useState } from "react";
import type { Address, Hex } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { apiWalletEnv } from "@/lib/trade/api-wallets";

export function ApiKeyExport({owner,agent,network,resolveKey,onClose,onSaved}:{owner:Address;agent:Address;network:"Mainnet"|"Testnet";resolveKey:()=>Hex;onClose:()=>void;onSaved:()=>void}){
 const [ack,setAck]=useState(false),[key,setKey]=useState<Hex|null>(null),[error,setError]=useState<string|null>(null),[copied,setCopied]=useState(false);
 useEffect(()=>{
  const hide=()=>{setKey(null);setAck(false);setCopied(false);};
  const visibility=()=>{if(document.hidden)hide();};
  window.addEventListener("blur",hide);document.addEventListener("visibilitychange",visibility);
  const timer=key?window.setTimeout(hide,60000):undefined;
  return()=>{window.removeEventListener("blur",hide);document.removeEventListener("visibilitychange",visibility);window.clearTimeout(timer);};
 },[key]);
 function current(){const value=resolveKey();if(privateKeyToAccount(value).address.toLowerCase()!==agent.toLowerCase())throw new Error("API wallet changed. Close this dialog and try again.");return value;}
 const control="w-full rounded-lg bg-brand px-4 py-2.5 text-sm font-medium text-fg-inverse disabled:opacity-40";
 return <Modal open onOpenChange={open=>{if(!open)onClose();}}><ModalPopup size="md"><ModalHeader><ModalTitle>Export API wallet private key</ModalTitle></ModalHeader><ModalContent className="space-y-4">
  <p className="break-all font-mono text-xs">{agent}</p>
  <p role="note" className="rounded-lg border border-error p-3 text-sm text-error">Anyone with this key can trade your account and cause losses. It cannot withdraw funds. Never share it or send it to support. Store your backup securely.</p>
  {!key?<><label className="flex items-start gap-2 text-sm"><input type="checkbox" checked={ack} onChange={e=>setAck(e.target.checked)} />I understand the risk and am in a private place.</label><button className={control} disabled={!ack} onClick={()=>{setError(null);try{setKey(current());}catch(e){setError(e instanceof Error?e.message:"Key unavailable.");}}}>Reveal private key</button></>:<>
   <textarea aria-label="API wallet private key" value={key} readOnly autoComplete="off" spellCheck={false} className="w-full resize-none rounded-lg border border-stroke-weak bg-background p-3 font-mono text-xs" />
   <p className="text-xs text-fg-muted">Hidden after 60 seconds or when you leave this tab. Copying places the key on your system clipboard.</p>
   <div className="flex gap-2"><button className={control} onClick={async()=>{setError(null);try{await navigator.clipboard.writeText(current());setCopied(true);onSaved();}catch{setError("Could not copy. Check clipboard permissions or download the file.");}}}>{copied?"Private key copied":"Copy private key"}</button>
   <button className={control} onClick={()=>{setError(null);try{const url=URL.createObjectURL(new Blob([apiWalletEnv(owner,current(),network)],{type:"text/plain"}));const link=document.createElement("a");link.href=url;link.download=".env.agent";document.body.append(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);onSaved();}catch(e){setError(e instanceof Error?e.message:"Could not download key.");}}}>Download .env.agent</button></div>
  </>}
  {error&&<p role="alert" className="text-sm text-error">{error}</p>}
  <button className="w-full py-2 text-sm text-fg-muted" onClick={onClose}>Close</button>
 </ModalContent></ModalPopup></Modal>;
}
