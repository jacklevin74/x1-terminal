import { formatDepositAddressError } from "@/lib/jurisdiction";
import { SolDeposit } from "./sol-deposit";
import { Button, Modal, ModalContent, ModalHeader, ModalPopup, ModalTitle } from "@hypeterminal/ui";
import { CopyIcon, CheckIcon } from "@phosphor-icons/react";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { useConnection } from "wagmi";
import { fetchEthDepositAddress, fetchEthDepositFees, MIN_ETH_DEPOSIT } from "@/lib/unit/eth-deposit";
import { fetchSolDepositAddress, fetchSolDepositFees, MIN_SOL_DEPOSIT } from "@/lib/unit/sol-deposit";
import { useIsTestnet } from "@/stores/use-global-settings-store";
import { NativeDepositIntro } from "./native-deposit-intro";

export function NativeDepositModal({ open, onClose }: { open: boolean; onClose: () => void }) {
 const { address } = useConnection();
 const testnet = useIsTestnet();
 const [asset, setAsset] = useState<"ETH" | "SOL">("ETH");
 const [copied, setCopied] = useState(false);
 const [copyError, setCopyError] = useState(false);
 const chain = asset === "ETH" ? "Ethereum" : "Solana";
 const minimum = asset === "ETH" ? MIN_ETH_DEPOSIT : MIN_SOL_DEPOSIT;
 const enabled = open && !!address && !testnet;
 const deposit = useQuery({ queryKey: [asset === "ETH" ? "unit-eth-deposit" : "unit-sol-deposit", "mainnet", address], queryFn: ({ signal }) => {
  if (!address) throw new Error("Connect your wallet first.");
  return asset === "ETH" ? fetchEthDepositAddress(address, signal) : fetchSolDepositAddress(address, signal);
 }, enabled, staleTime: 300_000, retry: false });
 const fees = useQuery({ queryKey: [asset === "ETH" ? "unit-eth-fees" : "unit-sol-fees", "mainnet"], queryFn: ({ signal }) => asset === "ETH" ? fetchEthDepositFees(signal) : fetchSolDepositFees(signal), enabled, staleTime: 60_000, retry: false });
 useEffect(() => { setCopied(false); setCopyError(false); }, [address, asset, open]);
 return <Modal open={open} onOpenChange={onClose}>
  <ModalPopup size="lg" className="!max-w-xl">
   <ModalHeader className="sr-only" divider={false}><ModalTitle>Deposit {asset} from {chain}</ModalTitle></ModalHeader>
   <ModalContent className="space-y-5 px-5 pb-5 pt-10 sm:px-6 sm:pb-6">
    <NativeDepositIntro asset={asset} chain={chain} fee={fees.data?.fee} eta={fees.data?.eta} />
    {!address ? <p className="text-center text-sm text-fg-muted">Connect Phantom or X1 Wallet to get your deposit address.</p>
     : testnet ? <p className="text-center text-sm text-fg-muted">Native asset deposits are available on mainnet.</p>
     : <>
      <label className="flex h-12 items-center justify-between rounded-lg border border-stroke-weak px-3 text-sm"><span className="text-fg-muted">Asset</span><select aria-label="Deposit asset" value={asset} onChange={e => setAsset(e.target.value as "ETH" | "SOL")} className="bg-transparent py-2 pl-4 text-right text-fg outline-none"><option value="ETH">ETH</option><option value="SOL">SOL</option></select></label>
      <div className="flex h-12 items-center justify-between rounded-lg border border-stroke-weak px-3 text-sm"><span className="text-fg-muted">Deposit Chain</span><span className="text-fg">{chain}</span></div>
      {deposit.error ? <div role="alert" className="space-y-2 text-sm text-error"><p>{formatDepositAddressError(deposit.error)}</p><Button variant="outline" size="sm" onClick={() => void deposit.refetch()}>Retry address</Button></div>
       : <button type="button" disabled={!deposit.data} aria-label={`Copy ${asset} deposit address`} title={deposit.data} className="flex min-h-12 w-full items-center justify-center gap-3 rounded-lg bg-fill-weak px-3 py-3 text-sm font-medium text-fg disabled:opacity-50" onClick={async () => {
        if (!deposit.data) return;
        try { await navigator.clipboard.writeText(deposit.data); setCopied(true); setCopyError(false); } catch { setCopyError(true); }
       }}><span className="break-all">{deposit.data ?? "Generating deposit address…"}</span>{deposit.data && (copied ? <CheckIcon className="size-4 shrink-0 text-success" /> : <CopyIcon className="size-4 shrink-0 text-fg-muted" />)}</button>}
      {asset === "SOL" && deposit.data && <SolDeposit compact />}
      {copied && <p role="status" className="text-center text-xs text-success">Address copied</p>}
      {copyError && <p role="alert" className="text-center text-xs text-error">Copy unavailable. Select the address and copy it manually.</p>}
     </>}
    {(asset !== "SOL" || !address || testnet) && <Button variant="filled" intent="brand" className="h-12 w-full text-sm" onClick={onClose}>Done</Button>}
    <div className="border-t border-stroke-weak pt-4"><p className="rounded-lg border border-stroke-error-strong/50 bg-error-soft/10 px-3 py-3 text-center text-xs leading-relaxed text-error">IMPORTANT: Minimum deposit is {minimum} {asset}. This address only receives native {asset} on {chain} mainnet. Other assets, other networks, and deposits below the minimum cannot be credited.</p></div>
   </ModalContent>
  </ModalPopup>
 </Modal>;
}
