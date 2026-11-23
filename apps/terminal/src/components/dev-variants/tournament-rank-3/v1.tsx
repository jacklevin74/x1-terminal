import type { RankMarkProps } from "@/components/dev-variants/tournament-rank/rank-mark";
import { cn } from "@/lib/cn";

export function RankMark({ rank, lead }: RankMarkProps) {
	return (
		<span
			className={cn(
				"leading-none font-light tracking-tight text-fg tabular-nums",
				lead ? "-ml-0.5 text-6xl" : "text-3xl text-fg-secondary",
			)}
		>
			{rank}
		</span>
	);
}
