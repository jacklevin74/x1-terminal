import { WalletModal } from "./wallet-modal";
import { Modal, ModalContent, ModalPopup, ModalHeader, ModalTitle } from "@hypeterminal/ui";
import { useEffect, useState } from "react";
import { useConnection, useWalletClient } from "wagmi";
import { useAgentRegistration, useAgentStatus } from "@/lib/hyperliquid";
import { BUILDER_CONFIGURED } from "@/config/hyperliquid";
import { useIsTestnet } from "@/stores/use-global-settings-store";

export function X1Setup() {
 const { address, connector } = useConnection();
 const { isReady, needsAgent, needsBuilderFee, isLoading } = useAgentStatus();
 const { data: walletClient } = useWalletClient();
 const [walletOpen, setWalletOpen] = useState(false);
 const { register, status, error } = useAgentRegistration();
 const testnet = useIsTestnet();
 const [open, setOpen] = useState(false);
 const [localError, setLocalError] = useState<string | null>(null);
 const busy = status === "approving_fee" || status === "approving_agent" || status === "verifying";
 useEffect(() => {
  const show = () => setOpen(true);
  window.addEventListener("x1:setup", show);
  return () => window.removeEventListener("x1:setup", show);
 }, []);
 useEffect(() => { setOpen(false); }, [address]);
 useEffect(() => { if (isReady) setOpen(false); }, [isReady]);
 return <><WalletModal open={walletOpen} onOpenChange={setWalletOpen} /><Modal open={open} onOpenChange={next => { if (!busy) setOpen(next); }}>
  <ModalPopup size="sm"><ModalHeader><ModalTitle>Approve trading · {testnet ? "Testnet" : "Mainnet"}</ModalTitle></ModalHeader><ModalContent>
   <p className="my-3 text-sm text-fg-muted">Approve in your wallet to enable trading.</p>
   <ol className="list-decimal pl-5 space-y-3 text-sm">
    {needsBuilderFee && <li>Approve X1’s builder fee: <strong>0.05% per trade</strong>.</li>}
    {needsAgent && <li>Approve a trading-only key. It is saved on this device so you do not need to approve each trade. Expired or revoked keys require approval again.</li>}
   </ol>
   {address && <p className="my-4 break-all font-mono text-xs">Hyperliquid account: {address}</p>}
   {!walletClient && <p role="status" className="my-3 text-sm text-fg-muted">Unlock and connect your wallet to approve trading. Your saved trading key will be reused when its approval is valid.</p>}
   {busy && <p role="status" className="my-3 text-sm text-fg-muted">{status === "verifying" ? "Checking approval…" : "Open your wallet and confirm the approval request."}</p>}
   {connector?.id === "x1" && <p className="mb-4 text-sm text-warning">Derived from your X1 signature. Withdrawals are signed by this derived key. Reconnect with the same X1 wallet to recover this account.</p>}
   {!BUILDER_CONFIGURED && <p role="alert" className="text-sm text-warning">Trading is unavailable until the operator configures VITE_BUILDER_ADDRESS.</p>}
   {(localError || error) && <p role="alert" className="my-3 text-sm text-error">{localError ?? error?.message}</p>}
   <button className="mt-4 w-full rounded bg-brand p-3 text-fg-inverse disabled:opacity-40"
    disabled={busy || !BUILDER_CONFIGURED || (!!walletClient && isLoading)} onClick={async () => {
     setLocalError(null);
     if (!walletClient || !address) { setOpen(false); setWalletOpen(true); return; }
     try { await register(); } catch (e) { setLocalError(e instanceof Error ? e.message : "Setup failed"); }
    }}>{busy ? status.replaceAll("_", " ") : !walletClient ? "Connect / unlock wallet" : isLoading ? "Checking approval…" : "Approve trading"}</button>
  </ModalContent></ModalPopup>
 </Modal></>;
}
