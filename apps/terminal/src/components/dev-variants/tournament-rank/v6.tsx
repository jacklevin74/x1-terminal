import type { RankMarkProps } from "@/components/dev-variants/tournament-rank/rank-mark";
import { cn } from "@/lib/cn";

const LABEL = ["1st place", "2nd place", "3rd place"];

export default function V6({ rank, lead }: RankMarkProps) {
	return (
		<span
			className={cn(
				"flex h-7 flex-none items-center self-start rounded-full px-3 text-xs font-medium whitespace-nowrap",
				rank === 1 ? "bg-fill text-fg-inverse" : "bg-control text-fg-secondary",
				lead && "h-8 px-4 text-sm",
			)}
		>
			{LABEL[rank - 1]}
		</span>
	);
}
