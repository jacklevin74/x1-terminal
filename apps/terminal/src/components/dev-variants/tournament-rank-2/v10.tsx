import { CrownSimpleIcon } from "@phosphor-icons/react";
import type { RankAvatarProps } from "@/components/dev-variants/tournament-rank/legacy-top-three";
import type { RankMarkProps } from "@/components/dev-variants/tournament-rank/rank-mark";
import { Identicon } from "@/components/tournament/parts";
import { cn } from "@/lib/cn";

const RING = ["ring-fill", "ring-fg-secondary", "ring-fg-muted"];
const TONE = ["text-fg", "text-fg-secondary", "text-fg-muted"];

export function RankMark(_: RankMarkProps) {
	return null;
}

export function RankAvatar({ r, lead }: RankAvatarProps) {
	return (
		<span className="relative mr-1 flex-none">
			<span className={cn("block rounded-full ring-2 ring-offset-2 ring-offset-surface", RING[r.rank - 1])}>
				<Identicon id={r.address} className={cn("rounded-full", lead ? "size-11" : "size-9")} />
			</span>
			<span
				className={cn(
					"absolute grid place-items-center rounded-full bg-surface",
					lead ? "-top-2 -right-2 size-5" : "-top-2 -right-2 size-4.5",
				)}
			>
				<CrownSimpleIcon weight="fill" className={cn("rotate-12", lead ? "size-4" : "size-3.5", TONE[r.rank - 1])} />
			</span>
		</span>
	);
}
