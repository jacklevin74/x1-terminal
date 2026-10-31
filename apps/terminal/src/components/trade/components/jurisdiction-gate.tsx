import { useEffect, useState, type ReactNode } from "react";
import { useConnection } from "wagmi";
import { checkJurisdiction, RESTRICTED_JURISDICTION_MESSAGE } from "@/lib/jurisdiction";
import { ExportKeyModal } from "./export-key-modal";

export function JurisdictionGate({ children }: { children: ReactNode }) {
 const [state, setState] = useState<"checking" | "allowed" | "restricted">("checking");
 const [exportOpen, setExportOpen] = useState(false);
 const { address, connector, isConnected } = useConnection();
 useEffect(() => {
  const controller = new AbortController();
  let active = true;
  const timeout = window.setTimeout(() => controller.abort(), 4000);
  void checkJurisdiction(controller.signal).then(restricted => {
   if (active) setState(restricted ? "restricted" : "allowed");
  }).catch(() => {
   // Missing geolocation (e.g. local Vite) or network failure is not proof of a restriction.
   if (active) setState("allowed");
  }).finally(() => window.clearTimeout(timeout));
  return () => { active = false; controller.abort(); window.clearTimeout(timeout); };
 }, []);
 if (state === "checking") return <main className="min-h-dvh bg-background text-fg flex items-center justify-center p-6"><p role="status" className="text-sm text-fg-muted">Checking availability…</p></main>;
 if (state === "allowed") return children;
 return <main className="min-h-dvh bg-background text-fg flex items-center justify-center p-6">
  <section aria-labelledby="jurisdiction-title" className="w-full max-w-lg rounded-12 border border-stroke-weak bg-surface p-8">
   <h1 id="jurisdiction-title" className="text-xl font-semibold">Restricted jurisdiction</h1>
   <p role="alert" className="mt-4 text-sm leading-relaxed text-fg-muted">{RESTRICTED_JURISDICTION_MESSAGE}</p>
   <p className="mt-4 text-sm text-fg-muted">Our products and services are unavailable to U.S. users.</p>
   {isConnected && address && connector?.id === "x1" && <button type="button" className="mt-6 text-sm text-brand underline" onClick={() => setExportOpen(true)}>Export existing derived private key</button>}
   {exportOpen && address && connector?.id === "x1" && <ExportKeyModal key={address} address={address} onClose={() => setExportOpen(false)} />}
  </section>
 </main>;
}
