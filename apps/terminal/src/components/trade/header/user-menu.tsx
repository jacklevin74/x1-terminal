import { Button, Dropdown } from "@hypeterminal/ui";
import { useState } from "react";
import { useConnection, useDisconnect } from "wagmi";
import { clearX1Session } from "@/lib/x1/provider";
import { ExportKeyModal } from "../components/export-key-modal";
import { WalletModal } from "../components/wallet-modal";
import { removeAgentFromStorage } from "@/lib/hyperliquid";

export function UserMenu() {
 const { address, isConnected, connector } = useConnection();
 const { mutate: disconnect } = useDisconnect();
 const [open, setOpen] = useState(false);
 const [exportOpen, setExportOpen] = useState(false);
 if (!isConnected || !address) return <>
  <Button variant="outline" intent="neutral" size="sm" onClick={() => setOpen(true)}>Connect Wallet</Button>
  <WalletModal open={open} onOpenChange={setOpen} />
 </>;
 const derived = connector?.id === "x1";
 return <><Dropdown align="end" size="sm" triggerAriaLabel="Account and wallet"
  trigger={<span>{derived ? "X1 · " : "Phantom · "}{address.slice(0, 6)}…{address.slice(-4)}</span>}
  items={[
   { label: derived ? "Derived from your X1 signature" : "Phantom Ethereum account", onSelect: () => {} },
   { label: `Copy ${address}`, onSelect: () => { void navigator.clipboard.writeText(address); } },
   { label: "Trading setup · 0.05% fee", onSelect: () => window.dispatchEvent(new Event("x1:setup")) },
   ...(derived ? [{ label: "Export derived private key", onSelect: () => setExportOpen(true) }] : []),
   { label: "Disconnect", onSelect: () => {
    removeAgentFromStorage("Testnet", address);
    removeAgentFromStorage("Mainnet", address);
    clearX1Session();
    disconnect();
   } },
  ]} />
  {derived && exportOpen && <ExportKeyModal key={address} address={address} onClose={() => setExportOpen(false)} />}
 </>;
}
