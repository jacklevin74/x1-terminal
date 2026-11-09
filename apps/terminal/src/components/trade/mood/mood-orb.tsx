import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { coinName, type MoodCoin, type MoodSignal, moodColor, moodLabel, signedScore } from "@/lib/mood/signal";
import { moodVars, ScoreNumber, Spark } from "./mood-parts";

interface Props {
	signal: MoodSignal;
	score: number;
}

export function MoodOrb({ signal, score }: Props) {
	const { coins, overall } = signal;
	const first = overall.history[0]?.[1] ?? overall.score;
	const updated = new Date(signal.now).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
	const moved = coins
		.map((c) => ({ coin: c, delta: c.score - (c.history[0]?.[1] ?? c.score) }))
		.sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta))
		.slice(0, 5)
		.map((m) => m.coin);
	const bullish = [...coins].sort((a, b) => b.score - a.score).slice(0, 3);
	const bearish = [...coins].sort((a, b) => a.score - b.score).slice(0, 3);
	return (
		<Popover>
			<PopoverTrigger
				className="fixed right-5 bottom-10 z-30 size-[52px] rounded-full"
				style={moodVars(score)}
				aria-label={`Pool mood ${signedScore(score)}, ${moodLabel(score)}`}
			>
				<span className="mood-glow mood-breathe absolute inset-1.5" style={{ filter: "blur(16px)", opacity: 0.55 }} />
				<span className="absolute inset-0 rounded-full bg-overlay shadow-menu" />
				<span className="mood-ring-spin absolute inset-1.5" />
				<span className="absolute inset-0 grid place-items-center text-xs">
					<ScoreNumber score={score} />
				</span>
			</PopoverTrigger>
			<PopoverContent side="top" align="end" sideOffset={12} className="w-[380px] rounded-8">
				<div className="flex items-baseline justify-between text-xs text-fg-muted">
					<span>Pool mood</span>
					<span>{updated}</span>
				</div>
				<div className="mt-1.5 flex items-baseline gap-2">
					<ScoreNumber score={score} className="text-[40px]" />
					<span className="text-sm text-fg-secondary">{moodLabel(score)}</span>
					<span className="ml-auto text-xs tabular-nums text-fg-muted">
						{signedScore(overall.score - first)} in 24h
					</span>
				</div>
				<div className="mt-3">
					<Spark history={overall.history} width={348} height={96} color={moodColor(overall.score)} strokeWidth={2} />
				</div>
				<div className="flex justify-between text-2xs text-fg-muted">
					<span>24h ago</span>
					<span>Now</span>
				</div>
				<div className="mt-4 text-xs text-fg-muted">Biggest moves in 24h</div>
				<div className="mt-1.5">
					{moved.map((c) => (
						<div key={c.coin} className="flex items-center gap-3 py-1.5 text-xs">
							<span className="w-16 truncate font-medium">{coinName(c.coin)}</span>
							<div className="w-[120px]">
								<Spark history={c.history} width={120} height={20} color={moodColor(c.score)} strokeWidth={1.25} />
							</div>
							<span className="ml-auto tabular-nums text-fg-muted">{signedScore(c.history[0]?.[1] ?? c.score)}</span>
							<span className="text-fg-muted">→</span>
							<ScoreNumber score={c.score} className="w-8 text-right font-normal" />
						</div>
					))}
				</div>
				<div className="mt-3 grid grid-cols-2 gap-2">
					<Leaders title="Most bullish" list={bullish} />
					<Leaders title="Most bearish" list={bearish} />
				</div>
			</PopoverContent>
		</Popover>
	);
}

function Leaders({ title, list }: { title: string; list: MoodCoin[] }) {
	return (
		<div className="rounded-8 bg-control p-2.5">
			<div className="text-xs text-fg-muted">{title}</div>
			{list.map((c) => (
				<div key={c.coin} className="mt-1 flex justify-between text-xs">
					<span>{coinName(c.coin)}</span>
					<ScoreNumber score={c.score} className="font-normal" />
				</div>
			))}
		</div>
	);
}
