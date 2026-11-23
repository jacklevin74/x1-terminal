import type { ComponentType, ReactNode } from "react";
import type { SceneProps } from "./parts";
import V1 from "./v1";
import V2 from "./v2";
import V3 from "./v3";
import V4 from "./v4";
import V5 from "./v5";

const variants: { C: ComponentType<SceneProps>; title: string; deep: string }[] = [
	{ C: V1, title: "Clean rows with a row menu", deep: "Row menu, then Move funds" },
	{ C: V2, title: "Account cards with a detail page", deep: "Row arrow, then Add from Main" },
	{ C: V3, title: "Compact switch list with one Move funds entry", deep: "Move funds, with From and To" },
	{ C: V4, title: "Grouped rows that expand to actions", deep: "Row caret, then Add from Main" },
	{ C: V5, title: "Switch-only menu with a Manage accounts dialog", deep: "Manage accounts, then Move funds" },
];

export function SubAccounts2Gallery() {
	return (
		<main className="dark min-h-screen bg-background text-fg">
			<p className="px-10 pt-8 text-xs text-fg-muted">
				Round 2, from round 1 #1 (wallet menu). Example balances and sub-account names. Trader names from the
				Hyperliquid leaderboard (2026-11-18). Every frame is live.
			</p>
			{variants.map(({ C, title, deep }, i) => (
				<section key={title} className="flex flex-col gap-6 px-10 py-8">
					<div className="flex items-center gap-3 text-xs">
						<span className="rounded-full bg-fill px-2.5 py-0.5 font-semibold text-fg-inverse">#{i + 1}</span>
						<span>{title}</span>
					</div>
					<div className="flex flex-wrap items-start gap-10">
						<Scene label="Default (menu open)">
							<C scene="default" />
						</Scene>
						<Scene label={`Deeper: ${deep}`}>
							<C scene="transfer" />
						</Scene>
					</div>
				</section>
			))}
		</main>
	);
}

function Scene({ label, children }: { label: string; children: ReactNode }) {
	return (
		<div className="flex flex-col gap-2">
			<span className="text-2xs tracking-micro text-fg-muted uppercase">{label}</span>
			{children}
		</div>
	);
}
