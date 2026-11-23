import type { RankMarkProps } from "@/components/dev-variants/tournament-rank/rank-mark";
import { cn } from "@/lib/cn";

export function RankMark({ rank, lead }: RankMarkProps) {
	return (
		<>
			<span
				className={cn(
					"absolute top-0 left-0 flex items-center rounded-br-6 font-semibold tabular-nums",
					lead ? "h-7 px-3.5 text-sm" : "h-6 px-3 text-xs",
					rank === 1 ? "bg-fill text-fg-inverse" : "bg-control-hover text-fg",
				)}
			>
				{rank}
			</span>
			<span className="block w-0 flex-none" />
		</>
	);
}
