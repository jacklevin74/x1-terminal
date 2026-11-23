import { tiers } from "@/components/tournament/data";
import { TopThree as V1 } from "./v1";
import { TopThree as V2 } from "./v2";
import { TopThree as V3 } from "./v3";
import { TopThree as V4 } from "./v4";
import { TopThree as V5 } from "./v5";

const VARIANTS = [
	{ n: "#1", name: "Scoreboard: centred giant numbers, cells under", C: V1 },
	{ n: "#2", name: "Trading cards: portrait, identicon as the hero image", C: V2 },
	{ n: "#3", name: "Race lanes: avatars run toward the prize", C: V3 },
	{ n: "#4", name: "Share rings around the avatar", C: V4 },
	{ n: "#5", name: "Lit leader: green light falls from the top edge", C: V5 },
];

export function TournamentTop35Gallery() {
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
