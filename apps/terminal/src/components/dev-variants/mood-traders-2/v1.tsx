import { Button } from "@hypeterminal/ui";
import { ArrowCounterClockwiseIcon, ArrowRightIcon, MinusIcon, PlusIcon } from "@phosphor-icons/react";
import { cn } from "@/lib/cn";
import { moodColor, shortAddress, signedScore } from "@/lib/mood/signal";
import { AutoTargetCard, HeroCard } from "../mood-traders/drawer";
import {
	ALL,
	type BasketProps,
	byUsr,
	impactOf,
	isAll,
	isLong,
	poolMood,
	positionText,
	scoreOf,
	signedDelta,
	type Trader,
	traderLabel,
	traders,
	useFlash,
} from "./data";
import { Frame } from "./frame";

export default function V1({ selected, last, toggle, undo, reset, changes, edited }: BasketProps) {
	const score = scoreOf(selected);
	const counting = traders.filter((t) => selected.has(t.usr));
	const excluded = traders.filter((t) => !selected.has(t.usr));
	const flash = useFlash<HTMLSpanElement>(last?.id);
	const delta = last ? last.after - last.before : 0;
	const lastTrader = changes.at(-1) ? byUsr.get(changes.at(-1)?.usr ?? "") : undefined;

	return (
		<Frame
			anchor={edited}
			footer={
				<div className="flex flex-none flex-col gap-2 bg-surface px-4 pt-3 pb-4">
					<div className="flex items-center gap-3">
						<div className="min-w-0 flex-1">
							<div className="text-xs font-medium tabular-nums">
								{counting.length} of {ALL.length} traders count
							</div>
							<div className="mt-0.5 flex items-center gap-1.5 text-2xs text-fg-muted tabular-nums">
								<span>All 37</span>
								<span style={{ color: moodColor(poolMood.score) }}>{signedScore(poolMood.score)}</span>
								<ArrowRightIcon className="size-3" />
								<span>Yours</span>
								<span className="font-medium" style={{ color: moodColor(score) }}>
									{signedScore(score)}
								</span>
							</div>
						</div>
						<Button variant="secondary" intent="neutral" size="sm" disabled={!changes.length} onClick={undo}>
							<ArrowCounterClockwiseIcon className="size-3.5" />
							Undo
						</Button>
						<Button variant="secondary" intent="neutral" size="sm" disabled={isAll(selected)} onClick={reset}>
							Reset to all 37
						</Button>
					</div>
					{lastTrader && changes.length > 0 && (
						<div className="truncate text-2xs text-fg-muted">
							Last change: {changes.at(-1)?.added ? "added" : "removed"} {traderLabel(lastTrader)}
						</div>
					)}
				</div>
			}
		>
			<div className="space-y-3">
				<HeroCard score={score}>
					<span className="tabular-nums text-fg-muted">
						{isAll(selected) ? "All 37 traders" : `Your ${counting.length} traders`}
					</span>
					<span
						ref={flash}
						className="rounded-full bg-control px-2 py-0.5 font-medium tabular-nums opacity-0"
						style={{ color: delta === 0 ? undefined : moodColor(delta * 5) }}
					>
						{signedDelta(delta)}
					</span>
				</HeroCard>
				<AutoTargetCard score={score} />
				<section data-anchor className="rounded-12 bg-background p-2">
					<GroupTitle title="Excluded" count={excluded.length} muted />
					{excluded.length === 0 && (
						<p className="px-2 pt-1 pb-3 text-xs text-fg-muted">
							No one is excluded. Remove a trader below and they move here.
						</p>
					)}
					{excluded.map((t) => (
						<Row key={t.usr} t={t} on={false} selected={selected} fresh={last?.usr === t.usr} onToggle={toggle} />
					))}
				</section>
				<section className="rounded-12 bg-surface p-2">
					<GroupTitle title="Counting" count={counting.length} />
					{counting.map((t) => (
						<Row key={t.usr} t={t} on selected={selected} fresh={last?.usr === t.usr} onToggle={toggle} />
					))}
				</section>
			</div>
		</Frame>
	);
}

function GroupTitle({ title, count, muted = false }: { title: string; count: number; muted?: boolean }) {
	return (
		<div className="flex items-baseline justify-between px-2 pt-2 pb-1 text-xs">
			<span className={cn("font-medium", muted && "text-fg-secondary")}>
				{title} <span className="text-fg-muted tabular-nums">({count})</span>
			</span>
			{count > 0 && <span className="text-2xs text-fg-muted">Score change if you switch</span>}
		</div>
	);
}

function Row({
	t,
	on,
	selected,
	fresh,
	onToggle,
}: {
	t: Trader;
	on: boolean;
	selected: ReadonlySet<string>;
	fresh: boolean;
	onToggle: (usr: string) => void;
}) {
	const impact = impactOf(selected, t.usr);
	return (
		<div className={cn("flex items-center gap-3 rounded-8 px-2 py-2", fresh && "mood-fade-in bg-control")}>
			<span className={cn("min-w-0 flex-1", !on && "text-fg-muted")}>
				<span className="block truncate text-xs">
					{traderLabel(t)} <span className="text-fg-muted">{shortAddress(t.usr)}</span>
				</span>
				<span className="block text-2xs tabular-nums">
					<span
						className={cn(
							!t.pos && "text-fg-muted",
							t.pos && on && (isLong(t) ? "text-market-up" : "text-market-down"),
						)}
					>
						{positionText(t)}
					</span>
				</span>
			</span>
			<span className="w-8 text-right text-2xs text-fg-muted tabular-nums">{signedDelta(impact)}</span>
			<Button
				variant="secondary"
				intent="neutral"
				size="xs"
				className="w-24"
				onClick={() => onToggle(t.usr)}
				aria-label={`${on ? "Remove" : "Add back"} ${traderLabel(t)}`}
			>
				{on ? <MinusIcon className="size-3" /> : <PlusIcon className="size-3" />}
				{on ? "Remove" : "Add back"}
			</Button>
		</div>
	);
}
