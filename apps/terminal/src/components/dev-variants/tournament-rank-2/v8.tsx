import type { RankMarkProps } from "@/components/dev-variants/tournament-rank/rank-mark";
import { cn } from "@/lib/cn";

export function RankMark({ rank, lead }: RankMarkProps) {
	return (
		<span className={cn("flex flex-none -skew-x-12 self-start", lead ? "h-11" : "h-8")}>
			<span
				className={cn(
					"grid place-items-center rounded-l-xs font-bold italic tabular-nums",
					lead ? "w-11 text-xl" : "w-8 text-base",
					rank === 1 ? "bg-fill text-fg-inverse" : "bg-control-hover text-fg",
				)}
			>
				<span className="skew-x-12">{rank}</span>
			</span>
			<span className={cn("rounded-r-xs bg-fg-muted", lead ? "w-1.5" : "w-1")} />
		</span>
	);
}
