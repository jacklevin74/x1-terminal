import { tiers } from "@/components/tournament/data";
import { TopThree as V1 } from "./v1";
import { TopThree as V2 } from "./v2";
import { TopThree as V3 } from "./v3";
import { TopThree as V4 } from "./v4";
import { TopThree as V5 } from "./v5";
import { TopThree as V6 } from "./v6";
import { TopThree as V7 } from "./v7";
import { TopThree as V8 } from "./v8";
import { TopThree as V9 } from "./v9";
import { TopThree as V10 } from "./v10";

const VARIANTS = [
	{ n: "#1", name: "Numbered podium blocks, avatars above", src: "Dribbble, dripit", C: V1 },
	{ n: "#2", name: "Tinted top-3 rows with hex place badges", src: "Tracker.gg", C: V2 },
	{ n: "#3", name: "Dense table with a split bar and white avatar discs", src: "op.gg", C: V3 },
	{ n: "#4", name: "Three boards, each ranks by a different stat", src: "Lichess", C: V4 },
	{ n: "#5", name: "Pill rows with rank discs on a checker ground", src: "LeetCode", C: V5 },
	{ n: "#6", name: "#1 expanded with stat tiles, others compact with moves", src: "HLTV", C: V6 },
	{ n: "#7", name: "Biggest wins list, account before and after", src: "Polymarket", C: V7 },
	{ n: "#8", name: "Race banner with pot and countdown, position tiles", src: "Casino daily race", C: V8 },
	{ n: "#9", name: "Standings with a prize zone", src: "Duolingo leagues", C: V9 },
	{ n: "#10", name: "Ringed avatars, 1st larger, traders around you", src: "Dribbble, Daily UI 019", C: V10 },
];

export function TournamentTop36Gallery() {
	return (
		<div className="dark min-h-dvh bg-background px-8 py-8 font-sans text-fg">
			<div className="mx-auto flex max-w-[1440px] flex-col gap-12">
				{VARIANTS.map((v) => (
					<section key={v.n} className="flex flex-col gap-4">
						<div className="flex items-center gap-3 text-sm">
							<span className="rounded-full bg-fill px-2 py-0.5 text-xs font-semibold text-fg-inverse">{v.n}</span>
							<span className="text-fg">{v.name}</span>
							<span className="text-fg-muted">{v.src}</span>
						</div>
						<v.C tier={tiers.low} />
					</section>
				))}
			</div>
		</div>
	);
}
