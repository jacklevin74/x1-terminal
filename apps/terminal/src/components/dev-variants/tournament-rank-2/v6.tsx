import type { RankMarkProps } from "@/components/dev-variants/tournament-rank/rank-mark";
import { cn } from "@/lib/cn";

const COIN = [
	"linear-gradient(135deg, var(--color-fg) 0%, var(--color-fg-secondary) 100%)",
	"linear-gradient(135deg, var(--color-fg-secondary) 0%, var(--color-fg-muted) 100%)",
	"linear-gradient(135deg, var(--color-fg-muted) 0%, var(--color-fg-disabled) 100%)",
];

export function RankMark({ rank, lead }: RankMarkProps) {
	return (
		<span
			className={cn(
				"relative grid flex-none place-items-center self-start overflow-hidden rounded-full font-bold text-fg-inverse tabular-nums",
				lead ? "size-11 text-lg" : "size-8 text-sm",
			)}
			style={{ background: COIN[rank - 1] }}
		>
			<span className="absolute -inset-2 rotate-45 bg-[linear-gradient(90deg,transparent_42%,rgb(255_255_255/0.35)_50%,transparent_58%)]" />
			<span className="relative">{rank}</span>
		</span>
	);
}
