import {useEffect,useRef,useState} from "react";
import {useConnection} from "wagmi";
import {useIsMutating} from "@tanstack/react-query";
import {zeroAddress,type Address} from "viem";
import {CheckIcon,CopyIcon,PlusIcon,ArrowsLeftRightIcon,PencilSimpleIcon} from "@phosphor-icons/react";
import {Modal,ModalPopup,ModalHeader,ModalTitle,ModalContent,ModalFooter} from "@hypeterminal/ui";
import {useHyperliquid,useHyperliquidClients,useInfo} from "@/lib/hyperliquid";
import {useNewtheme} from "@/components/newtheme/use-newtheme";
import {UserMenu} from "@/components/trade/header/user-menu";
import {useTradingAccount} from "@/hooks/use-trading-account";
import {useTradingAccountStore} from "@/stores/use-trading-account-store";
import {useOrderEntryActions} from "@/stores/use-order-entry-store";
import {useCopyToClipboard} from "@/hooks/ui/use-copy-to-clipboard";
import {getNetwork} from "@/lib/network";
import {formatTokenId} from "@/lib/trade/token-id";
import {subaccountName,subaccountTransferAmount,subaccountActionError} from "@/lib/trade/subaccounts";

const field="w-full rounded-lg border border-stroke-weak bg-background px-3 py-3 text-sm outline-none focus:border-brand disabled:opacity-40";
const primary="inline-flex items-center justify-center gap-2 rounded-lg bg-brand px-4 py-2.5 text-sm font-medium text-fg-inverse disabled:opacity-40";
const secondary="inline-flex items-center justify-center gap-2 rounded-lg border border-stroke-weak px-3 py-2 text-sm hover:bg-fill-weak disabled:opacity-40";
const money=(v:unknown)=>v!=null&&Number.isFinite(Number(v))?Number(v).toLocaleString(undefined,{style:"currency",currency:"USD",minimumFractionDigits:2,maximumFractionDigits:2}):"—";
type Operation={kind:"create"}|{kind:"rename";account:Address}|{kind:"transfer";account:Address;deposit:boolean;balance:"perps"|"spot"};

