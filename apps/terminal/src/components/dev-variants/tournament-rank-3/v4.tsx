import type { RankMarkProps } from "@/components/dev-variants/tournament-rank/rank-mark";
import { move } from "@/components/tournament/data";
import { RankMove } from "@/components/tournament/parts";
import { cn } from "@/lib/cn";

export function RankMark({ rank, lead, r }: RankMarkProps) {
	const m = move(r);
	return (
		<span className="flex flex-none flex-col gap-1 self-start">
			<span className={cn("leading-none font-semibold text-fg tabular-nums", lead ? "text-3xl" : "text-xl")}>
				{rank}
			</span>
			{m === 0 ? <span className="text-xs text-fg-muted">Held</span> : <RankMove value={m} className="text-xs" />}
		</span>
	);
}
