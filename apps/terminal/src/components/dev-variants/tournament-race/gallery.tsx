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
	{ n: "#1", name: "The pick, as is: banner, countdown tiles, position tiles", C: V1 },
	{ n: "#2", name: "White banner, inline countdown, rounded cards", C: V2 },
	{ n: "#3", name: "One strip: pot and clock in a bar, positions as rows", C: V3 },
	{ n: "#4", name: "Pot as the hero, centred, avatar tiles", C: V4 },
	{ n: "#5", name: "Round progress bar instead of a clock", C: V5 },
	{ n: "#6", name: "Pot card on the left, positions stacked on the right", C: V6 },
	{ n: "#7", name: "Prize podium steps", C: V7 },
	{ n: "#8", name: "Green live banner, green clock and prizes", C: V8 },
	{ n: "#9", name: "Clock with colons, prize split bar", C: V9 },
	{ n: "#10", name: "No banner surface, light type, cells", C: V10 },
];

export function TournamentRaceGallery() {
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
