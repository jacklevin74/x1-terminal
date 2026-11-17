import {useIsMutating} from "@tanstack/react-query";
import {Popover} from "@base-ui/react/popover";
import {CaretDownIcon,CheckIcon,CopyIcon} from "@phosphor-icons/react";
import {useEffect,useState} from "react";
import {useConnection,useDisconnect} from "wagmi";
import {zeroAddress} from "viem";
import {Button} from "@hypeterminal/ui";
import {useTradingAccount} from "@/hooks/use-trading-account";
import {useCopyToClipboard} from "@/hooks/ui/use-copy-to-clipboard";
import {useTradingAccountStore} from "@/stores/use-trading-account-store";
import {useOrderEntryActions} from "@/stores/use-order-entry-store";
import {getNetwork} from "@/lib/network";
import {clearX1Session} from "@/lib/x1/provider";
import {removeAgentFromStorage,useInfo} from "@/lib/hyperliquid";
import {AccountModeControl} from "../components/account-mode-control";
import {WalletModal} from "../components/wallet-modal";

export function UserMenu(){
 const {address,isConnected}=useConnection();
 const {mutate:disconnect}=useDisconnect();
 const active=useTradingAccount(),mutating=useIsMutating()>0;
 const select=useTradingAccountStore(s=>s.select),{resetForm}=useOrderEntryActions();
 const subaccounts=useInfo("subAccounts",{user:address??zeroAddress},{enabled:isConnected&&!!address,refetchOnWindowFocus:true,refetchInterval:30000});
 const rows=address?(subaccounts.data??[]).filter(row=>row.master.toLowerCase()===address.toLowerCase()):[];
 const [walletOpen,setWalletOpen]=useState(false),[pickerOpen,setPickerOpen]=useState(false);
 useEffect(()=>{setPickerOpen(false);},[address]);
 const choose=(account:typeof rows[number]|null)=>{if(!address||mutating)return;select(account?{owner:address,network:getNetwork(),address:account.subAccountUser,name:account.name}:null);resetForm();setPickerOpen(false);};
 if(!isConnected||!address)return <><Button variant="outline" intent="neutral" size="sm" onClick={()=>setWalletOpen(true)}>Connect Wallet</Button><WalletModal open={walletOpen} onOpenChange={setWalletOpen}/></>;
 const short=`${address.slice(0,6)}…${address.slice(-4)}`;
 return <>{!active.isSubaccount&&<AccountModeControl/>}<Popover.Root open={pickerOpen} onOpenChange={setPickerOpen}>
  <Popover.Trigger aria-label="Account and wallet" className="inline-flex max-w-64 items-center gap-2 rounded-lg border border-stroke-strong bg-background px-3 py-1.5 text-xs font-medium text-fg outline-none focus-visible:ring-2 focus-visible:ring-brand/50"><span className="truncate">{active.isSubaccount?`Sub: ${active.subaccount?.name}`:`Main: ${short}`}</span><CaretDownIcon aria-hidden="true" className={`size-3.5 shrink-0 transition-transform ${pickerOpen?"rotate-180":""}`}/></Popover.Trigger>
  <Popover.Portal><Popover.Positioner align="end" sideOffset={6} collisionPadding={12} className="z-[var(--z-dropdown)]"><Popover.Popup aria-label="Switch trading account" className="flex max-h-[min(70dvh,480px)] w-[340px] max-w-[calc(100vw-24px)] flex-col rounded-xl border border-stroke-weak bg-surface p-2 text-sm text-fg shadow-overlay outline-none">
   <div className="min-h-0 overflow-y-auto">
    <AccountRow kind="Master" label={short} address={address} selected={!active.isSubaccount} disabled={mutating} onSelect={()=>choose(null)}/>
    {rows.map(row=><AccountRow key={row.subAccountUser} kind="Sub" label={row.name} address={row.subAccountUser} selected={active.address?.toLowerCase()===row.subAccountUser.toLowerCase()} disabled={mutating||subaccounts.isError} onSelect={()=>choose(row)}/>)}
    {subaccounts.isLoading&&<p role="status" className="px-3 py-2 text-xs text-fg-muted">Loading subaccounts…</p>}
    {subaccounts.isError&&<button type="button" onClick={()=>void subaccounts.refetch()} className="px-3 py-2 text-xs text-warning">Could not refresh accounts · Retry</button>}
   </div>
   <div className="mt-2 shrink-0 border-t border-stroke-weak pt-2"><button type="button" className="w-full rounded-lg px-3 py-2.5 text-left text-brand hover:bg-fill-hover" disabled={mutating} onClick={()=>{setPickerOpen(false);removeAgentFromStorage("Testnet",address);removeAgentFromStorage("Mainnet",address);select(null);clearX1Session();disconnect();}}>Disconnect</button></div>
  </Popover.Popup></Popover.Positioner></Popover.Portal>
 </Popover.Root></>;
}
function AccountRow({kind,label,address,selected,disabled,onSelect}:{kind:"Master"|"Sub";label:string;address:string;selected:boolean;disabled:boolean;onSelect:()=>void}){
 const {copy,copied}=useCopyToClipboard(1800);
 return <div className={`flex items-center rounded-lg ${selected?"bg-fill-hover":"hover:bg-fill-weak"}`}>
  <button type="button" aria-label={kind==="Master"?`Select main account ${label}`:`Select subaccount ${label}`} aria-pressed={selected} disabled={disabled} onClick={onSelect} className="grid min-w-0 flex-1 grid-cols-[64px_minmax(0,1fr)] items-center gap-2 rounded-lg px-3 py-3 text-left disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-brand"><span>{kind}</span><span className="truncate text-right" title={address}>{label}</span></button>
  <button type="button" aria-label={`Copy ${kind==="Master"?"main account":label} address`} title={copied?"Copied":"Copy address"} onClick={()=>void copy(address)} className="mr-1 inline-flex size-8 shrink-0 items-center justify-center rounded-md text-brand hover:bg-fill-hover focus-visible:outline-2 focus-visible:outline-brand">{copied?<CheckIcon aria-hidden="true" className="size-4"/>:<CopyIcon aria-hidden="true" className="size-4"/>}</button>
 </div>;
}
