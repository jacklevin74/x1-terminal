import type { RankMarkProps } from "@/components/dev-variants/tournament-rank/rank-mark";
import { cn } from "@/lib/cn";

export default function V2({ rank, lead }: RankMarkProps) {
	return (
		<span
			className={cn(
				"grid flex-none place-items-center rounded-8 font-semibold tabular-nums",
				lead ? "size-12 text-lg" : "size-8 text-sm",
				rank === 1 ? "bg-fill text-fg-inverse" : "bg-control text-fg",
			)}
		>
			{rank}
		</span>
	);
}
