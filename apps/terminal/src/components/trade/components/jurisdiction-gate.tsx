import { Button } from "@hypeterminal/ui";
import { type ReactNode, useEffect, useId, useState } from "react";
import { checkJurisdiction, RESTRICTED_JURISDICTION_MESSAGE } from "@/lib/jurisdiction";

type GateState = "checking" | "allowed" | "restricted" | "unavailable";

interface Props {
	children: ReactNode;
	failOpen?: boolean;
}

/**
 * Mounts the app only after /api/jurisdiction says the visitor is not restricted.
 * Production builds fail CLOSED: an error, a bad response or the 4 s timeout shows a retry screen, never the app.
 * Dev builds (import.meta.env.DEV, e.g. local Vite without the endpoint) fail open so local work is not blocked.
 */
export function JurisdictionGate({ children, failOpen = import.meta.env.DEV }: Props) {
	const [state, setState] = useState<GateState>("checking");
	const [attempt, setAttempt] = useState(0);
	const titleId = useId();
	// biome-ignore lint/correctness/useExhaustiveDependencies: attempt re-runs the check on "Try again"
	useEffect(() => {
		const controller = new AbortController();
		let active = true;
		setState("checking");
		const timeout = window.setTimeout(() => controller.abort(), 4000);
		void checkJurisdiction(controller.signal)
			.then((restricted) => {
				if (active) setState(restricted ? "restricted" : "allowed");
			})
			.catch(() => {
				if (active) setState(failOpen ? "allowed" : "unavailable");
			})
			.finally(() => window.clearTimeout(timeout));
		return () => {
			active = false;
			controller.abort();
			window.clearTimeout(timeout);
		};
	}, [attempt, failOpen]);

	if (state === "checking") {
		return (
			<main className="flex min-h-dvh items-center justify-center bg-background p-3 text-fg">
				<output className="text-xs text-fg-muted">Checking availability…</output>
			</main>
		);
	}
	if (state === "allowed") return children;

	const attribution = (
		<p className="text-xs text-fg-muted">
			<a href="https://db-ip.com" target="_blank" rel="noopener noreferrer" className="underline">
				IP Geolocation by DB-IP
			</a>
		</p>
	);

	if (state === "unavailable") {
		return (
			<main className="flex min-h-dvh items-center justify-center bg-background p-3 text-fg">
				<section aria-labelledby={titleId} className="flex w-full max-w-md flex-col gap-4 rounded-8 bg-surface p-6">
					<h1 id={titleId} className="text-lg font-medium text-fg">
						Location check unavailable
					</h1>
					<p role="alert" className="text-xs text-fg-secondary text-pretty">
						We could not confirm that our services are available in your location. Try again in a moment.
					</p>
					<Button size="sm" className="self-start" onClick={() => setAttempt((n) => n + 1)}>
						Try again
					</Button>
					{attribution}
				</section>
			</main>
		);
	}

	return (
		<main className="flex min-h-dvh items-center justify-center bg-background p-3 text-fg">
			<section aria-labelledby={titleId} className="flex w-full max-w-md flex-col gap-4 rounded-8 bg-surface p-6">
				<h1 id={titleId} className="text-lg font-medium text-fg">
					Restricted jurisdiction
				</h1>
				<p role="alert" className="text-xs text-fg-secondary text-pretty">
					{RESTRICTED_JURISDICTION_MESSAGE}
				</p>
				<p className="text-xs text-fg-muted">Our products and services are unavailable to U.S. users.</p>
				{attribution}
			</section>
		</main>
	);
}
