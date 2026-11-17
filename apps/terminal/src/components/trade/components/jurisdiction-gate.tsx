import { useEffect, useState, type ReactNode } from "react";
import { checkJurisdiction, RESTRICTED_JURISDICTION_MESSAGE } from "@/lib/jurisdiction";

export function JurisdictionGate({ children }: { children: ReactNode }) {
 const [state, setState] = useState<"checking" | "allowed" | "restricted">("checking");
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
  </section>
 </main>;
}
