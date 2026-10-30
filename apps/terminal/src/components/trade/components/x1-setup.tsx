import { Modal, ModalContent, ModalPopup } from "@hypeterminal/ui";
import { useEffect, useState } from "react";
import { useConnection } from "wagmi";
import { useAgentRegistration, useAgentStatus } from "@/lib/hyperliquid";
import { BUILDER_CONFIGURED } from "@/config/hyperliquid";
import { useIsTestnet } from "@/stores/use-global-settings-store";

export function X1Setup() {
 const { address, connector } = useConnection();
 const { isReady } = useAgentStatus();
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
 return <Modal open={open && !!address} onOpenChange={next => { if (!busy) setOpen(next); }}>
  <ModalPopup size="sm"><ModalContent>
   <h2 className="text-lg font-semibold">Set up trading · {testnet ? "Testnet" : "Mainnet"}</h2>
   <p className="my-3 text-sm text-fg-muted">Review both approvals before continuing.</p>
   <ol className="list-decimal pl-5 space-y-3 text-sm">
    <li>Approve X1’s builder fee: <strong>0.05% per trade</strong>.</li>
    <li>Approve a trading-only key so orders do not prompt your wallet each time. This key stays in this browser tab’s session.</li>
   </ol>
   <p className="my-4 break-all font-mono text-xs">Hyperliquid account: {address}</p>
   {connector?.id === "x1" && <p className="mb-4 text-sm text-warning">Derived from your X1 signature. Withdrawals are signed by this derived key. Reconnect with the same X1 wallet to recover this account.</p>}
   {!BUILDER_CONFIGURED && <p role="alert" className="text-sm text-warning">Trading is unavailable until the operator configures VITE_BUILDER_ADDRESS.</p>}
   {(localError || error) && <p role="alert" className="my-3 text-sm text-error">{localError ?? error?.message}</p>}
   <button className="mt-4 w-full rounded bg-brand p-3 text-fg-inverse disabled:opacity-40"
    disabled={busy || !BUILDER_CONFIGURED} onClick={async () => {
     setLocalError(null);
     try { await register(); } catch (e) { setLocalError(e instanceof Error ? e.message : "Setup failed"); }
    }}>{busy ? status.replaceAll("_", " ") : "Approve fee & trading key"}</button>
  </ModalContent></ModalPopup>
 </Modal>;
}
