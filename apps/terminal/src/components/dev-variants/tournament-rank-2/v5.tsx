import { CrownSimpleIcon } from "@phosphor-icons/react";
import type { RankAvatarProps } from "@/components/dev-variants/tournament-rank/legacy-top-three";
import type { RankMarkProps } from "@/components/dev-variants/tournament-rank/rank-mark";
import { Identicon } from "@/components/tournament/parts";
import { cn } from "@/lib/cn";

const TONE = ["text-fg", "text-fg-secondary", "text-fg-muted"];

export function RankMark(_: RankMarkProps) {
	return null;
}

export function RankAvatar({ r, lead }: RankAvatarProps) {
	return (
		<span className={cn("relative flex-none", lead ? "mt-3 mr-1 ml-1" : "mt-2 mr-1 ml-1")}>
			<Identicon id={r.address} className={cn("rounded-full", lead ? "size-12" : "size-10")} />
			<CrownSimpleIcon
				weight="fill"
				className={cn(
					"absolute -rotate-[28deg]",
					lead ? "-top-5 -left-3.5 size-9" : "-top-4 -left-3 size-7",
					TONE[r.rank - 1],
				)}
			/>
		</span>
	);
}
