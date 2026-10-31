import { Modal, ModalContent, ModalPopup } from "@hypeterminal/ui";
import { useState } from "react";
import { useConnect, useConnectors } from "wagmi";

export function WalletModal({ open, onOpenChange, embedded = false }: { open: boolean; onOpenChange: (open: boolean) => void; embedded?: boolean }) {
 const connectors = useConnectors();
 const { mutateAsync: connect, isPending } = useConnect();
 const [error, setError] = useState<string | null>(null);
 const [acknowledged, setAcknowledged] = useState(false);
 const content = <ModalContent>
   <h2 className="text-lg font-semibold">Connect to X1 Terminal</h2>
   <p className="my-3 text-sm text-fg-muted">Choose your wallet. Your Hyperliquid account uses an Ethereum address.</p>
   <label className="flex gap-2 text-xs text-fg-muted my-4">
    <input type="checkbox" checked={acknowledged} onChange={e => setAcknowledged(e.target.checked)} />
    For X1: I understand my account is derived from my X1 signature. Withdrawals are signed by this derived key. I must use the same wallet and signature to recover this account.
   </label>
   <div className="flex flex-col gap-3">
    {connectors.filter(c => c.id === "phantom" || c.id === "x1").map(c => <button key={c.uid}
     className="rounded border border-stroke-weak p-4 text-left hover:bg-fill-hover disabled:opacity-40"
     disabled={isPending || (c.id === "x1" && !acknowledged)}
     onClick={async () => { setError(null); try { await connect({ connector: c }); onOpenChange(false); } catch (e) { setError(e instanceof Error ? e.message : "Connection failed"); } }}>
     <span className="font-semibold">{c.name}</span>
     <span className="block text-xs text-fg-muted mt-1">{c.id === "x1" ? "Derived from your X1 signature · session reconnect" : "Ethereum provider · EIP-712 signing"}</span>
    </button>)}
   </div>
   {error && <p role="alert" className="mt-3 text-sm text-error">{error}</p>}
  {embedded && <button type="button" onClick={() => onOpenChange(false)} className="mt-4 w-full text-xs text-fg-muted">Back to withdrawal</button>}
  </ModalContent>;
 return embedded ? content : <Modal open={open} onOpenChange={onOpenChange}><ModalPopup size="sm">{content}</ModalPopup></Modal>;
}
