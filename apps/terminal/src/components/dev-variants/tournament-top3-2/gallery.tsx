import { tiers } from "@/components/tournament/data";
import { TopThree as V1 } from "./v1";
import { TopThree as V2 } from "./v2";
import { TopThree as V3 } from "./v3";
import { TopThree as V4 } from "./v4";
import { TopThree as V5 } from "./v5";
import { TopThree as V6 } from "./v6";
import { TopThree as V7 } from "./v7";
import { TopThree as V8 } from "./v8";

const VARIANTS = [
	{ n: "#1", name: "Sparkline header, gap-to-leader bar, stat footer", C: V1 },
	{ n: "#2", name: "Chart in an inset well, micro-label stats", C: V2 },
	{ n: "#3", name: "Chart on top, trader footer", C: V3 },
	{ n: "#4", name: "Large avatar with a corner rank badge", C: V4 },
	{ n: "#5", name: "Terminal stat tile, PNL as the hero", C: V5 },
	{ n: "#6", name: "Thin numeral and a ledger", C: V6 },
	{ n: "#7", name: "Rows with a leader bar", C: V7 },
	{ n: "#8", name: "Header band, 1st inverted", C: V8 },
];

export function TournamentTop32Gallery() {
	return (
		<div className="dark min-h-dvh bg-background px-8 py-8 font-sans text-fg">
			<div className="mx-auto flex max-w-[1440px] flex-col gap-12">
				{VARIANTS.map((v) => (
					<section key={v.n} className="flex flex-col gap-4">
						<div className="flex items-center gap-3 text-sm">
							<span className="rounded-full bg-fill px-2 py-0.5 text-xs font-semibold text-fg-inverse">{v.n}</span>
							<span className="text-fg">{v.name}</span>
						</div>
						<v.C tier={tiers.low} />
					</section>
				))}
			</div>
		</div>
	);
}
