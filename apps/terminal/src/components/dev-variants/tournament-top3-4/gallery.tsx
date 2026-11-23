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
	{ n: "#1", name: "Inverted: the leader card is white", C: V1 },
	{ n: "#2", name: "Poster type: the PNL at 72px, nothing else loud", C: V2 },
	{ n: "#3", name: "Soft fintech: round, lighter, chips", C: V3 },
	{ n: "#4", name: "Monochrome terminal: no green, cells on a grid", C: V4 },
	{ n: "#5", name: "Hue-tinted: the card takes the trader's colour", C: V5 },
	{ n: "#6", name: "Chart flood: the whole card is the chart", C: V6 },
	{ n: "#7", name: "Bare editorial list: no surfaces at all", C: V7 },
	{ n: "#8", name: "Sharp brutalist: Geist numerals, square corners", C: V8 },
];

export function TournamentTop34Gallery() {
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
