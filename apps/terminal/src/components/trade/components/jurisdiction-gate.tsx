import { Button } from "@hypeterminal/ui";
import { type ReactNode, useEffect, useId, useState } from "react";
import { useConnection } from "wagmi";
import { checkJurisdiction, RESTRICTED_JURISDICTION_MESSAGE } from "@/lib/jurisdiction";
import { ExportKeyModal } from "./export-key-modal";

interface Props {
	children: ReactNode;
}

export function JurisdictionGate({ children }: Props) {
	const [state, setState] = useState<"checking" | "allowed" | "restricted">("checking");
	const [exportOpen, setExportOpen] = useState(false);
	const { address, connector, isConnected } = useConnection();
	const titleId = useId();
	useEffect(() => {
		const controller = new AbortController();
		let active = true;
		const timeout = window.setTimeout(() => controller.abort(), 4000);
		void checkJurisdiction(controller.signal)
			.then((restricted) => {
				if (active) setState(restricted ? "restricted" : "allowed");
			})
			.catch(() => {
				if (active) setState("allowed");
			})
			.finally(() => window.clearTimeout(timeout));
		return () => {
			active = false;
			controller.abort();
			window.clearTimeout(timeout);
		};
	}, []);

	if (state === "checking") {
		return (
			<main className="flex min-h-dvh items-center justify-center bg-background p-3 text-fg">
				<output className="text-xs text-fg-muted">Checking availability…</output>
			</main>
		);
	}
	if (state === "allowed") return children;

	const canExport = isConnected && !!address && connector?.id === "x1";

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
				{canExport && (
					<Button
						variant="secondary"
						intent="neutral"
						size="sm"
						className="self-start"
						onClick={() => setExportOpen(true)}
					>
						Export existing derived private key
					</Button>
				)}
				{exportOpen && canExport && address && (
					<ExportKeyModal key={address} address={address} onClose={() => setExportOpen(false)} />
				)}
			</section>
		</main>
	);
}
