import type { RankMarkProps } from "@/components/dev-variants/tournament-rank/rank-mark";
import { cn } from "@/lib/cn";

const TONE = ["bg-fill", "bg-fg-secondary", "bg-fg-muted"];

export function RankMark({ rank, lead }: RankMarkProps) {
	return (
		<span
			className={cn(
				"grid flex-none place-items-center self-start rounded-4 font-bold text-fg-inverse tabular-nums shadow-[inset_0_-3px_0_rgb(0_0_0/0.22)]",
				lead ? "size-11 text-lg" : "size-8 text-base",
				TONE[rank - 1],
			)}
		>
			{rank}
		</span>
	);
}
