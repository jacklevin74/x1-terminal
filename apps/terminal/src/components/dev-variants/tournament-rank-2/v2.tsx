import type { RankAvatarProps } from "@/components/dev-variants/tournament-rank/legacy-top-three";
import type { RankMarkProps } from "@/components/dev-variants/tournament-rank/rank-mark";
import { Identicon } from "@/components/tournament/parts";
import { cn } from "@/lib/cn";

const TONE = ["bg-fill", "bg-fg-secondary", "bg-fg-muted"];

export function RankMark({ rank, lead }: RankMarkProps) {
	return (
		<span className={cn("leading-none font-medium text-fg-muted tabular-nums", lead ? "text-lg" : "text-sm")}>
			{rank}
		</span>
	);
}

export function RankAvatar({ r, lead }: RankAvatarProps) {
	const tone = TONE[r.rank - 1];
	return (
		<span className="relative mr-1 flex-none">
			<Identicon id={r.address} className={cn("rounded-full", lead ? "size-10" : "size-8")} />
			<span className={cn("absolute", lead ? "-bottom-3 -left-2 size-5" : "-bottom-2.5 -left-1.5 size-4")}>
				<span
					className={cn(
						"absolute -bottom-2 left-[14%] h-3 w-1.5 rotate-[24deg] rounded-b-xs ring-2 ring-surface",
						tone,
					)}
				/>
				<span
					className={cn(
						"absolute right-[14%] -bottom-2 h-3 w-1.5 -rotate-[24deg] rounded-b-xs ring-2 ring-surface",
						tone,
					)}
				/>
				<span className={cn("absolute inset-0 rounded-full ring-2 ring-surface", tone)} />
			</span>
		</span>
	);
}
