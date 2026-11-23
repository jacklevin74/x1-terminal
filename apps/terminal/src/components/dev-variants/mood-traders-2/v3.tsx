import { Button, Toggle } from "@hypeterminal/ui";
import { toast } from "sonner";
import { ScoreArc } from "@/components/trade/mood/mood-parts";
import { cn } from "@/lib/cn";
import { moodColor, shortAddress, signedScore } from "@/lib/mood/signal";
import { HeroCard } from "../mood-traders/drawer";
import {
	ALL,
	type BasketProps,
	flat,
	holders,
	impactOf,
	isAll,
	isLong,
	positionText,
	scoreOf,
	signedDelta,
	type Trader,
	traderLabel,
	useFlash,
} from "./data";
import { Frame } from "./frame";

export default function V3({ selected, last, toggle, undo, reset, edited }: BasketProps) {
	const score = scoreOf(selected);
	const out = ALL.length - selected.size;
	const flash = useFlash<HTMLSpanElement>(last?.id);
	const delta = last ? last.after - last.before : 0;

	function change(t: Trader) {
		const on = selected.has(t.usr);
		const before = score;
		const next = new Set(selected);
		if (on) next.delete(t.usr);
		else next.add(t.usr);
		const after = scoreOf(next);
		toggle(t.usr);
		toast(`${on ? "Removed" : "Added"} ${traderLabel(t)}`, {
			id: "mood-traders-2-v3",
			description:
				before === after
					? "HYPE score stays the same. This trader has no HYPE position."
					: `HYPE score ${signedScore(before)} to ${signedScore(after)}`,
			action: { label: "Undo", onClick: undo },
		});
	}

	return (
		<Frame anchor={edited}>
			<div className="space-y-3">
				<HeroCard score={score}>
					<span className="text-fg-muted tabular-nums">
						{isAll(selected) ? "All 37 traders" : `Your ${selected.size} traders`}
					</span>
				</HeroCard>
				<div data-anchor className="sticky top-0 z-10 -mx-4 flex items-center gap-3 bg-overlay px-4 pt-1 pb-3">
					<div className="relative">
						<ScoreArc value={score} size={40} stroke={4} />
						<span
							className="absolute inset-0 grid place-items-center text-xs font-semibold tabular-nums"
							style={{ color: moodColor(score) }}
						>
							{signedScore(score)}
						</span>
					</div>
					<div className="min-w-0 flex-1">
						<div className="flex items-center gap-2 text-xs font-medium">
							Your HYPE mood
							<span
								ref={flash}
								className="rounded-full bg-control px-1.5 py-px text-2xs tabular-nums opacity-0"
								style={{ color: delta === 0 ? undefined : moodColor(delta * 5) }}
							>
								{signedDelta(delta)}
							</span>
						</div>
						<div className="text-2xs text-fg-muted tabular-nums">
							<span className="text-fg">{selected.size} in</span>, {out} out
						</div>
					</div>
					<Button variant="secondary" intent="neutral" size="sm" disabled={isAll(selected)} onClick={reset}>
						Reset to all 37
					</Button>
				</div>
				<List
					title="Hold HYPE"
					hint="Score change if you switch"
					list={holders}
					selected={selected}
					last={last?.usr}
					onToggle={change}
				/>
				<List
					title="No HYPE position"
					hint="No effect on HYPE"
					list={flat}
					selected={selected}
					last={last?.usr}
					onToggle={change}
				/>
			</div>
		</Frame>
	);
}

function sideClass(t: Trader, on: boolean) {
	if (!on || !t.pos) return "text-fg-disabled";
	return isLong(t) ? "text-market-up" : "text-market-down";
}

function List({
	title,
	hint,
	list,
	selected,
	last,
	onToggle,
}: {
	title: string;
	hint: string;
	list: Trader[];
	selected: ReadonlySet<string>;
	last: string | undefined;
	onToggle: (t: Trader) => void;
}) {
	return (
		<section className="rounded-12 bg-surface p-2">
			<div className="flex items-baseline justify-between px-2 pt-2 pb-1 text-xs">
				<span className="font-medium">{title}</span>
				<span className="text-2xs text-fg-muted">{hint}</span>
			</div>
			{list.map((t) => {
				const on = selected.has(t.usr);
				const impact = impactOf(selected, t.usr);
				return (
					<div
						key={t.usr}
						className={cn(
							"flex items-center gap-3 rounded-8 px-2 py-2 transition-colors",
							last === t.usr && "mood-fade-in",
							!on && "bg-background",
						)}
					>
						<span className="min-w-0 flex-1">
							<span className={cn("block truncate text-xs", !on && "text-fg-disabled line-through")}>
								{traderLabel(t)} <span className="text-fg-muted">{shortAddress(t.usr)}</span>
							</span>
							<span className="block text-2xs tabular-nums">
								{!on && <span className="mr-1.5 text-fg-muted">Excluded</span>}
								<span className={sideClass(t, on)}>{positionText(t)}</span>
							</span>
						</span>
						{t.pos && (
							<span
								className="rounded-full bg-control px-2 py-0.5 text-2xs font-medium tabular-nums"
								style={{ color: impact === 0 ? undefined : moodColor(impact * 5) }}
							>
								{signedDelta(impact)}
							</span>
						)}
						<Toggle size="xs" checked={on} onCheckedChange={() => onToggle(t)} aria-label={traderLabel(t)} />
					</div>
				);
			})}
		</section>
	);
}
