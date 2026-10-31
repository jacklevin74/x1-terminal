import { useCallback, useEffect, useRef, useState } from "react";
import { getSolSourceWallet } from "@/lib/solana/source-wallet";
import { getNativeEthereumProviders } from "@/lib/wallet/native-ethereum";
import { readWithdrawalRecipient, type WithdrawalRecipient } from "@/lib/wallet/withdrawal-recipient";

export function useWithdrawalRecipient(asset: "SOL" | "ETH", connectorId: string | undefined, account: string | undefined) {
 const [recipient, setRecipient] = useState<WithdrawalRecipient>({ address: "", status: "unavailable" });
 const [reading, setReading] = useState(true);
 const generation = useRef(0);
 const explicitlyLocked = useRef(false);
 const connecting = useRef(false);
 const refresh = useCallback(async (requestAccess = false) => {
  if (requestAccess) explicitlyLocked.current = false;
  if (explicitlyLocked.current) return { address: "", status: "locked" as const, message: "Your wallet is locked or disconnected. Unlock it, then reconnect to load your withdrawal address." };
  const current = ++generation.current;
  if (requestAccess) { connecting.current = true; setReading(true); }
  const result = await readWithdrawalRecipient(asset, connectorId, requestAccess);
  if (requestAccess) connecting.current = false;
  if (generation.current === current) { setRecipient(previous => previous.address === result.address && previous.status === result.status && previous.message === result.message ? previous : result); setReading(false); }
  return result;
 }, [asset, connectorId, account]);
 useEffect(() => {
  explicitlyLocked.current = false;
  setReading(true); setRecipient({ address: "", status: "unavailable" });
  void refresh();
  const update = () => { if (!connecting.current) void refresh(); };
  const resume = () => { explicitlyLocked.current = false; update(); };
  const clear = () => { explicitlyLocked.current = true; generation.current++; setRecipient({ address: "", status: "locked", message: "Your wallet is locked or disconnected. Unlock it, then reconnect to load your withdrawal address." }); setReading(false); };
  const source = getSolSourceWallet(connectorId === "x1" ? "x1" : "phantom");
  const ethereumProviders = getNativeEthereumProviders();
  const cleanups: (() => void)[] = [];
  for (const [event, listener] of [["accountChanged", update], ["connect", resume], ["disconnect", clear], ["lock", clear], ["unlock", resume]] as const) {
   try {
    const result = source?.on?.(event, listener);
    cleanups.push(() => { if (typeof result === "function") result(); else if (source?.removeListener) source.removeListener(event, listener); else source?.off?.(event, listener); });
   } catch { /* Providers may not support every event. */ }
  }
  for (const ethereum of ethereumProviders) for (const [event, listener] of [["accountsChanged", update], ["connect", resume], ["disconnect", clear]] as const) {
   try { ethereum.on?.(event, listener); cleanups.push(() => ethereum.removeListener?.(event, listener)); } catch { /* Provider unavailable. */ }
  }
  window.addEventListener("focus", update);
  const interval = window.setInterval(() => { if (!document.hidden) update(); }, 2000);
  return () => { generation.current++; for (const dispose of cleanups) dispose(); window.removeEventListener("focus", update); window.clearInterval(interval); };
 }, [refresh, connectorId]);
 return { ...recipient, reading, refresh };
}
