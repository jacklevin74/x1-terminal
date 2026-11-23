import type { RankAvatarProps } from "@/components/dev-variants/tournament-rank/legacy-top-three";
import type { RankMarkProps } from "@/components/dev-variants/tournament-rank/rank-mark";
import { Identicon } from "@/components/tournament/parts";
import { cn } from "@/lib/cn";

export function RankMark(_: RankMarkProps) {
	return null;
}

export function RankAvatar({ r, lead }: RankAvatarProps) {
	return (
		<span className="relative mr-1 flex-none">
			<Identicon id={r.address} className={cn("rounded-4", lead ? "size-10" : "size-8")} />
			<span
				className={cn(
					"absolute grid place-items-center rounded-full bg-fill font-bold text-fg-inverse tabular-nums ring-2 ring-surface",
					lead ? "-right-2 -bottom-2 size-5 text-xs" : "-right-1.5 -bottom-1.5 size-4 text-2xs",
				)}
			>
				{r.rank}
			</span>
		</span>
	);
}
