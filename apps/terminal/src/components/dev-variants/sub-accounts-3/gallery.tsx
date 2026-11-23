import type { ReactNode } from "react";
import V1, { type Scene } from "./v1";

const scenes: { scene: Scene; label: string }[] = [
	{ scene: "default", label: "Default (menu open)" },
	{ scene: "detail", label: "Row arrow: account page" },
	{ scene: "transfer", label: "Add from Main picked" },
];

export function SubAccounts3Gallery() {
	return (
		<main className="dark min-h-screen bg-background text-fg">
			<p className="px-10 pt-8 text-xs text-fg-muted">
				Round 3: the dropdown of round 2 #5 with the transfer flow of round 2 #2. Example balances and sub-account
				names. Every frame is live.
			</p>
			<section className="flex flex-col gap-6 px-10 py-8">
				<div className="flex items-center gap-3 text-xs">
					<span className="rounded-full bg-fill px-2.5 py-0.5 font-semibold text-fg-inverse">#1</span>
					<span>Total and plain rows; the row arrow opens the account page with Add from Main and Return to Main</span>
				</div>
				<div className="flex flex-wrap items-start gap-10">
					{scenes.map(({ scene, label }) => (
						<Shot key={scene} label={label}>
							<V1 scene={scene} />
						</Shot>
					))}
				</div>
			</section>
		</main>
	);
}

function Shot({ label, children }: { label: string; children: ReactNode }) {
	return (
		<div className="flex flex-col gap-2">
			<span className="text-2xs tracking-micro text-fg-muted uppercase">{label}</span>
			{children}
		</div>
	);
}
