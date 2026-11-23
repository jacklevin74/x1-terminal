import type { Tier, Trader } from "@/components/tournament/data";
import { cn } from "@/lib/cn";

export interface RankMarkProps {
	rank: number;
	lead?: boolean;
	r: Trader;
	tier: Tier;
}

export function RankMark({ rank, lead }: RankMarkProps) {
	return (
		<span className={cn("leading-none font-semibold tabular-nums", lead ? "text-3xl" : "text-lg text-fg-muted")}>
			{String(rank).padStart(2, "0")}
		</span>
	);
}
