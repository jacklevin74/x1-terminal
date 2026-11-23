import type { RankMarkProps } from "@/components/dev-variants/tournament-rank/rank-mark";
import { cn } from "@/lib/cn";

export function RankMark({ rank, lead }: RankMarkProps) {
	return (
		<span
			aria-hidden="true"
			className={cn(
				"pointer-events-none absolute -z-10 leading-none font-black tracking-tighter text-control tabular-nums select-none",
				lead ? "-top-4 right-8 text-9xl" : "-top-3 right-[204px] text-8xl",
			)}
		>
			{rank}
		</span>
	);
}
