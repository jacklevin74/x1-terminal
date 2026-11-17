import { useEffect, useState, type ReactNode } from "react";
import { checkJurisdiction, RESTRICTED_JURISDICTION_MESSAGE } from "@/lib/jurisdiction";

type GateState = "checking" | "allowed" | "restricted" | "unavailable";

/**
 * Mounts the app only after /api/jurisdiction says the visitor is not restricted.
 * Production builds fail CLOSED: an error, a bad response or the 4 s timeout shows a retry screen, never the app.
 * Dev builds (import.meta.env.DEV, e.g. local Vite without the endpoint) fail open so local work is not blocked.
 */
export function JurisdictionGate({ children, failOpen = import.meta.env.DEV }: { children: ReactNode; failOpen?: boolean }) {
 const [state, setState] = useState<GateState>("checking");
 const [attempt, setAttempt] = useState(0);
 useEffect(() => {
  const controller = new AbortController();
  let active = true;
  setState("checking");
  const timeout = window.setTimeout(() => controller.abort(), 4000);
  void checkJurisdiction(controller.signal).then(restricted => {
   if (active) setState(restricted ? "restricted" : "allowed");
  }).catch(() => {
   if (active) setState(failOpen ? "allowed" : "unavailable");
  }).finally(() => window.clearTimeout(timeout));
  return () => { active = false; controller.abort(); window.clearTimeout(timeout); };
 }, [attempt, failOpen]);
 if (state === "checking") return <main className="min-h-dvh bg-background text-fg flex items-center justify-center p-6"><p role="status" className="text-sm text-fg-muted">Checking availability…</p></main>;
 if (state === "allowed") return children;
 if (state === "unavailable") return <main className="min-h-dvh bg-background text-fg flex items-center justify-center p-6">
  <section aria-labelledby="jurisdiction-unavailable-title" className="w-full max-w-lg rounded-12 border border-stroke-weak bg-surface p-8">
   <h1 id="jurisdiction-unavailable-title" className="text-xl font-semibold">Location check unavailable</h1>
   <p role="alert" className="mt-4 text-sm leading-relaxed text-fg-muted">We could not confirm that our services are available in your location. Try again in a moment.</p>
   <button type="button" className="mt-6 rounded bg-brand px-4 py-2 text-sm text-fg-inverse" onClick={() => setAttempt(n => n + 1)}>Try again</button>
   <p className="mt-6 text-xs text-fg-muted"><a href="https://db-ip.com" target="_blank" rel="noopener noreferrer" className="underline">IP Geolocation by DB-IP</a></p>
  </section>
 </main>;
 return <main className="min-h-dvh bg-background text-fg flex items-center justify-center p-6">
  <section aria-labelledby="jurisdiction-title" className="w-full max-w-lg rounded-12 border border-stroke-weak bg-surface p-8">
   <h1 id="jurisdiction-title" className="text-xl font-semibold">Restricted jurisdiction</h1>
   <p role="alert" className="mt-4 text-sm leading-relaxed text-fg-muted">{RESTRICTED_JURISDICTION_MESSAGE}</p>
   <p className="mt-4 text-sm text-fg-muted">Our products and services are unavailable to U.S. users.</p>
   <p className="mt-6 text-xs text-fg-muted"><a href="https://db-ip.com" target="_blank" rel="noopener noreferrer" className="underline">IP Geolocation by DB-IP</a></p>
  </section>
 </main>;
}
