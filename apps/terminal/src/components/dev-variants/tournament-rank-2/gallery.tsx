import type { ComponentType } from "react";
import { type RankAvatarProps, TopThree } from "@/components/dev-variants/tournament-rank/legacy-top-three";
import type { RankMarkProps } from "@/components/dev-variants/tournament-rank/rank-mark";
import { tiers } from "@/components/tournament/data";
import * as V1 from "./v1";
import * as V2 from "./v2";
import * as V3 from "./v3";
import * as V4 from "./v4";
import * as V5 from "./v5";
import * as V6 from "./v6";
import * as V7 from "./v7";
import * as V8 from "./v8";
import * as V9 from "./v9";
import * as V10 from "./v10";

interface Variant {
	n: string;
	name: string;
	src: string;
	mod: { RankMark: ComponentType<RankMarkProps>; RankAvatar?: ComponentType<RankAvatarProps> };
}

const VARIANTS: Variant[] = [
	{ n: "#1", name: "Laurel wreath around an italic numeral", src: "Hyperdash top-3 cards", mod: V1 },
	{ n: "#2", name: "Ribbon medal pinned to the avatar", src: "Polymarket leaderboard", mod: V2 },
	{ n: "#3", name: "Solid tile with a bevel", src: "Chess.com leaderboard", mod: V3 },
	{ n: "#4", name: "Large hash numeral", src: "Chess.com rows", mod: V4 },
	{ n: "#5", name: "Crown tilted on the avatar", src: "Bybit copy trading", mod: V5 },
	{ n: "#6", name: "Metal coin with a sheen", src: "Kaggle medals", mod: V6 },
	{ n: "#7", name: "Podium with numbered steps", src: "Chess.com leaderboard icon", mod: V7 },
	{ n: "#8", name: "Slanted position plate with a color strip", src: "F1 TV timing tower", mod: V8 },
	{ n: "#9", name: "Large background numeral", src: "Formula1.com driver cards", mod: V9 },
	{ n: "#10", name: "Avatar ring with a crown badge", src: "Binance copy trading", mod: V10 },
];

export function TournamentRank2Gallery() {
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
						<TopThree tier={tiers.low} Mark={v.mod.RankMark} Avatar={v.mod.RankAvatar} />
					</section>
				))}
			</div>
		</div>
	);
}
