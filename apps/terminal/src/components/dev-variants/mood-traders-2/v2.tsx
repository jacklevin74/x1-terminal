import { Button, Tooltip } from "@hypeterminal/ui";
import { ArrowCounterClockwiseIcon, ArrowRightIcon, XIcon } from "@phosphor-icons/react";
import { cn } from "@/lib/cn";
import { moodColor, moodTile, signedScore } from "@/lib/mood/signal";
import { AutoTargetCard, HeroCard } from "../mood-traders/drawer";
import {
	ALL,
	type BasketProps,
	byUsr,
	flat,
	holders,
	isAll,
	isLong,
	poolMood,
	positionText,
	scoreOf,
	signedDelta,
	type Trader,
	traderLabel,
	useFlash,
	usePop,
} from "./data";
import { Frame } from "./frame";

const seats = [...holders, ...flat];

function initials(t: Trader) {
	const words = traderLabel(t).split(" ");
	return words.length > 1 ? `${words[0][0]}${words[1][0]}` : t.usr.slice(2, 4).toUpperCase();
}

function seatFill(t: Trader) {
	if (!t.pos) return "var(--color-control)";
	return moodTile(isLong(t) ? 70 : -70);
}

export default function V2({ selected, last, toggle, undo, reset, changes, edited }: BasketProps) {
	const score = scoreOf(selected);
	const flash = useFlash<HTMLSpanElement>(last?.id);
	const pop = usePop<HTMLSpanElement>(last?.id);
	const tail = changes.at(-1);
	const tailTrader = tail ? byUsr.get(tail.usr) : undefined;

	return (
		<Frame anchor={edited}>
			<div className="space-y-3">
				<HeroCard score={score}>
					<span className="text-fg-muted tabular-nums">
						{isAll(selected) ? "All 37 traders" : `Your ${selected.size} traders`}
					</span>
				</HeroCard>
				<section data-anchor className="rounded-12 bg-surface p-4">
					<div className="flex items-end justify-between gap-3">
						<div>
							<div className="text-xs text-fg-muted">Traders in your basket</div>
							<div className="mt-1 flex items-baseline gap-1 tabular-nums">
								<span ref={pop} className="inline-block text-lg font-medium">
									{selected.size}
								</span>
								<span className="text-sm text-fg-muted">of {ALL.length}</span>
							</div>
						</div>
						<div className="relative text-right">
							<span
								ref={flash}
								className="absolute -top-6 right-0 rounded-full bg-control px-2 py-0.5 text-xs font-medium tabular-nums opacity-0"
								style={{
									color: last && last.after !== last.before ? moodColor((last.after - last.before) * 5) : undefined,
								}}
							>
								{last ? signedDelta(last.after - last.before) : ""}
							</span>
							<div className="text-xs text-fg-muted">{MARKET_LINE}</div>
							<div className="mt-1 flex items-center justify-end gap-1.5 text-sm font-medium tabular-nums">
								<span className="text-fg-muted">{signedScore(poolMood.score)}</span>
								<ArrowRightIcon className="size-3.5 text-fg-muted" />
								<span style={{ color: moodColor(score) }}>{signedScore(score)}</span>
							</div>
						</div>
					</div>

					<div className="mt-4 grid grid-cols-8 gap-1.5">
						{seats.map((t) => {
							const on = selected.has(t.usr);
							return (
								<Tooltip
									key={t.usr}
									side="top"
									content={`${traderLabel(t)}, ${positionText(t)}${on ? "" : " (excluded)"}`}
								>
									<button
										type="button"
										onClick={() => toggle(t.usr)}
										aria-pressed={on}
										aria-label={traderLabel(t)}
										className={cn(
											"relative grid aspect-square place-items-center rounded-8 text-2xs font-medium transition-[background-color,color,scale] duration-200 active:scale-[0.97]",
											on ? "text-fg" : "bg-background text-fg-disabled",
											last?.usr === t.usr && "mood-fade-in",
										)}
										style={on ? { background: seatFill(t) } : undefined}
									>
										{on ? initials(t) : <XIcon className="size-3.5" />}
									</button>
								</Tooltip>
							);
						})}
					</div>

					<div className="mt-3 flex flex-wrap gap-x-3 gap-y-1 text-2xs text-fg-muted">
						<Legend fill={moodTile(70)} label="Long HYPE" />
						<Legend fill={moodTile(-70)} label="Short HYPE" />
						<Legend fill="var(--color-control)" label="No position" />
						<Legend fill="var(--color-background)" label="Excluded" />
					</div>

					<div className="mt-4 flex items-center gap-2 rounded-8 bg-control py-2 pr-2 pl-3">
						{tail && tailTrader && (
							<span
								className="flex-none rounded-full bg-control-hover px-1.5 py-px text-2xs font-medium tabular-nums"
								style={{
									color: tail.after === tail.before ? undefined : moodColor((tail.after - tail.before) * 5),
								}}
							>
								{signedDelta(tail.after - tail.before)}
							</span>
						)}
						<span className="min-w-0 flex-1 truncate text-xs">
							{tail && tailTrader ? (
								<>
									<span className="text-fg-muted">{tail.added ? "Added" : "Removed"}</span> {traderLabel(tailTrader)}
								</>
							) : (
								<span className="text-fg-muted">Tap a seat to switch a trader</span>
							)}
						</span>
						<Button variant="ghost" intent="neutral" size="xs" disabled={!changes.length} onClick={undo}>
							<ArrowCounterClockwiseIcon className="size-3.5" />
							Undo
						</Button>
						<Button
							variant="secondary"
							intent="neutral"
							size="xs"
							className="bg-control-hover"
							disabled={isAll(selected)}
							onClick={reset}
						>
							Reset
						</Button>
					</div>
				</section>
				<AutoTargetCard score={score} />
			</div>
		</Frame>
	);
}

const MARKET_LINE = "HYPE score";

function Legend({ fill, label }: { fill: string; label: string }) {
	return (
		<span className="inline-flex items-center gap-1.5">
			<span className="size-2.5 rounded-2" style={{ background: fill }} />
			{label}
		</span>
	);
}
