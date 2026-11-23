import type { ComponentType } from "react";
import { tiers, usd } from "./data";
import { Frame } from "./frame";
import V1 from "./v1";
import V2 from "./v2";
import V3 from "./v3";
import V4 from "./v4";
import V5 from "./v5";

const variants: { C: ComponentType; title: string }[] = [
	{ C: V1, title: "Full page with podium hero" },
	{ C: V2, title: "Dense terminal-style table page" },
	{ C: V3, title: "Tournament tab in the trade page bottom panel" },
	{ C: V4, title: "Market header pill + side drawer" },
	{ C: V5, title: "Tables lobby (pick your table)" },
];

const note = `Hyperliquid week window as the round (snapshot 2026-11-18). Example pot (Jack's estimate is $50K to $100K per round): ${usd(tiers.high.pot)} and ${usd(tiers.low.pot)}. Example time left and 50/30/20 split.`;

export function TournamentGallery() {
	return (
		<main className="dark bg-background text-fg">
			{variants.map(({ C, title }, i) => (
				<section key={title} className="relative h-screen border-b border-stroke-weak">
					<div className="absolute inset-x-0 top-0 z-50 flex h-10 items-center gap-3 bg-surface px-4 text-xs">
						<span className="rounded-full bg-fill px-2.5 py-0.5 font-semibold text-fg-inverse">#{i + 1}</span>
						<span className="whitespace-nowrap text-fg">{title}</span>
						<span className="ml-auto truncate text-fg-muted">{note}</span>
					</div>
					<Frame>
						<C />
					</Frame>
				</section>
			))}
		</main>
	);
}
