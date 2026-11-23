import type { RankMarkProps } from "@/components/dev-variants/tournament-rank/rank-mark";
import { cn } from "@/lib/cn";

const STEPS = [
	{ place: 2, height: 0.66 },
	{ place: 1, height: 1 },
	{ place: 3, height: 0.42 },
];
const SUFFIX = ["st", "nd", "rd"];

export default function V4({ rank, lead }: RankMarkProps) {
	const h = lead ? 28 : 18;
	return (
		<span className="flex flex-none items-end gap-2 self-start">
			<span className="flex items-end gap-0.5" style={{ height: h }}>
				{STEPS.map((s) => (
					<span
						key={s.place}
						className={cn("rounded-xs", lead ? "w-2" : "w-1.5", s.place === rank ? "bg-fill" : "bg-control-hover")}
						style={{ height: h * s.height }}
					/>
				))}
			</span>
			<span
				className={cn(
					"leading-none font-semibold tabular-nums",
					lead ? "text-lg text-fg" : "text-sm text-fg-secondary",
				)}
			>
				{rank}
				{SUFFIX[rank - 1]}
			</span>
		</span>
	);
}
