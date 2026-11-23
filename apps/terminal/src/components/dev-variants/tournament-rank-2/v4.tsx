import type { RankMarkProps } from "@/components/dev-variants/tournament-rank/rank-mark";
import { cn } from "@/lib/cn";

export function RankMark({ rank, lead }: RankMarkProps) {
	return (
		<span
			className={cn(
				"flex flex-none items-start self-start leading-none font-bold tracking-tight tabular-nums",
				lead ? "text-5xl text-fg" : "text-3xl text-fg-secondary",
			)}
		>
			<span className={cn("font-medium text-fg-muted", lead ? "mt-1 mr-0.5 text-2xl" : "mt-0.5 mr-0.5 text-lg")}>
				#
			</span>
			{rank}
		</span>
	);
}
