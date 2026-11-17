import { RabbyIcon } from "@/components/icons/rabby-icon";
import { Modal, ModalContent, ModalPopup } from "@hypeterminal/ui";
import { useState } from "react";
import { useConnect, useConnectors } from "wagmi";

export function WalletModal({ open, onOpenChange, embedded = false }: { open: boolean; onOpenChange: (open: boolean) => void; embedded?: boolean }) {
 const connectors = useConnectors();
 const { mutateAsync: connect, isPending } = useConnect();
 const [error, setError] = useState<string | null>(null);
 const content = <ModalContent>
   <h2 className="text-lg font-semibold">Connect to X1 Terminal</h2>
   <p className="my-3 text-sm text-fg-muted">Choose your wallet. Your Hyperliquid account uses an Ethereum address.</p>
   <div className="mt-4 flex flex-col gap-3">
    {connectors.filter(c => c.id === "rabby" || c.id === "phantom").map(c => <button key={c.uid}
     className="rounded border border-stroke-weak p-4 text-left hover:bg-fill-hover disabled:opacity-40"
     disabled={isPending}
     onClick={async () => { setError(null); try { await connect({ connector: c }); onOpenChange(false); } catch (e) { setError(e instanceof Error ? e.message : "Connection failed"); } }}>
     <span className="inline-flex items-center gap-2 font-semibold">{c.id === "rabby" && <RabbyIcon className="size-6" />}{c.name}</span>
     <span className="block text-xs text-fg-muted mt-1">{c.id === "rabby" ? "Ledger supported · select your Ledger account in Rabby" : "Ethereum provider · EIP-712 signing"}</span>
    </button>)}
   </div>
   <p className="mt-3 text-xs text-fg-muted">For Ledger: select your hardware account in Rabby, unlock your Ledger and open its Ethereum app. Review and approve signing requests on the device.</p>
   {error && <p role="alert" className="mt-3 text-sm text-error">{error}</p>}
  {embedded && <button type="button" onClick={() => onOpenChange(false)} className="mt-4 w-full text-xs text-fg-muted">Back to withdrawal</button>}
  </ModalContent>;
 return embedded ? content : <Modal open={open} onOpenChange={onOpenChange}><ModalPopup size="sm">{content}</ModalPopup></Modal>;
}
