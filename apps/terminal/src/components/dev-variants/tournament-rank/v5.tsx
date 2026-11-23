import { MedalIcon, TrophyIcon } from "@phosphor-icons/react";
import type { RankMarkProps } from "@/components/dev-variants/tournament-rank/rank-mark";
import { cn } from "@/lib/cn";

const TONE = ["text-fg", "text-fg-secondary", "text-fg-muted"];

export default function V5({ rank, lead }: RankMarkProps) {
	const Icon = rank === 1 ? TrophyIcon : MedalIcon;
	return (
		<span className="flex flex-none items-center gap-2 self-start">
			<span className={cn("grid place-items-center rounded-full bg-control", lead ? "size-12" : "size-8")}>
				<Icon weight="fill" className={cn(lead ? "size-6" : "size-4", TONE[rank - 1])} />
			</span>
			<span className={cn("font-semibold tabular-nums", lead ? "text-lg" : "text-sm", TONE[rank - 1])}>{rank}</span>
		</span>
	);
}
