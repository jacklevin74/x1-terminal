import type { RankMarkProps } from "@/components/dev-variants/tournament-rank/rank-mark";
import { cn } from "@/lib/cn";

const STEPS = [
	{ place: 2, height: 0.72 },
	{ place: 1, height: 1 },
	{ place: 3, height: 0.56 },
];

export function RankMark({ rank, lead }: RankMarkProps) {
	const h = lead ? 44 : 32;
	return (
		<span className="flex flex-none items-end gap-px self-start" style={{ height: h }}>
			{STEPS.map((s) => (
				<span
					key={s.place}
					className={cn(
						"flex justify-center rounded-t-xs pt-1 leading-none font-bold tabular-nums",
						lead ? "w-6 text-xs" : "w-4 text-2xs",
						s.place === rank ? "bg-fill text-fg-inverse" : "bg-control-hover text-fg-muted",
					)}
					style={{ height: h * s.height }}
				>
					{s.place}
				</span>
			))}
		</span>
	);
}
