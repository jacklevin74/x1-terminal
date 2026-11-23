import type { RankMarkProps } from "@/components/dev-variants/tournament-rank/rank-mark";
import { cn } from "@/lib/cn";

export function RankMark({ rank, lead }: RankMarkProps) {
	if (rank === 1) {
		return (
			<span
				className={cn(
					"grid flex-none place-items-center self-start rounded-4 bg-fill font-bold text-fg-inverse tabular-nums",
					lead ? "size-11 text-xl" : "size-9 text-base",
				)}
			>
				1
			</span>
		);
	}
	return (
		<span
			className={cn(
				"flex flex-none items-center self-start pl-0.5 font-semibold text-fg-muted tabular-nums",
				lead ? "h-11 text-xl" : "h-9 text-lg",
			)}
		>
			{rank}
		</span>
	);
}