export function SubaccountsPage(){
 useNewtheme();const {address}=useConnection();const {env}=useHyperliquid();
 return <SubaccountsManager key={`${address??"none"}:${env}`} />;
}
function SubaccountsManager(){
 const {address}=useConnection();const {env}=useHyperliquid();const {user,trading}=useHyperliquidClients();
 const active=useTradingAccount(),select=useTradingAccountStore(s=>s.select),{resetForm}=useOrderEntryActions();
 const externalBusy=useIsMutating()>0;
 const accounts=useInfo("subAccounts",{user:address??zeroAddress},{enabled:!!address,refetchInterval:15000,refetchOnWindowFocus:true,refetchOnMount:"always"});
 const meta=useInfo("spotMeta",undefined,{staleTime:60000});
 const spot=useInfo("spotClearinghouseState",{user:address??zeroAddress},{enabled:!!address,refetchInterval:15000,refetchOnWindowFocus:true});
 const main=useInfo("clearinghouseState",{user:address??zeroAddress},{enabled:!!address,refetchInterval:15000,refetchOnWindowFocus:true});
 const rows=(accounts.data??[]).filter(a=>!!address&&a.master.toLowerCase()===address.toLowerCase());
 const [operation,setOperation]=useState<Operation|null>(null),[name,setName]=useState(""),[amount,setAmount]=useState(""),[review,setReview]=useState(false);
 const [busy,setBusy]=useState(false),[error,setError]=useState<string|null>(null),[message,setMessage]=useState<string|null>(null),[ascending,setAscending]=useState(true);
 const locked=useRef(false),alive=useRef(true),identity=useRef({address,env});identity.current={address,env};
 useEffect(()=>{alive.current=true;return()=>{alive.current=false;};},[]);
 const disabled=busy||externalBusy;
 const currentSub=operation&&operation.kind!=="create"?rows.find(r=>r.subAccountUser.toLowerCase()===operation.account.toLowerCase()):undefined;
 const open=(op:Operation)=>{if(op.kind==="transfer"&&Number(main.data?.withdrawable)===0&&spotAvailable(spot.data)>0)op={...op,balance:"spot"};setOperation(op);setName(op.kind==="rename"?rows.find(r=>r.subAccountUser===op.account)?.name??"":"");setAmount("");setReview(false);setError(null);setMessage(null);};
 const close=()=>{if(locked.current)return;setOperation(null);setReview(false);setError(null);};
 function check(){if(!alive.current||identity.current.address!==address||identity.current.env!==env)throw Error("Wallet or network changed. Reconnect the intended owner.");if(!address)throw Error("Connect your owner wallet to continue.");}
 function validate(){
  check();if(!operation)throw Error("Choose an action.");
  if(operation.kind==="create"||operation.kind==="rename"){subaccountName(name);if(!trading)throw Error("Enable terminal trading first to authorize a trading agent for subaccount creation and renaming.");}
  if(operation.kind!=="create"&&!currentSub)throw Error("This subaccount is no longer available for the connected owner. Refresh accounts.");
  if(operation.kind==="transfer"){
   if(!user)throw Error("Unlock and connect your owner wallet to transfer funds.");
   const units=subaccountTransferAmount(amount),source=operation.deposit?main.data:currentSub?.clearinghouseState;
   const available=operation.balance==="spot"?spotAvailable(operation.deposit?spot.data:currentSub?.spotState):source?.withdrawable;
   if(accounts.isError||(operation.deposit&&(operation.balance==="spot"?spot.isError:main.isError))||available==null||!Number.isFinite(Number(available)))throw Error("Refresh accounts to load a verified transferable balance.");
   if(operation.balance==="spot"&&!meta.data?.tokens.find(t=>t.name==="USDC"))throw Error("USDC token metadata is unavailable. Refresh before retrying.");
   if(units/1e6>Number(available))throw Error("Amount exceeds the source account’s available USDC balance.");
  }
 }
 function preview(){try{validate();setError(null);setReview(true);}catch(e){setError(e instanceof Error?e.message:"Invalid request.");}}
 async function confirm(){
  if(locked.current||externalBusy||!review)return;
  try{validate();}catch(e){setError(e instanceof Error?e.message:"Invalid request.");return;}
  if(!operation||(operation.kind==="transfer"?!user:!trading))return;
  locked.current=true;setBusy(true);setError(null);setMessage(null);
  try{
   check();
   if(operation.kind!=="create"){
    const fresh=await accounts.refetch();check();
    if(fresh.isError||!fresh.data?.some(a=>a.master.toLowerCase()===address!.toLowerCase()&&a.subAccountUser.toLowerCase()===operation.account.toLowerCase()))throw Error("Could not verify subaccount ownership. Refresh before retrying.");
    if(operation.kind==="transfer"){
     const source=operation.deposit?await (operation.balance==="spot"?spot:main).refetch():null;check();
     const sub=fresh.data.find(a=>a.subAccountUser.toLowerCase()===operation.account.toLowerCase());
     const available=operation.balance==="spot"?spotAvailable(operation.deposit?source?.data as Parameters<typeof spotAvailable>[0]:sub?.spotState):Number(operation.deposit?(source?.data as {withdrawable?:string})?.withdrawable:sub?.clearinghouseState.withdrawable);
     if(source?.isError||!Number.isFinite(available))throw Error("Could not verify the current transferable balance.");
     if(subaccountTransferAmount(amount)/1e6>available)throw Error("Transferable balance changed. Review a smaller transfer.");
    }
   }
   if(operation.kind==="create")await trading!.createSubAccount({name:subaccountName(name)});
   else if(operation.kind==="rename")await trading!.subAccountModify({subAccountUser:operation.account,name:subaccountName(name)});
   else if(operation.balance==="spot"){
    const token=meta.data?.tokens.find(t=>t.name==="USDC");if(!token)throw Error("USDC token metadata unavailable.");
    await user!.sendAsset({destination:operation.deposit?operation.account:address!,sourceDex:"spot",destinationDex:"spot",fromSubAccount:operation.deposit?"":operation.account,token:formatTokenId(token),amount:amount.trim()});
   }else await user!.subAccountTransfer({subAccountUser:operation.account,isDeposit:operation.deposit,usd:subaccountTransferAmount(amount)});
   check();
   if(operation.kind==="rename"&&active.address?.toLowerCase()===operation.account.toLowerCase())select({owner:address!,network:getNetwork(),address:operation.account,name:subaccountName(name)});
   setOperation(null);setReview(false);
   setMessage(operation.kind==="create"?"Subaccount created. No funds transferred.":operation.kind==="rename"?"Subaccount renamed.":"Transfer accepted by Hyperliquid. Balances are refreshing.");
   const refreshed=await Promise.all([accounts.refetch(),main.refetch(),spot.refetch()]);check();
   if(refreshed.some(r=>r.isError))setError("Action accepted, but balances could not be refreshed. Refresh accounts to verify.");
  }catch(e){if(alive.current){setReview(false);setError(subaccountActionError(e));}}
  finally{locked.current=false;if(alive.current)setBusy(false);}
 }
 function choose(row?:typeof rows[number]){if(disabled||!address)return;select(row?{owner:address,network:getNetwork(),address:row.subAccountUser,name:row.name}:null);resetForm();}
 const headings=<><colgroup><col className="w-[20%]"/><col className="w-[35%]"/><col className="w-[14%]"/><col className="w-[14%]"/><col className="w-[17%]"/></colgroup><thead className="text-xs text-fg-muted"><tr><th className="py-3 pr-4 font-normal" aria-sort={ascending?"ascending":"descending"}><button onClick={()=>setAscending(v=>!v)}>Name {ascending?"↓":"↑"}</button></th><th className="py-3 pr-4 font-normal">Address</th><th className="py-3 pr-4 text-right font-normal">Perps account equity</th><th className="py-3 pr-4 text-right font-normal">Spot USDC</th><th className="py-3 text-right font-normal">Action</th></tr></thead></>;
 const tableClass="w-full min-w-[1120px] table-fixed text-left text-sm";
 return <main className="min-h-dvh bg-background text-fg"><div className="mx-auto max-w-[1800px] space-y-5 px-4 py-5 sm:px-8 lg:px-12">
  <header className="flex flex-wrap items-center justify-between gap-4"><a href="/newtheme" className="text-xs text-fg-muted hover:text-fg">← X1 Terminal</a><div className="flex items-center gap-5"><a href="/api_keys" className="text-xs text-fg-muted hover:text-fg">API wallets</a><UserMenu/></div></header>
  <section className="flex flex-wrap items-end justify-between gap-4 pb-3 pt-2"><div><h1 className="text-4xl font-medium tracking-tight sm:text-5xl">Subaccounts</h1><p className="mt-3 text-xs text-fg-muted">{env} · {address?"Manage accounts connected to your wallet":"Connect your wallet to manage subaccounts"}</p></div><div className="flex items-center gap-4"><button className="text-xs text-brand disabled:opacity-40" disabled={!address||disabled||accounts.isFetching} onClick={()=>void Promise.all([accounts.refetch(),main.refetch(),spot.refetch()])}>Refresh accounts</button><button className={primary} disabled={!address||disabled} onClick={()=>open({kind:"create"})}><PlusIcon className="size-4"/>Create subaccount</button></div></section>
  <section aria-label="Manage subaccounts" className="overflow-hidden rounded-xl border border-stroke-weak bg-surface px-4 py-4 sm:px-5">
   <h2 className="text-base font-medium">Main account</h2>
   <div className="overflow-x-auto"><table aria-label="Main account" className={tableClass}>{headings}<tbody>
    {address&&<tr><td className="py-2 pr-4"><span>Main account</span>{!active.isSubaccount&&<Selected/>}</td><td className="py-2 pr-4"><AccountAddress address={address}/></td><td className="py-2 pr-4 text-right tabular-nums">{money(main.data?.marginSummary.accountValue)}</td><td className="py-2 pr-4 text-right tabular-nums">{money(spot.data?.balances.find(b=>b.coin==="USDC")?.total??(spot.data?"0":undefined))}</td><td className="py-2 text-right"><button className={secondary} disabled={disabled||!active.isSubaccount} onClick={()=>choose()}>Select</button></td></tr>}
   </tbody></table></div>
   <h2 className="mt-6 text-base font-medium">Subaccounts</h2>
   <div className="overflow-x-auto"><table aria-label="Subaccounts" className={tableClass}>{headings}<tbody>
    {[...rows].sort((a,b)=>(ascending?1:-1)*a.name.localeCompare(b.name)).map(row=><tr key={row.subAccountUser}><td className="py-2 pr-4"><div className="flex min-w-0 items-center gap-2"><span className="truncate" title={row.name}>{row.name}</span><button aria-label={`Rename ${row.name}`} title="Rename subaccount" className="shrink-0 p-1 text-brand disabled:opacity-40" disabled={disabled||accounts.isError} onClick={()=>open({kind:"rename",account:row.subAccountUser})}><PencilSimpleIcon className="size-4"/></button>{active.address?.toLowerCase()===row.subAccountUser.toLowerCase()&&<Selected/>}</div></td><td className="py-2 pr-4"><AccountAddress address={row.subAccountUser}/></td><td className="py-2 pr-4 text-right tabular-nums">{money(row.clearinghouseState?.marginSummary.accountValue)}</td><td className="py-2 pr-4 text-right tabular-nums">{money(row.spotState?.balances.find(b=>b.coin==="USDC")?.total??(row.spotState?"0":undefined))}</td><td className="py-2"><div className="flex justify-end gap-2"><button title="Use this account for trading in the terminal" className={secondary} disabled={disabled||accounts.isError||active.address?.toLowerCase()===row.subAccountUser.toLowerCase()} onClick={()=>choose(row)}>Select</button><button className={secondary} disabled={disabled||!user||accounts.isError} onClick={()=>open({kind:"transfer",account:row.subAccountUser,deposit:true,balance:"perps"})}><ArrowsLeftRightIcon className="size-4"/>Transfer</button></div></td></tr>)}
   </tbody></table></div>
   {(!address||accounts.isLoading||accounts.isError||!rows.length)&&<p role={accounts.isError?"alert":"status"} className={`py-5 text-sm ${accounts.isError?"text-error":"text-fg-muted"}`}>{!address?"Connect your owner wallet to view subaccounts.":accounts.isError?"Could not refresh subaccounts. Displayed balances may be stale. Refresh to retry.":accounts.isLoading?"Loading subaccounts…":"No subaccounts yet. Create one to keep strategies separate."}</p>}
  </section>
  {error&&!operation&&<p role="alert" className="text-sm text-error">{error}</p>}{message&&<p role="status" className="text-sm text-brand">{message}</p>}
  <p className="max-w-4xl text-xs leading-relaxed text-fg-muted">Perps equity and spot USDC are shown separately; neither is a combined portfolio valuation. Choose perps or spot/unified USDC when transferring between your main account and the chosen subaccount. Hyperliquid enforces margin requirements for both. Hyperliquid checks available collateral and creation eligibility. Selecting an account changes the terminal’s trading context; it does not enable Auto Trader.</p>
  <Modal open={!!operation} onOpenChange={v=>{if(!v)close();}}><ModalPopup size="sm"><ModalHeader><ModalTitle>{operation?.kind==="create"?"Create subaccount":operation?.kind==="rename"?"Rename subaccount":"Transfer USDC"}</ModalTitle></ModalHeader><ModalContent>
   <form id="subaccount-action" className="space-y-4" onSubmit={e=>{e.preventDefault();if(review)void confirm();else preview();}}>
    <p className="text-xs text-fg-muted">{env} · {operation?.kind==="transfer"?"Signed by your connected owner wallet.":"Signed by your approved terminal trading agent. No funds transferred."}</p>
    {operation?.kind==="transfer"?<><label className="block space-y-2 text-sm"><span>Direction</span><select aria-label="Transfer direction" className={field} disabled={busy||review} value={operation.deposit?"deposit":"withdraw"} onChange={e=>{setOperation({...operation,deposit:e.target.value==="deposit"});setError(null);}}><option value="deposit">Main account → {currentSub?.name??"Subaccount"}</option><option value="withdraw">{currentSub?.name??"Subaccount"} → Main account</option></select></label><label className="block space-y-2 text-sm"><span>Balance</span><select aria-label="Transfer balance" className={field} disabled={busy||review} value={operation.balance} onChange={e=>{setOperation({...operation,balance:e.target.value as "perps"|"spot"});setError(null);}}><option value="perps">Perpetual USDC</option><option value="spot">Spot / unified USDC</option></select></label><p className="break-all text-xs text-fg-muted">Subaccount: {operation.account}</p><label className="block space-y-2 text-sm"><span>Amount (USDC)</span><input aria-label="Amount (USDC)" inputMode="decimal" autoComplete="off" className={field} value={amount} disabled={busy||review} onChange={e=>{setAmount(e.target.value);setError(null);}} placeholder="0.00"/></label><p className="text-xs text-fg-muted">{operation.balance==="spot"?"Unheld spot balance":"Transferable"}: {money(operation.balance==="spot"?spotAvailable(operation.deposit?spot.data:currentSub?.spotState):operation.deposit?main.data?.withdrawable:currentSub?.clearinghouseState.withdrawable)} USDC. Hyperliquid may require part of this balance as collateral. Moving collateral out can increase liquidation risk.</p></>:<label className="block space-y-2 text-sm"><span>Subaccount name</span><input aria-label="Subaccount name" className={field} value={name} maxLength={16} disabled={busy||review} onChange={e=>{setName(e.target.value);setError(null);}} placeholder="e.g. HYPE strategy"/></label>}
    {review&&<p className="rounded-lg border border-brand/30 bg-brand/5 p-3 text-sm">{operation?.kind==="transfer"?`Confirm ${amount.trim()} USDC (${operation.balance==="spot"?"spot / unified":"perpetual"}) from ${operation.deposit?"Main account":currentSub?.name} to ${operation.deposit?currentSub?.name:"Main account"}.`:operation?.kind==="rename"?`Rename ${currentSub?.name} to “${name.trim()}”.`:`Create “${name.trim()}”. No funds will be transferred.`}</p>}
    {error&&<p role="alert" className="text-sm text-error">{error}</p>}
   </form>
  </ModalContent><ModalFooter><button className={secondary} disabled={busy} onClick={()=>{if(review){setReview(false);setError(null);}else close();}}>{review?"Back":"Cancel"}</button><button type="submit" form="subaccount-action" className={primary} disabled={disabled||(operation?.kind==="transfer"&&!user)} onClick={e=>{if(operation?.kind!=="transfer"&&!trading){e.preventDefault();setOperation(null);window.dispatchEvent(new Event("x1:setup"));}}}>{operation?.kind!=="transfer"&&!trading?"Enable trading":busy?operation?.kind==="transfer"?"Confirm in wallet…":"Submitting…":review?operation?.kind==="transfer"?"Confirm in wallet":"Confirm":"Review"}</button></ModalFooter></ModalPopup></Modal>
 </div></main>;
}
function Selected(){return <span className="ml-2 shrink-0 rounded bg-brand/10 px-2 py-0.5 text-[10px] text-brand">Selected</span>;}
function AccountAddress({address}:{address:string}){const {copy,copied}=useCopyToClipboard(1800);return <span className="inline-flex items-center gap-1 font-mono text-xs"><span title={address}>{address}</span><button aria-label={`Copy address ${address}`} title={copied?"Copied":"Copy address"} onClick={()=>void copy(address)} className="p-1 text-fg-muted hover:text-brand">{copied?<CheckIcon className="size-3.5"/>:<CopyIcon className="size-3.5"/>}</button></span>;}

function spotAvailable(state:{balances:{coin:string;total:string;hold:string}[]}|undefined){if(!state)return NaN;const b=state.balances.find(b=>b.coin==="USDC");return b?Math.max(0,Number(b.total)-Number(b.hold)):0;}
