import {useEffect,useRef,useState} from "react";
import {useConnection} from "wagmi";
import {zeroAddress} from "viem";
import {CopyIcon,CheckIcon} from "@phosphor-icons/react";
import {useCopyToClipboard} from "@/hooks/ui/use-copy-to-clipboard";
import {useHyperliquid,useHyperliquidClients,useInfo} from "@/lib/hyperliquid";

export function SubaccountsSection(){
 const {address}=useConnection();const {env}=useHyperliquid();const {user}=useHyperliquidClients();
 const accounts=useInfo("subAccounts",{user:address??zeroAddress},{enabled:!!address,refetchOnWindowFocus:true,refetchInterval:30000});
 const [name,setName]=useState("");const [busy,setBusy]=useState(false);const [error,setError]=useState<string|null>(null);const [message,setMessage]=useState<string|null>(null);
 const identity=useRef({address,env});identity.current={address,env};const locked=useRef(false),alive=useRef(true);
 useEffect(()=>{alive.current=true;return()=>{alive.current=false;};},[]);
 useEffect(()=>{setName("");setError(null);setMessage(null);},[address,env]);
 async function create(){
  if(locked.current)return;
  const trimmed=name.trim();if(!address||!user){setError("Connect and unlock your owner wallet to create a subaccount.");return;}
  if(!trimmed||trimmed.length>16){setError("Use a subaccount name from 1 to 16 characters.");return;}
  const owner=address,network=env;const current=()=>alive.current&&identity.current.address===owner&&identity.current.env===network;
  locked.current=true;setBusy(true);setError(null);setMessage("Confirm subaccount creation in your owner wallet. No funds will be transferred.");
  try{
   const result=await user.createSubAccount({name:trimmed});if(!current())return;
   setName("");setMessage(`Subaccount created: ${result.response.data}. No funds were transferred. This account is not connected to Auto Trader.`);
   const refreshed=await accounts.refetch();if(current()&&refreshed.isError)setError("Created successfully, but the account list could not be refreshed. Refresh accounts to check.");
  }catch(e){if(current()){setMessage(null);setError(`${e instanceof Error?e.message:"Subaccount creation failed."} Refresh accounts before retrying to check whether creation succeeded.`);}}
  finally{locked.current=false;if(alive.current)setBusy(false);}
 }
 return <section id="subaccounts" aria-label="Subaccounts" className="space-y-3 rounded-xl border border-stroke-weak bg-surface p-4 scroll-mt-4">
  <div className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-sm font-semibold">Subaccounts</h2><button type="button" disabled={!address||busy} onClick={()=>void accounts.refetch()} className="text-xs text-brand disabled:opacity-40">Refresh accounts</button></div>
  <p className="text-xs leading-relaxed text-fg-muted">Subaccounts have separate trading balances under your owner account. Hyperliquid currently requires $100,000 in trading volume to unlock creation and enforces account limits. Creating one transfers no funds and does not start a bot.</p>
  <form className="flex flex-wrap items-end gap-3" onSubmit={e=>{e.preventDefault();void create();}}><label className="min-w-0 flex-1 text-xs text-fg-muted">Subaccount name<input aria-label="Subaccount name" maxLength={16} value={name} disabled={busy||!address} onChange={e=>setName(e.target.value)} placeholder="e.g. HYPE strategy" className="mt-1 w-full rounded-lg border border-stroke-weak bg-background px-3 py-2 text-sm text-fg outline-none focus:border-brand" /></label><button type="submit" disabled={busy||!address||!user||!name.trim()} className="rounded-lg bg-brand px-3 py-2 text-sm font-medium text-fg-inverse disabled:opacity-40">{busy?"Confirm in wallet…":"Create subaccount"}</button></form>
  <p className="text-xs text-fg-muted">Signed by your owner wallet on {env}. Auto Trader currently uses the owner account; subaccount trading and funding transfers are not configured here.</p>
  {error&&<p role="alert" className="break-words text-xs text-error">{error}</p>}{message&&<p role="status" className="break-words text-xs text-brand">{message}</p>}
  {accounts.data?.length?<ul className="grid gap-2 sm:grid-cols-2">{accounts.data.map(account=><li key={account.subAccountUser} className="min-w-0 rounded-lg border border-stroke-weak p-3"><span className="block truncate text-xs font-medium">{account.name}</span><SubaccountAddress address={account.subAccountUser} /></li>)}</ul>:<p className="text-xs text-fg-muted">{!address?"Connect your owner wallet to view and create subaccounts.":accounts.isError?"Could not load subaccounts. Refresh accounts to retry.":accounts.isLoading?"Loading subaccounts…":"No subaccounts found."}</p>}
 </section>;
}
function SubaccountAddress({address}:{address:string}){
 const {copy,copied}=useCopyToClipboard(1800);
 return <div className="mt-1 flex min-w-0 items-center gap-1"><span className="min-w-0 truncate font-mono text-[11px] text-fg-muted" title={address}>{address}</span><button type="button" aria-label={`Copy subaccount address ${address}`} title={copied?"Copied":"Copy address"} onClick={()=>void copy(address)} className="inline-flex size-6 shrink-0 items-center justify-center text-brand">{copied?<CheckIcon className="size-3.5" />:<CopyIcon className="size-3.5" />}</button></div>;
}
