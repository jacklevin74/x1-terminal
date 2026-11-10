import { useNewtheme } from "@/components/newtheme/use-newtheme";
import { useState, type ReactNode } from "react";
import { CopyIcon, CheckIcon, CaretDownIcon, CaretUpIcon } from "@phosphor-icons/react";
import type { Address } from "viem";
import { useCopyToClipboard } from "@/hooks/ui/use-copy-to-clipboard";
import { apiWalletBaseName, agentApprovalCurrent } from "@/lib/trade/api-wallets";
import { UserMenu } from "@/components/trade/header/user-menu";
import { Modal, ModalContent, ModalFooter, ModalHeader, ModalPopup, ModalTitle } from "@hypeterminal/ui";

type Agent={name:string;address:Address;validUntil?:number|null};
interface Props {
 owner?:Address;network:string;agents?:readonly Agent[];loading:boolean;failed:boolean;
 name:string;agent:string;days:number;busy:boolean;canAuthorize:boolean;
 onName:(value:string)=>void;onAgent:(value:string)=>void;onDays:(value:number)=>void;
 onGenerate:()=>void;onAuthorize:()=>void;onRefresh:()=>void;
 onRemove:(agent:Agent)=>void;onRequestRemove:(address:string|null)=>void;
 pendingRemove:string|null;feedback:{address:string;error?:string;message?:string}|null;
 error:string|null;message:string|null;backup:ReactNode;remoteKeys?:ReactNode;
}
const input="min-w-0 w-full rounded-lg border border-stroke-weak bg-transparent px-3 py-3 text-sm text-fg outline-none placeholder:text-fg-muted focus:border-brand disabled:opacity-40";
const action="rounded-lg bg-brand px-5 py-3 text-sm font-medium text-fg-inverse hover:opacity-90 disabled:opacity-40";
export function ApiKeysView(props:Props) {
 useNewtheme();
 const [ascending,setAscending]=useState(true);
 const agents=[...(props.agents??[])].sort((a,b)=>(ascending?1:-1)*apiWalletBaseName(a.name).localeCompare(apiWalletBaseName(b.name),undefined,{numeric:true,sensitivity:"base"}));
 const removing=agents.find(a=>a.address===props.pendingRemove);
 const removalFeedback=props.feedback?.address===removing?.address?props.feedback:null;
 return <main className="relative isolate min-h-dvh overflow-hidden bg-background text-fg">
  <div className="relative mx-auto max-w-[1800px] space-y-5 px-4 pb-16 pt-5 sm:px-8 lg:px-12">
   <header className="flex flex-wrap items-center justify-between gap-3"><a href="/newtheme" className="text-xs text-fg-muted hover:text-fg">← X1 Terminal</a><div className="flex items-center gap-4"><a href="/API#auto-trader" className="text-xs text-fg-muted hover:text-fg">Auto Trader ↗</a><UserMenu/></div></header>
   <section className="pb-3"><h1 className="text-4xl font-medium tracking-tight sm:text-5xl">API</h1><p className="mt-4 max-w-4xl text-sm leading-relaxed sm:text-base">API wallets (also known as agent wallets) can perform actions on behalf of an account without having withdrawal permissions. Use the account’s public address for info requests.</p><p className="mt-3 break-all text-xs text-fg-muted">{props.network} · Connected owner: <span className="select-all">{props.owner??"Connect your wallet to manage API access"}</span></p></section>
   <section aria-label="Authorize API wallet" className="rounded-xl border border-stroke-weak bg-surface p-3 sm:p-4">
    <div className="grid items-end gap-3 lg:grid-cols-[minmax(160px,1fr)_minmax(220px,1.5fr)_auto_auto]">
     <label className="block"><span className="sr-only">API wallet name</span><input aria-label="API wallet name" value={props.name} placeholder="The name for the API wallet, e.g. my_api_wallet" maxLength={16} onChange={e=>props.onName(e.target.value)} disabled={props.busy} className={input}/></label>
     <div className="relative"><label><span className="sr-only">API wallet address</span><input aria-label="API wallet address" value={props.agent} onChange={e=>props.onAgent(e.target.value)} disabled={props.busy} placeholder="Address of API wallet, e.g. 0x123…" className={`${input} pr-24`}/></label><button type="button" onClick={props.onGenerate} disabled={props.busy||!props.owner} className="absolute inset-y-0 right-3 text-sm text-brand hover:text-fg disabled:opacity-40">Generate</button></div>
     <label className="block"><span className="sr-only">API wallet expiry</span><select aria-label="API wallet expiry" value={props.days} disabled={props.busy} onChange={e=>props.onDays(Number(e.target.value))} className={`${input} bg-surface`}>{[7,30,90,180].map(days=><option key={days} value={days}>{days} days</option>)}</select></label>
     <button type="button" disabled={!props.canAuthorize} onClick={props.onAuthorize} className={action}>{props.busy?"Confirm in wallet…":"Authorize API Wallet"}</button>
    </div>
    {props.backup}
    <p className="mt-3 text-xs text-fg-muted">Do not fund API wallet addresses. Fund your trading account. Generated keys must be backed up before authorization.</p>
    {props.error&&<p role="alert" className="mt-3 text-sm text-error">{props.error}</p>}{props.message&&<p role="status" className="mt-3 text-sm text-brand">{props.message}</p>}
   </section>
   {props.remoteKeys}
   <section aria-label="API wallets" className="rounded-xl border border-stroke-weak bg-surface px-4 py-3 sm:px-5">
    <div className="overflow-x-auto"><table className="w-full min-w-[780px] table-fixed text-left text-sm"><colgroup><col className="w-[22%]"/><col className="w-[49%]"/><col className="w-[21%]"/><col className="w-[8%]"/></colgroup><thead><tr className="text-fg-muted"><th className="py-2 pr-4 font-normal" aria-sort={ascending?"ascending":"descending"}><button type="button" onClick={()=>setAscending(v=>!v)} className="inline-flex items-center gap-2">API Wallet Name {ascending?<CaretDownIcon aria-hidden="true" className="size-3"/>:<CaretUpIcon aria-hidden="true" className="size-3"/>}</button></th><th className="py-2 pr-4 font-normal">API Wallet Address</th><th className="py-2 pr-4 font-normal">Valid Until</th><th className="sticky right-0 z-10 bg-surface py-2 pl-2 font-normal">Action</th></tr></thead><tbody>
     {agents.map(agent=>{const label=apiWalletBaseName(agent.name)||"Unnamed",expired=!agentApprovalCurrent(agent.validUntil);return <tr key={agent.address} data-api-wallet={agent.address}><td className="truncate py-2 pr-4" title={label}>{label}</td><td className="py-2 pr-4"><KeyAddress address={agent.address} name={label}/></td><td className={`py-2 pr-4 whitespace-nowrap text-xs ${expired?"text-warning":""}`} title={agent.validUntil==null?"Does not expire":new Date(agent.validUntil).toLocaleString()}>{agent.validUntil==null?"Does not expire":new Date(agent.validUntil).toLocaleString()}{expired&&" · Expired"}</td><td className="sticky right-0 z-10 bg-surface py-2 pl-2"><button type="button" aria-label={`Remove API wallet ${label}`} onClick={()=>props.onRequestRemove(agent.address)} disabled={props.busy} className="text-error hover:text-error disabled:opacity-40">Remove</button></td></tr>;})}
     {!agents.length&&<tr><td colSpan={4} className="py-6 text-center text-fg-muted">{!props.owner?"Connect a wallet to manage API access.":props.failed?"Could not load API wallets. Refresh to retry.":props.loading?"Loading API wallets…":"No API wallets authorized."}</td></tr>}
    </tbody></table></div>
    <div className="mt-2 flex justify-end"><button type="button" disabled={props.busy||!props.owner} onClick={props.onRefresh} className="py-1 text-xs text-brand disabled:opacity-40">Refresh wallets</button></div>
   </section>
   {removing&&<Modal open onOpenChange={open=>{if(!open&&!props.busy)props.onRequestRemove(null);}}><ModalPopup size="sm"><ModalHeader><ModalTitle>Remove {apiWalletBaseName(removing.name)||"Unnamed"}?</ModalTitle></ModalHeader><ModalContent className="space-y-3"><p className="break-all font-mono text-xs text-fg-muted">{removing.address}</p><p className="text-sm">Revoke this key’s trading access with the connected owner wallet. Existing positions and submitted orders remain.</p>{removalFeedback?.error&&<p role="alert" className="text-sm text-error">{removalFeedback.error}</p>}{removalFeedback?.message&&<p role="status" className="text-sm text-brand">{removalFeedback.message}</p>}</ModalContent><ModalFooter><button type="button" disabled={props.busy} onClick={()=>props.onRequestRemove(null)} className="px-4 py-2 text-sm text-fg-muted">Cancel</button><button type="button" disabled={props.busy} onClick={()=>props.onRemove(removing)} className="rounded-lg bg-error px-4 py-2 text-sm text-fg-inverse disabled:opacity-40">{props.busy?"Confirm in wallet…":"Confirm removal"}</button></ModalFooter></ModalPopup></Modal>}
  </div>
 </main>;
}
function KeyAddress({address,name}:{address:Address;name:string}) {
 const {copy,copied}=useCopyToClipboard(1800);
 return <div className="flex min-w-0 items-center gap-2"><span className="truncate select-all" title={address}>{address}</span><button type="button" aria-label={`Copy API wallet address for ${name}`} onClick={()=>void copy(address)} className="shrink-0 text-fg-muted hover:text-brand">{copied?<CheckIcon className="size-3.5 text-success"/>:<CopyIcon className="size-3.5"/>}</button></div>;
}
