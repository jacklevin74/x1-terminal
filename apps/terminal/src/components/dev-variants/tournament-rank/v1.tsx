import type { RankMarkProps } from "@/components/dev-variants/tournament-rank/rank-mark";
import { cn } from "@/lib/cn";

const SUFFIX = ["st", "nd", "rd"];

export default function V1({ rank, lead }: RankMarkProps) {
	return (
		<span
			className={cn(
				"flex items-start leading-none font-semibold tabular-nums",
				lead ? "text-3xl text-fg" : "text-lg text-fg-secondary",
			)}
		>
			{rank}
			<span className={cn("font-medium text-fg-muted", lead ? "mt-1 ml-0.5 text-sm" : "mt-0.5 text-xs")}>
				{SUFFIX[rank - 1]}
			</span>
		</span>
	);
}
