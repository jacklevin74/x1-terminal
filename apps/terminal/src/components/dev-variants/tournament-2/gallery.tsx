import type { ComponentType } from "react";
import { Frame } from "../tournament/frame";
import { SNAPSHOT, tiers, usd } from "./data";
import V1, { V1Mobile } from "./v1";
import V2 from "./v2";
import V3, { V3Mobile } from "./v3";
import V4 from "./v4";
import V5, { V5Mobile } from "./v5";

const variants: { C: ComponentType; title: string; mobile?: string }[] = [
	{ C: V1, title: "Hyperdash leaderboard: top 3 cards with laurel and PNL chart, dense table", mobile: "1" },
	{ C: V2, title: "Bybit WSOT weight classes: digit countdown, pot track, prize cards" },
	{ C: V3, title: "Polymarket perps competition: your progress, time blocks, prize pool, movers", mobile: "3" },
	{ C: V4, title: "GMX zebra table + Hyperdash row sparklines, Live and Past rounds" },
	{ C: V5, title: "Jupiter weekly board as a drawer over the trade page", mobile: "5" },
];

const MOBILE: Record<string, ComponentType> = { "1": V1Mobile, "3": V3Mobile, "5": V5Mobile };

const note = `Hyperliquid week window as the round (snapshot ${SNAPSHOT}). 24h rank change and 30d PNL path are derived from the same snapshot. Example pot ${usd(tiers.high.pot)} and ${usd(tiers.low.pot)}, example time left, 50/30/20 split.`;

export function Tournament2Gallery() {
	const params = new URLSearchParams(window.location.search);
	const Mobile = params.get("frame") === "mobile" ? MOBILE[params.get("v") ?? ""] : undefined;
	if (Mobile) return <Mobile />;
	return (
		<main className="dark bg-background text-fg">
			{variants.map(({ C, title, mobile }, i) => (
				<div key={title}>
					<section className="relative h-screen border-b border-stroke-weak">
						<Header n={i + 1} title={title} />
						<Frame>
							<C />
						</Frame>
					</section>
					{mobile && (
						<section className="relative h-[924px] border-b border-stroke-weak">
							<Header n={i + 1} title={`${title} (mobile 390px)`} />
							<div className="absolute inset-x-0 top-10 bottom-0 flex items-center justify-center">
								<iframe
									title={`#${i + 1} mobile`}
									src={`/dev/variants/tournament-2?frame=mobile&v=${mobile}`}
									width={390}
									height={844}
									className="rounded-8 bg-background"
								/>
							</div>
						</section>
					)}
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
