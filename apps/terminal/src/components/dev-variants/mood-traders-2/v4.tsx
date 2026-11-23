import { Button, Checkbox } from "@hypeterminal/ui";
import { ArrowCounterClockwiseIcon, PlusIcon } from "@phosphor-icons/react";
import type { ReactNode } from "react";
import { MoodHeroGauge } from "@/components/trade/mood/mood-hero-gauge";
import { ScoreArc } from "@/components/trade/mood/mood-parts";
import { cn } from "@/lib/cn";
import { moodColor, moodLabel, shortAddress, signedScore } from "@/lib/mood/signal";
import { AutoTargetCard } from "../mood-traders/drawer";
import {
	ALL,
	type BasketProps,
	impactOf,
	isAll,
	isLong,
	MARKET,
	poolMood,
	positionText,
	scoreOf,
	signedDelta,
	type Trader,
	traderLabel,
	traders,
	useFlash,
	usePop,
} from "./data";
import { Frame } from "./frame";

export default function V4({ selected, last, toggle, undo, reset, changes, edited }: BasketProps) {
	const score = scoreOf(selected);
	const gap = score - poolMood.score;
	const excluded = traders.filter((t) => !selected.has(t.usr));
	const flash = useFlash<HTMLSpanElement>(last?.id);
	const pop = usePop<HTMLDivElement>(last?.id);
	const delta = last ? last.after - last.before : 0;

	return (
		<Frame anchor={edited}>
			<div className="space-y-3">
				<section className="rounded-12 bg-surface px-5 pt-5 pb-4">
					<MoodHeroGauge score={score} name={MARKET} />
				</section>
				<section data-anchor className="rounded-12 bg-surface p-4">
					<div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
						<Side label="All 37 traders" score={poolMood.score} count={ALL.length} muted />
						<div className="relative flex flex-col items-center">
							<span
								ref={flash}
								className="absolute -top-6 rounded-full bg-control px-2 py-0.5 text-2xs font-medium tabular-nums opacity-0"
								style={{ color: delta === 0 ? undefined : moodColor(delta * 5) }}
							>
								{signedDelta(delta)}
							</span>
							<span
								className="rounded-full bg-control px-2.5 py-1 text-xs font-medium tabular-nums"
								style={{ color: gap === 0 ? undefined : moodColor(gap * 3) }}
							>
								{gap === 0 ? "Same" : signedDelta(gap)}
							</span>
						</div>
						<div ref={pop}>
							<Side label={isAll(selected) ? "Yours (default)" : "Yours"} score={score} count={selected.size} />
						</div>
					</div>
				</section>

				<section className="rounded-12 bg-surface p-2">
					<div className="flex items-center justify-between gap-2 px-2 pt-1 pb-1">
						<span className="text-xs font-medium">
							Changes from default <span className="text-fg-muted tabular-nums">({excluded.length})</span>
						</span>
						<span className="flex gap-1">
							<Button variant="ghost" intent="neutral" size="xs" disabled={!changes.length} onClick={undo}>
								<ArrowCounterClockwiseIcon className="size-3.5" />
								Undo
							</Button>
							<Button variant="secondary" intent="neutral" size="xs" disabled={isAll(selected)} onClick={reset}>
								Reset
							</Button>
						</span>
					</div>
					{excluded.length === 0 ? (
						<p className="px-2 pt-1 pb-2 text-xs text-fg-muted">
							All 37 traders count. Untick a trader below to leave them out.
						</p>
					) : (
						excluded.map((t) => (
							<div
								key={t.usr}
								className={cn("flex items-center gap-3 rounded-8 px-2 py-1.5", last?.usr === t.usr && "mood-fade-in")}
							>
								<span className="w-14 flex-none text-2xs text-fg-muted">Removed</span>
								<span className="min-w-0 flex-1 truncate text-xs">{traderLabel(t)}</span>
								<span className="text-2xs text-fg-muted tabular-nums">
									{t.pos ? `${signedDelta(impactOf(selected, t.usr))} if added` : "No effect"}
								</span>
								<Button
									variant="secondary"
									intent="neutral"
									size="xs"
									onClick={() => toggle(t.usr)}
									aria-label={`Add back ${traderLabel(t)}`}
								>
									<PlusIcon className="size-3" />
									Add back
								</Button>
							</div>
						))
					)}
				</section>

				<AutoTargetCard score={score} />

				<section className="rounded-12 bg-surface p-2">
					<div className="flex items-baseline justify-between px-2 pt-2 pb-1 text-xs">
						<span className="font-medium">All traders</span>
						<span className="text-2xs text-fg-muted tabular-nums">
							{selected.size} of {ALL.length} ticked
						</span>
					</div>
					{traders.map((t) => (
						<Row key={t.usr} t={t} on={selected.has(t.usr)} onToggle={toggle} />
					))}
				</section>
			</div>
		</Frame>
	);
}

function Side({
	label,
	score,
	count,
	muted = false,
}: {
	label: string;
	score: number;
	count: number;
	muted?: boolean;
}) {
	return (
		<div className="flex flex-col items-center gap-1.5 text-center">
			<div className="relative">
				<ScoreArc value={score} size={56} stroke={5} />
				<span
					className="absolute inset-0 grid place-items-center text-sm font-semibold tabular-nums"
					style={{ color: moodColor(score) }}
				>
					{signedScore(score)}
				</span>
			</div>
			<div className={cn("text-xs font-medium", muted && "text-fg-secondary")}>{label}</div>
			<div className="text-2xs text-fg-muted tabular-nums">
				{moodLabel(score)}, {count} traders
			</div>
		</div>
	);
}

function Row({ t, on, onToggle }: { t: Trader; on: boolean; onToggle: (usr: string) => void }): ReactNode {
	return (
		<div className={cn("flex items-center gap-3 rounded-8 px-2 py-2", !on && "bg-background")}>
			<Checkbox size="sm" checked={on} onCheckedChange={() => onToggle(t.usr)} aria-label={traderLabel(t)} />
			<span className={cn("min-w-0 flex-1 truncate text-xs", !on && "text-fg-muted")}>
				{traderLabel(t)} <span className="text-fg-muted">{shortAddress(t.usr)}</span>
			</span>
			<span
				className={cn(
					"text-2xs tabular-nums",
					!on || !t.pos ? "text-fg-muted" : "",
					on && t.pos && (isLong(t) ? "text-market-up" : "text-market-down"),
				)}
			>
				{positionText(t)}
			</span>
		</div>
	);
}
