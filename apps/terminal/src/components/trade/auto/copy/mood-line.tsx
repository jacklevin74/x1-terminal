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
	const up = score >= 0;
	const w = Math.abs(score) / 2;
	const color = up ? "var(--color-market-up)" : "var(--color-market-down)";
	const box = up ? { left: "50%", width: `${w}%` } : { right: "50%", width: `${w}%` };
	const tip = `${50 + (up ? w : -w)}%`;
	return (
		<span className="relative block h-4">
			<span className="absolute inset-x-0 top-1/2 h-px bg-fg-disabled" />
			<span
				className="absolute top-1/2 h-1 -translate-y-1/2 blur-[6px] transition-all"
				style={{ ...box, background: color }}
			/>
			<span
				className="absolute top-1/2 h-0.5 -translate-y-1/2 transition-all"
				style={{ ...box, background: color, borderRadius: up ? "0 99px 99px 0" : "99px 0 0 99px" }}
			/>
			{score !== 0 && (
				<>
					<span
						className="absolute top-1/2 size-3 -translate-x-1/2 -translate-y-1/2 rounded-full blur-[5px] transition-all"
						style={{ left: tip, background: color }}
					/>
					<span
						className="absolute top-1/2 size-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-fg transition-all"
						style={{ left: tip }}
					/>
				</>
			)}
			<span className="absolute top-1/2 left-1/2 h-4 w-0.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-fg" />
		</span>
	);
}
