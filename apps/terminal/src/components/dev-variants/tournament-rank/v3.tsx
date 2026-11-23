import type { RankMarkProps } from "@/components/dev-variants/tournament-rank/rank-mark";
import { cn } from "@/lib/cn";

const TONE = ["bg-fill", "bg-fg-secondary", "bg-fg-muted"];

export default function V3({ rank, lead }: RankMarkProps) {
	return (
		<span
			className={cn(
				"grid flex-none place-items-center rounded-full font-semibold text-fg-inverse tabular-nums",
				lead ? "size-12 text-lg" : "size-8 text-sm",
				TONE[rank - 1],
			)}
		>
			{rank}
		</span>
	);
}
