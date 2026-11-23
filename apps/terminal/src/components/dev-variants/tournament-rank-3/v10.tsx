import type { RankMarkProps } from "@/components/dev-variants/tournament-rank/rank-mark";
import { cn } from "@/lib/cn";

const WORD = ["First", "Second", "Third"];

export function RankMark({ rank, lead }: RankMarkProps) {
	return (
		<span className="flex flex-none flex-col gap-1 self-start">
			<span className={cn("leading-none font-semibold text-fg tabular-nums", lead ? "text-3xl" : "text-xl")}>
				{rank}
			</span>
			<span className="text-2xs tracking-micro text-fg-muted uppercase">{WORD[rank - 1]}</span>
		</span>
	);
}
