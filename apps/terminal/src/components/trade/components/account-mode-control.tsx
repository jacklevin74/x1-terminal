import { Button, Modal, ModalContent, ModalDescription, ModalHeader, ModalPopup, ModalTitle } from "@hypeterminal/ui";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { useConnection } from "wagmi";
import { getInfoClient, useExchange } from "@/lib/hyperliquid";
import { cn } from "@/lib/cn";
import { useIsTestnet } from "@/stores/use-global-settings-store";

type Mode = "disabled" | "unifiedAccount";
function modeLabel(mode: string | undefined) {
 if (mode === "unifiedAccount") return "Unified";
 if (mode === "portfolioMargin") return "Portfolio";
 if (mode === "dexAbstraction") return "Legacy DEX";
 if (mode === "default" || mode === "disabled") return "Manual";
 return "Loading…";
}

export function AccountModeControl() {
 const { address, isConnected } = useConnection();
 const testnet = useIsTestnet();
 if (!isConnected || !address) return null;
 return <AccountModeContent key={`${address}:${testnet}`} address={address} testnet={testnet} />;
}

function AccountModeContent({ address, testnet }: { address: `0x${string}`; testnet: boolean }) {
 const [open, setOpen] = useState(false);
 const [selected, setSelected] = useState<Mode>("disabled");
 const [error, setError] = useState<string | null>(null);
 const [submitted, setSubmitted] = useState(false);
 const mode = useQuery({ queryKey: ["account-mode", address, testnet], queryFn: ({ signal }) => getInfoClient().userAbstraction({ user: address }, signal), staleTime: 10_000, refetchInterval: 15_000, retry: 1 });
 const change = useExchange("userSetAbstraction");
 const current = modeLabel(mode.data);
 const target = selected === "disabled" ? "Manual" : "Unified";
 const same = selected === "disabled" ? mode.data === "disabled" || mode.data === "default" : mode.data === selected;
 async function submit() {
  if (!mode.data || same || change.isPending || submitted) return;
  setError(null);
  try {
   await change.mutateAsync({ user: address, abstraction: selected });
   setSubmitted(true);
   await mode.refetch();
  } catch (cause) { setError(cause instanceof Error ? cause.message : "Could not change account mode."); }
 }
 return <>
  <Button variant="outline" intent="neutral" size="sm" aria-label={`Account mode: ${mode.isError ? "unavailable" : current}`} className="!border-brand/30 !text-brand whitespace-nowrap" onClick={() => { setSelected(mode.data === "unifiedAccount" ? "disabled" : "unifiedAccount"); setError(null); setSubmitted(false); setOpen(true); void mode.refetch(); }}>Mode: {mode.isError ? "Retry" : current} <span aria-hidden="true">⌄</span></Button>
  <Modal open={open} onOpenChange={value => { if (!change.isPending) setOpen(value); }}>
   <ModalPopup size="sm" showClose={!change.isPending}>
    <ModalHeader><ModalTitle>Account mode</ModalTitle><ModalDescription>Current mode: {mode.isError ? "Unavailable" : current}</ModalDescription></ModalHeader>
    <ModalContent className="space-y-3">
     <fieldset disabled={change.isPending || submitted} className="space-y-2"><legend className="sr-only">Choose account mode</legend>
      {([{value:"unifiedAccount",label:"Unified",description:"One shared balance for spot and perps."},{value:"disabled",label:"Manual",description:"Separate spot and perps balances. Move funds between them yourself."}] as const).map(option => <label key={option.value} className={cn("flex cursor-pointer items-start gap-3 rounded-xl border p-3",selected === option.value ? "border-brand/60 bg-brand/5" : "border-stroke-weak")}>
       <input type="radio" name="account-mode" value={option.value} checked={selected === option.value} onChange={() => setSelected(option.value)} className="mt-1 accent-brand" /><span><span className="text-sm font-medium">{option.label}</span><span className="mt-1 block text-xs leading-relaxed text-fg-muted">{option.description}</span></span>
      </label>)}
     </fieldset>
     <p className="break-all text-xs text-fg-muted">Applies to {address.slice(0,6)}…{address.slice(-4)}. A wallet signature is required.</p>
     {mode.isError && <button type="button" onClick={() => void mode.refetch()} className="text-xs text-brand">Could not read account mode · Retry</button>}
     {error && <p role="alert" className="text-xs text-error">{error}</p>}
     {submitted && <p role="status" className="text-xs text-success">{same ? `${target} mode is active.` : "Mode change submitted. Waiting for account confirmation."}</p>}
     <Button className="w-full" disabled={!mode.data || same || change.isPending || submitted} onClick={submit}>{change.isPending ? "Confirm in wallet…" : same ? `${target} mode active` : `Switch to ${target}`}</Button>
    </ModalContent>
   </ModalPopup>
  </Modal>
 </>;
}
