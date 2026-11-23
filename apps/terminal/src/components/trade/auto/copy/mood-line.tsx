import { cn } from "@/lib/cn";
import { MOOD_MARKET, moodLabel } from "./data";

interface Props {
	score: number;
	counted: number;
}

export function MoodLine({ score, counted }: Props) {
	const label = moodLabel(score);
	return (
		<div className="flex flex-col gap-1.5">
			<div className="flex items-center justify-between text-xs">
				<span className="text-fg-muted">{MOOD_MARKET} mood</span>
				<span
					className={cn(
						"tabular-nums",
						label === "Bullish" && "text-market-up",
						label === "Bearish" && "text-market-down",
					)}
				>
					{score > 0 ? "+" : ""}
					{score} {label}
				</span>
			</div>
			<MoodBar score={score} />
			<span className="text-2xs text-fg-muted">
				{counted} of the selected traders hold {MOOD_MARKET} now
			</span>
		</div>
	);
}

export function MoodBar({ score }: { score: number }) {
	return (
		<span className="relative h-1.5 rounded-full bg-surface">
			<span className="absolute top-0 left-1/2 h-full w-px bg-fg-muted" />
			<span
				className={cn(
					"absolute top-0 h-full rounded-full transition-all",
					score >= 0 ? "bg-market-up" : "bg-market-down",
				)}
				style={score >= 0 ? { left: "50%", width: `${score / 2}%` } : { right: "50%", width: `${-score / 2}%` }}
			/>
		</span>
	);
}
