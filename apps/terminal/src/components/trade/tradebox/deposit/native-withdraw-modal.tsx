import { readNativeEthereumRecipient } from "@/lib/wallet/native-ethereum";
import { Modal, ModalPopup } from "@hypeterminal/ui";
import { useEffect, useRef, useState } from "react";
import { useConnection } from "wagmi";
import { NativeWithdrawForm } from "../../positions/native-withdraw-form";

export function NativeWithdrawModal({ onClose, initialAsset }: { onClose: () => void; initialAsset?: "SOL" | "ETH" }) {
 const { address, connector } = useConnection();
 const manualSelection = useRef(false);
 const busyRef = useRef(false);
 const [busy, setBusy] = useState(false);
 busyRef.current = busy;
 const [asset, setAsset] = useState<"SOL" | "ETH">(initialAsset ?? (connector?.id === "phantom" ? "ETH" : "SOL"));
 useEffect(() => {
  let active = true;
  const detect = async () => {
   if (manualSelection.current || busyRef.current) return;
   const native = await readNativeEthereumRecipient();
   if (active && !manualSelection.current && !busyRef.current && native.status === "ready") setAsset("ETH");
  };
  void detect();
  const update = () => { void detect(); };
  window.addEventListener("focus", update);
  window.addEventListener("eip6963:announceProvider", update);
  const interval = window.setInterval(update, 2000);
  return () => { active = false; window.clearInterval(interval); window.removeEventListener("focus", update); window.removeEventListener("eip6963:announceProvider", update); };
 }, [connector?.id]);
 useEffect(() => { if (busy) manualSelection.current = true; }, [busy]);
 return <Modal open onOpenChange={open => { if (!open && !busy) onClose(); }}><ModalPopup size="md" showClose={!busy}>
  <div className="flex items-center justify-between gap-4 px-5 pt-5 pr-14">
   <span className="text-lg font-semibold">Withdraw</span>
   <select aria-label="Withdrawal asset" disabled={busy} value={asset} onChange={e => { manualSelection.current = true; setAsset(e.target.value as "SOL" | "ETH"); }} className="rounded-lg border border-stroke-weak bg-surface px-2 py-1.5 text-xs"><option value="SOL">SOL · Solana</option><option value="ETH">ETH · Ethereum</option></select>
  </div>
  <NativeWithdrawForm key={`${asset}:${address}:${connector?.id}`} asset={asset} onBusyChange={setBusy} onBack={onClose} />
 </ModalPopup></Modal>;
}
