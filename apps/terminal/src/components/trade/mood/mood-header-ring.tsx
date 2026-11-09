import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { MOOD_POOL_SIZE, type MoodSignal, moodColor, moodLabel, signedScore } from "@/lib/mood/signal";
import { CoinScoreRow, DivergingBar, ScoreNumber, SpinRing } from "./mood-parts";

interface Props {
	signal: MoodSignal;
	score: number;
}

export function MoodHeaderRing({ signal, score }: Props) {
	const { overall, coins } = signal;
	const total = Math.max(1, coins.length);
	const sorted = [...coins].sort((a, b) => b.score - a.score);
	const updated = new Date(signal.now).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
	return (
		<Popover>
			<PopoverTrigger
				className="flex h-8 items-center gap-2 rounded-8 bg-control px-2.5 transition-colors hover:bg-control-hover"
				aria-label={`Pool mood ${signedScore(score)}, ${moodLabel(score)}`}
			>
				<SpinRing score={score} size={20} />
				<ScoreNumber score={score} className="text-sm font-medium" />
			</PopoverTrigger>
			<PopoverContent align="end" sideOffset={8} className="w-[380px] rounded-8">
				<div className="flex items-start justify-between">
					<div>
						<div className="text-xs text-fg-muted">Pool mood</div>
						<div className="mt-1.5 flex items-baseline gap-2">
							<ScoreNumber score={score} className="text-[40px]" />
							<span className="text-sm text-fg-secondary">{moodLabel(score)}</span>
						</div>
					</div>
					<div className="text-right text-xs text-fg-muted">
						{MOOD_POOL_SIZE} traders
						<br />
						Updated {updated}
					</div>
				</div>
				<DivergingBar value={score} className="mt-4 h-2" />
				<div className="mt-1 flex justify-between text-2xs text-fg-muted">
					<span>{"−100"}</span>
					<span>0</span>
					<span>+100</span>
				</div>
				<div className="mt-4 grid grid-cols-2 gap-2">
					<PartTile label="Positions" weight="60%" value={overall.posScore} />
					<PartTile label="Order flow 24h" weight="40%" value={overall.flowScore} />
				</div>
				<div className="mt-4 flex h-1.5 gap-0.5 overflow-hidden rounded-full">
					<div style={{ width: `${(overall.bullish / total) * 100}%`, background: moodColor(70) }} />
					<div className="bg-control-hover" style={{ width: `${(overall.neutral / total) * 100}%` }} />
					<div style={{ width: `${(overall.bearish / total) * 100}%`, background: moodColor(-70) }} />
				</div>
				<div className="mt-1.5 flex justify-between text-xs text-fg-muted">
					<span>{overall.bullish} bullish</span>
					<span>{overall.neutral} neutral</span>
					<span>{overall.bearish} bearish</span>
				</div>
				<div className="mt-3 max-h-[280px] overflow-y-auto">
					{sorted.map((c) => (
						<CoinScoreRow key={c.coin} coin={c} />
					))}
				</div>
			</PopoverContent>
		</Popover>
	);
}

function PartTile({ label, weight, value }: { label: string; weight: string; value: number }) {
	return (
		<div className="rounded-8 bg-control p-2.5">
			<div className="flex justify-between text-xs text-fg-muted">
				<span>{label}</span>
				<span>{weight}</span>
			</div>
			<ScoreNumber score={value} className="mt-1.5 block text-base font-medium" />
		</div>
	);
}
