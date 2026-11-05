import {useIsMutating} from "@tanstack/react-query";
import {useTradingAccount} from "@/hooks/use-trading-account";
import {useTradingAccountStore} from "@/stores/use-trading-account-store";
import {getNetwork} from "@/lib/network";
import {zeroAddress} from "viem";
import {useOrderEntryActions} from "@/stores/use-order-entry-store";
import { AccountModeControl } from "../components/account-mode-control";
import { Button, Dropdown } from "@hypeterminal/ui";
import { useState } from "react";
import { useConnection, useDisconnect } from "wagmi";
import { clearX1Session } from "@/lib/x1/provider";
import { ExportKeyModal } from "../components/export-key-modal";
import { WalletModal } from "../components/wallet-modal";
import { removeAgentFromStorage, useInfo } from "@/lib/hyperliquid";

export function UserMenu() {
 const { address, isConnected, connector } = useConnection();
 const { mutate: disconnect } = useDisconnect();
 const active=useTradingAccount();
 const mutating=useIsMutating()>0;
 const select=useTradingAccountStore(s=>s.select);
 const {resetForm}=useOrderEntryActions();
 const subaccounts=useInfo("subAccounts",{user:address??zeroAddress},{enabled:isConnected&&!!address,refetchOnWindowFocus:true,refetchInterval:30000});
 const rows=address?(subaccounts.data??[]).filter(row=>row.master.toLowerCase()===address.toLowerCase()):[];
 const choose=(account:typeof rows[number]|null)=>{if(!address)return;select(account?{owner:address,network:getNetwork(),address:account.subAccountUser,name:account.name}:null);resetForm();};
 const [open, setOpen] = useState(false);
 const [exportOpen, setExportOpen] = useState(false);
 if (!isConnected || !address) return <>
  <Button variant="outline" intent="neutral" size="sm" onClick={() => setOpen(true)}>Connect Wallet</Button>
  <WalletModal open={open} onOpenChange={setOpen} />
 </>;
 const derived = connector?.id === "x1";
 const walletName = derived ? "X1" : connector?.id === "rabby" ? "Rabby" : connector?.name ?? "Wallet";
 return <>{!active.isSubaccount&&<AccountModeControl />}<Dropdown align="end" size="sm" triggerAriaLabel="Account and wallet"
  trigger={<span className="inline-flex max-w-56 items-center gap-1.5"><span className="truncate">{active.subaccount?.name??walletName}</span><span className="font-mono text-fg-muted">{active.address?.slice(0,6)}…{active.address?.slice(-4)}</span></span>}
  items={[
   {label:`Main account · ${address.slice(0,6)}…${address.slice(-4)}`,active:!active.isSubaccount,disabled:mutating,onSelect:()=>choose(null)},
   ...rows.map(row=>({label:`${row.name} · ${row.subAccountUser.slice(0,6)}…${row.subAccountUser.slice(-4)}`,active:active.address?.toLowerCase()===row.subAccountUser.toLowerCase(),disabled:subaccounts.isError||mutating,onSelect:()=>choose(row)})),
   ...(subaccounts.isLoading?[{label:"Loading subaccounts…",disabled:true}]:[]),
   {label:subaccounts.isError?"Retry loading subaccounts":"Refresh subaccounts",onSelect:()=>{void subaccounts.refetch();}},
   { label: derived ? "Derived from your X1 signature" : `${walletName} Ethereum account`, onSelect: () => {} },
   { label: `Copy ${active.address??address}`, onSelect: () => { void navigator.clipboard.writeText(active.address??address); } },
   { label: "Auto Trader", onSelect: () => { window.location.assign("/API#auto-trader"); } },
   { label: "API wallets", onSelect: () => { window.location.assign("/API"); } },
   { label: "Trading setup · 0.05% fee", onSelect: () => window.dispatchEvent(new Event("x1:setup")) },
   ...(derived ? [{ label: "Export derived private key", onSelect: () => setExportOpen(true) }] : []),
   { label: "Disconnect", onSelect: () => {
    removeAgentFromStorage("Testnet", address);
    removeAgentFromStorage("Mainnet", address);
    select(null);
    clearX1Session();
    disconnect();
   } },
  ]} />
  {derived && exportOpen && <ExportKeyModal key={address} address={address} onClose={() => setExportOpen(false)} />}
 </>;
}
