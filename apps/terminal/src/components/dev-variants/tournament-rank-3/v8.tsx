import type { RankMarkProps } from "@/components/dev-variants/tournament-rank/rank-mark";
import { cn } from "@/lib/cn";

const CUT = "polygon(0 0, calc(100% - 9px) 0, 100% 9px, 100% 100%, 0 100%)";

export function RankMark({ rank, lead }: RankMarkProps) {
	return (
		<span
			className={cn(
				"grid flex-none place-items-center self-start font-bold tabular-nums",
				lead ? "size-11 text-xl" : "size-8 text-base",
				rank === 1 ? "bg-fill text-fg-inverse" : "bg-control-hover text-fg",
			)}
			style={{ clipPath: CUT }}
		>
			{rank}
		</span>
	);
}
