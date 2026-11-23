import type { ComponentType } from "react";
import { account, atRisk, coinLabel, type SceneProps } from "./data";
import V1 from "./v1";
import V2 from "./v2";
import V3 from "./v3";
import V4 from "./v4";
import V5 from "./v5";

const variants: { C: ComponentType<SceneProps>; title: string }[] = [
	{ C: V1, title: "Locked form overlay, start modal grouped by risk" },
	{ C: V2, title: "Disabled form with a pause row, inline review before start" },
	{ C: V3, title: "Manual tab becomes a bot summary, hand-over page" },
	{ C: V4, title: "Pause replaces the order button, per-position keep or close" },
	{ C: V5, title: "Sub-account suggestion" },
];

export function AutoGuardGallery() {
	return (
		<main className="dark min-h-screen bg-background text-fg">
			<p className="px-10 pt-8 text-xs text-fg-muted">
				Example account: real positions of pool trader {account.usr.slice(0, 6)}…{account.usr.slice(-4)}. Bot market
				list: the real 18 Auto Trader markets. {atRisk.map((p) => coinLabel(p.coin)).join(" and ")} are not on it.
			</p>
			{variants.map(({ C, title }, i) => (
				<section key={title} className="flex flex-col gap-6 px-10 py-10">
					<div className="flex items-center gap-3 text-xs">
						<span className="rounded-full bg-fill px-2.5 py-0.5 font-semibold text-fg-inverse">#{i + 1}</span>
						<span>{title}</span>
					</div>
					<div className="flex flex-wrap items-start gap-10">
						<Scene label="Manual tab, Auto Trader live">
							<C scene="manual" />
						</Scene>
						<Scene label="Start with open positions">
							<C scene="start" />
						</Scene>
					</div>
					<Scene label="Close a position from the positions table while live">
						<C scene="close" />
					</Scene>
				</section>
			))}
		</main>
	);
}

function Scene({ label, children }: { label: string; children: React.ReactNode }) {
	return (
		<div className="flex flex-col gap-2">
			<span className="text-2xs tracking-micro text-fg-muted uppercase">{label}</span>
			{children}
		</div>
	);
}
