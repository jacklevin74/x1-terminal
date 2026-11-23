import type { ComponentType } from "react";
import { Frame } from "../tournament/frame";
import { SNAPSHOT, tiers, usd } from "../tournament-2/data";
import V1, { V1Mobile } from "./v1";
import V2, { V2Mobile } from "./v2";
import V3, { V3Mobile } from "./v3";
import V4, { V4Mobile } from "./v4";
import V5, { V5Mobile } from "./v5";

const variants: { C: ComponentType; M: ComponentType; title: string }[] = [
	{ C: V1, M: V1Mobile, title: "Editorial: big numerals, 1st gets the wide card, labelled line chart" },
	{ C: V2, M: V2Mobile, title: "Race: top 3 share one PNL chart, lane cards with gap to the leader" },
	{ C: V3, M: V3Mobile, title: "Stepped podium: block heights by place, carved PNL chart, row cards" },
	{ C: V4, M: V4Mobile, title: "Terminal panels: trade page density, price-tag charts, 32px rows" },
	{ C: V5, M: V5Mobile, title: "Ranked bars: every PNL is a filled bar against 1st, split pot bar" },
];

const note = `Same layout as tournament-2 #1. Hyperliquid week window as the round (snapshot ${SNAPSHOT}). Example pot ${usd(tiers.high.pot)} and ${usd(tiers.low.pot)}, example time left, 50/30/20 split.`;

export function Tournament3Gallery() {
	const params = new URLSearchParams(window.location.search);
	const v = Number(params.get("v") ?? 0);
	const picked = variants[v - 1];
	if (picked && params.get("frame") === "mobile") return <picked.M />;
	if (picked && params.get("frame") === "desktop") {
		return (
			<main className="dark relative h-screen bg-background text-fg">
				<Header n={v} title={picked.title} />
				<Frame>
					<picked.C />
				</Frame>
			</main>
		);
	}
	return (
		<main className="dark bg-background text-fg">
			{variants.map(({ C, title }, i) => (
				<div key={title}>
					<section className="relative h-screen border-b border-stroke-weak">
						<Header n={i + 1} title={title} />
						<Frame>
							<C />
						</Frame>
					</section>
					<section className="relative h-[924px] border-b border-stroke-weak">
						<Header n={i + 1} title={`${title} (mobile 390px)`} />
						<div className="absolute inset-x-0 top-10 bottom-0 flex items-center justify-center">
							<iframe
								title={`#${i + 1} mobile`}
								src={`/dev/variants/tournament-3?frame=mobile&v=${i + 1}`}
								width={390}
								height={844}
								className="rounded-8 bg-background"
							/>
						</div>
					</section>
				</div>
			))}
		</main>
	);
}

function Header({ n, title }: { n: number; title: string }) {
	return (
		<div className="absolute inset-x-0 top-0 z-50 flex h-10 items-center gap-3 bg-surface px-4 text-xs">
			<span className="rounded-full bg-fill px-2.5 py-0.5 font-semibold text-fg-inverse">#{n}</span>
			<span className="whitespace-nowrap text-fg">{title}</span>
			<span className="ml-auto truncate text-fg-muted">{note}</span>
		</div>
	);
}
