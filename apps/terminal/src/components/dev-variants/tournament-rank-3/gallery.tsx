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
	{ n: "#1", name: "Thin editorial numeral", src: "FT and Bloomberg rankings", mod: V1 },
	{ n: "#2", name: "P1 tag", src: "F1 timing, Lighter rank chips", mod: V2 },
	{ n: "#3", name: "Rank of field size", src: "Lighter stats, Strava", mod: V3 },
	{ n: "#4", name: "Rank with 24h move", src: "Chess.com rows", mod: V4 },
	{ n: "#5", name: "Number badge on the avatar", src: "Polymarket, Discord", mod: V5 },
	{ n: "#6", name: "Corner tab on the card", src: "Binance and Bybit cards", mod: V6 },
	{ n: "#7", name: "Only 1st gets the filled block", src: "Hyperdash emphasis", mod: V7 },
	{ n: "#8", name: "Chamfered plate", src: "Terminal and GMX chips", mod: V8 },
	{ n: "#9", name: "Hexagon badge", src: "Chess.com and game ranks", mod: V9 },
	{ n: "#10", name: "Numeral with the place word", src: "Stat tiles", mod: V10 },
];

export function TournamentRank3Gallery() {
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
