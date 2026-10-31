import { Button, Modal, ModalContent, ModalPopup, ModalTitle } from "@hypeterminal/ui";
import { useEffect, useState } from "react";
import { exportX1PrivateKey } from "@/lib/x1/provider";

export function ExportKeyModal({ address, onClose }: { address: string; onClose: () => void }) {
 const [acknowledged, setAcknowledged] = useState(false);
 const [key, setKey] = useState<string | null>(null);
 const [error, setError] = useState<string | null>(null);
 const [copied, setCopied] = useState(false);
 // Remove the secret from the UI when leaving the tab or after one minute.
 useEffect(() => {
  const hide = () => { setKey(null); setAcknowledged(false); setCopied(false); };
  const visibility = () => { if (document.hidden) hide(); };
  const sessionChanged = () => { hide(); onClose(); };
  document.addEventListener("visibilitychange", visibility);
  window.addEventListener("blur", hide);
  window.addEventListener("storage", sessionChanged);
  const timer = key ? window.setTimeout(hide, 60_000) : undefined;
  return () => {
   document.removeEventListener("visibilitychange", visibility);
   window.removeEventListener("blur", hide);
   window.removeEventListener("storage", sessionChanged);
   window.clearTimeout(timer);
  };
 }, [key, onClose]);
 return <Modal open onOpenChange={open => { if (!open) { setKey(null); onClose(); } }}>
  <ModalPopup size="md"><ModalContent>
   <ModalTitle>Export derived private key</ModalTitle>
   <p className="mt-3 text-sm text-fg-muted">This Ethereum key controls your X1 Terminal Hyperliquid account and funds withdrawn to its address. It is separate from your native Solana wallet key.</p>
   <p className="my-3 break-all font-mono text-xs">{address}</p>
   <div role="note" className="rounded border border-error p-3 text-sm text-error">
    Anyone with this key can take this account’s funds. Never share it, send it to support, or paste it into a website. Import it only into a wallet you trust and verify the imported address matches the address above. Store any backup securely offline.
   </div>
   <p className="mt-3 text-xs text-fg-muted">Arbitrum withdrawals arrive as USDC at this address. Sending them requires ETH on Arbitrum for gas.</p>
   {!key ? <>
    <label className="my-4 flex items-start gap-2 text-sm">
     <input type="checkbox" checked={acknowledged} onChange={e => setAcknowledged(e.target.checked)} />
     I understand this exposes full control of this account and I am in a private place.
    </label>
    <Button className="w-full" disabled={!acknowledged} onClick={() => {
     setError(null);
     try { setKey(exportX1PrivateKey(address)); } catch (e) { setError(e instanceof Error ? e.message : "Unable to export this account."); }
    }}>Reveal private key</Button>
   </> : <div className="mt-4 space-y-3">
    <textarea aria-label="Derived Ethereum private key" readOnly spellCheck={false} autoComplete="off" value={key}
     className="w-full resize-none rounded border border-stroke-weak bg-surface p-3 font-mono text-xs break-all" />
    <p className="text-xs text-fg-muted">Hidden after 60 seconds or when you leave this tab. Copying puts the key on your system clipboard; replace the clipboard contents after importing.</p>
    <Button className="w-full" onClick={async () => {
     setError(null);
     try { const current = exportX1PrivateKey(address); if (current !== key) throw new Error("Account changed. Close this window and try again."); await navigator.clipboard.writeText(current); setCopied(true); }
     catch { setError("Could not copy the key. Check the connected account and clipboard permissions."); }
    }}>{copied ? "Private key copied" : "Copy private key"}</Button>
   </div>}
   {error && <p role="alert" className="mt-3 text-sm text-error">{error}</p>}
   <Button variant="outline" intent="neutral" className="mt-3 w-full" onClick={() => { setKey(null); onClose(); }}>Close</Button>
  </ModalContent></ModalPopup>
 </Modal>;
}
