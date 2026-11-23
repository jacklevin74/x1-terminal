import type { RankMarkProps } from "@/components/dev-variants/tournament-rank/rank-mark";
import { cn } from "@/lib/cn";

export function RankMark({ rank, lead, tier }: RankMarkProps) {
	return (
		<span className="flex flex-none flex-col gap-1 self-start tabular-nums">
			<span className={cn("leading-none font-semibold text-fg", lead ? "text-3xl" : "text-xl")}>{rank}</span>
			<span className="text-xs whitespace-nowrap text-fg-muted">of {tier.count.toLocaleString()}</span>
		</span>
	);
}
