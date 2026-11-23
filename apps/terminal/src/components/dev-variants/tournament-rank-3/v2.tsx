import type { RankMarkProps } from "@/components/dev-variants/tournament-rank/rank-mark";
import { cn } from "@/lib/cn";

export function RankMark({ rank, lead }: RankMarkProps) {
	return (
		<span
			className={cn(
				"inline-flex flex-none items-center self-start rounded-xs font-semibold tracking-micro tabular-nums",
				lead ? "h-6 px-2 text-xs" : "h-5 px-1.5 text-2xs",
				rank === 1 ? "bg-fill text-fg-inverse" : "bg-control-hover text-fg",
			)}
		>
			P{rank}
		</span>
	);
}
