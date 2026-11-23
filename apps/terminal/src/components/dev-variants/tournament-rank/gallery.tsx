import type { ComponentType } from "react";
import { TopThree } from "@/components/dev-variants/tournament-rank/legacy-top-three";
import { RankMark, type RankMarkProps } from "@/components/dev-variants/tournament-rank/rank-mark";
import { tiers } from "@/components/tournament/data";
import V1 from "./v1";
import V2 from "./v2";
import V3 from "./v3";
import V4 from "./v4";
import V5 from "./v5";
import V6 from "./v6";

const VARIANTS: { n: string; name: string; Mark: ComponentType<RankMarkProps> }[] = [
	{ n: "Now", name: "Padded numerals (01, 02, 03)", Mark: RankMark },
	{ n: "#1", name: "Ordinal with small suffix (1st)", Mark: V1 },
	{ n: "#2", name: "Filled square, 1st inverted white", Mark: V2 },
	{ n: "#3", name: "Tonal discs, white to grey by place", Mark: V3 },
	{ n: "#4", name: "Podium glyph with the place filled", Mark: V4 },
	{ n: "#5", name: "Trophy and medal icons in a disc", Mark: V5 },
	{ n: "#6", name: "Place pill (1st place)", Mark: V6 },
];

export function TournamentRankGallery() {
	return (
		<div className="dark min-h-dvh bg-background px-8 py-8 font-sans text-fg">
			<div className="mx-auto flex max-w-[1440px] flex-col gap-12">
				{VARIANTS.map((v) => (
					<section key={v.n} className="flex flex-col gap-4">
						<div className="flex items-center gap-3 text-sm">
							<span className="rounded-full bg-fill px-2 py-0.5 text-xs font-semibold text-fg-inverse">{v.n}</span>
							<span className="text-fg-secondary">{v.name}</span>
						</div>
						<TopThree tier={tiers.low} Mark={v.Mark} />
					</section>
				))}
			</div>
		</div>
	);
}
