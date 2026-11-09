import { Drawer, DrawerContent, DrawerTrigger } from "@hypeterminal/ui";
import { useId, useState } from "react";
import { cn } from "@/lib/cn";
import {
	coinName,
	isStockCoin,
	MOOD_POOL_SIZE,
	type MoodSignal,
	moodLabel,
	moodTile,
	signedScore,
} from "@/lib/mood/signal";
import { moodVars, ScoreNumber } from "./mood-parts";

interface Props {
	signal: MoodSignal;
	score: number;
}

type Filter = "all" | "crypto" | "stocks";

export function MoodFooterStone({ signal, score }: Props) {
	const [filter, setFilter] = useState<Filter>("all");
	const { overall } = signal;
	const first = overall.history[0]?.[1] ?? overall.score;
	const updated = new Date(signal.now).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
	const list = [...signal.coins]
		.filter((c) => filter === "all" || (filter === "stocks") === isStockCoin(c.coin))
		.sort((a, b) => b.score - a.score);
	return (
		<Drawer side="bottom">
			<DrawerTrigger
				className="flex h-5 items-center gap-1.5 rounded-4 px-1.5 text-xs transition-colors hover:bg-fill-hover"
				style={moodVars(score)}
			>
				<span className="mood-stone size-3.5">
					<span />
					<span />
					<span />
				</span>
				<span className="text-fg-secondary">Mood</span>
				<ScoreNumber score={score} className="font-normal" />
			</DrawerTrigger>
			<DrawerContent className="bottom-6 mx-1 flex h-[360px] flex-row gap-4 rounded-t-8 p-4" overlay={false}>
				<div className="flex w-[340px] flex-none flex-col">
					<div className="text-xs text-fg-muted">
						Pool mood · {MOOD_POOL_SIZE} traders · {updated}
					</div>
					<div className="mt-2 flex items-baseline gap-2">
						<ScoreNumber score={score} className="text-[44px]" />
						<span className="text-sm text-fg-secondary">{moodLabel(score)}</span>
					</div>
					<div className="mt-1.5 text-xs text-fg-muted">
						{signedScore(first)} 24h ago · positions {signedScore(overall.posScore)} · flow{" "}
						{signedScore(overall.flowScore)}
					</div>
					<div className="mt-auto">
						<HistoryArea history={overall.history} />
						<div className="mt-1 flex justify-between text-2xs text-fg-muted">
							<span>24h ago</span>
							<span>Now</span>
						</div>
					</div>
				</div>
				<div className="flex min-w-0 flex-1 flex-col">
					<div className="mb-3 flex items-center gap-1">
						{(["all", "crypto", "stocks"] as const).map((f) => (
							<button
								key={f}
								type="button"
								onClick={() => setFilter(f)}
								className={cn(
									"h-7 rounded-8 px-3 text-xs capitalize",
									filter === f ? "bg-control-hover text-fg" : "text-fg-muted hover:text-fg",
								)}
							>
								{f}
							</button>
						))}
						<span className="ml-auto text-xs text-fg-muted">Tile colour shows the score, from {"−100"} to +100</span>
					</div>
					<div className="grid flex-1 auto-rows-fr grid-cols-6 gap-1">
						{list.map((c) => (
							<div
								key={c.coin}
								className="flex flex-col justify-between rounded-8 p-2.5"
								style={{ background: moodTile(c.score) }}
							>
								<div className="flex items-baseline justify-between">
									<span className="text-sm font-medium">{coinName(c.coin)}</span>
									<span className="text-sm font-semibold tabular-nums">{signedScore(c.score)}</span>
								</div>
								<div className="flex justify-between text-2xs text-fg-secondary">
									<span>Pos {signedScore(c.posScore)}</span>
									<span>Flow {signedScore(c.flowScore)}</span>
								</div>
							</div>
						))}
					</div>
				</div>
			</DrawerContent>
		</Drawer>
	);
}

function HistoryArea({ history }: { history: [number, number][] }) {
	const id = useId();
	const W = 340;
	const H = 120;
	if (history.length < 2) return null;
	const y = (s: number) => (1 - (s + 100) / 200) * H;
	const pts = history.map(([, s], i) => `${((i / (history.length - 1)) * W).toFixed(1)},${y(s).toFixed(1)}`);
	const area = `M0,${H / 2} L${pts.join(" L")} L${W},${H / 2} Z`;
	return (
		<svg viewBox={`0 0 ${W} ${H}`} className="h-[120px] w-full" aria-hidden="true">
			<defs>
				<clipPath id={`${id}-up`}>
					<rect x="0" y="0" width={W} height={H / 2} />
				</clipPath>
				<clipPath id={`${id}-down`}>
					<rect x="0" y={H / 2} width={W} height={H / 2} />
				</clipPath>
			</defs>
			<path d={area} fill={moodTile(70)} clipPath={`url(#${id}-up)`} />
			<path d={area} fill={moodTile(-70)} clipPath={`url(#${id}-down)`} />
			<line x1="0" x2={W} y1={H / 2} y2={H / 2} stroke="var(--color-stroke-weak)" />
			<polyline points={pts.join(" ")} fill="none" stroke="var(--color-fg-secondary)" strokeWidth="1.25" />
		</svg>
	);
}
