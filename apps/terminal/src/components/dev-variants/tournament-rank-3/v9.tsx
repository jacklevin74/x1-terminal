import type { RankMarkProps } from "@/components/dev-variants/tournament-rank/rank-mark";
import { cn } from "@/lib/cn";

const HEX = "polygon(50% 0, 100% 25%, 100% 75%, 50% 100%, 0 75%, 0 25%)";
const TONE = ["bg-fill", "bg-fg-secondary", "bg-fg-muted"];

export function RankMark({ rank, lead }: RankMarkProps) {
	return (
		<span
			className={cn(
				"grid flex-none place-items-center self-start font-bold text-fg-inverse tabular-nums",
				lead ? "h-12 w-11 text-lg" : "h-9 w-8 text-sm",
				TONE[rank - 1],
			)}
			style={{ clipPath: HEX }}
		>
			{rank}
		</span>
	);
}
