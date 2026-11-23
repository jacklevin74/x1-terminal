import { Toggle } from "@hypeterminal/ui";
import { cn } from "@/lib/cn";
import { compactUsd } from "@/lib/mood/signal";
import { ALL, flat, holders, isLong, MARKET, moodFor, type Trader, type VariantProps } from "./data";
import { AutoTargetCard, DrawerFrame, HeroCard, SectionTitle } from "./drawer";

const LONGS = holders.filter(isLong);
const SHORTS = holders.filter((t) => !isLong(t));

export default function V4({ selected, onChange }: VariantProps) {
	const mood = moodFor(selected);
	const all = selected.size === ALL.length;
	const total = mood.long + mood.short;
	const pl = total ? (mood.long / total) * 100 : 50;
	function toggle(usr: string) {
		const next = new Set(selected);
		if (next.has(usr)) next.delete(usr);
		else next.add(usr);
		onChange(next);
	}
	function setSide(list: Trader[], on: boolean) {
		const next = new Set(selected);
		for (const t of list) {
			if (on) next.add(t.usr);
			else next.delete(t.usr);
		}
		onChange(next);
	}
	return (
		<DrawerFrame>
			<div className="space-y-3">
				<HeroCard score={mood.score} />

				<section className="rounded-12 bg-surface p-4">
					<SectionTitle
						aside={
							<span className="flex items-center gap-3">
								<span className="text-fg-muted tabular-nums">
									<span className="text-fg">{selected.size}</span> of {ALL.length} selected
								</span>
								<button
									type="button"
									disabled={all}
									onClick={() => onChange(new Set(ALL))}
									className="font-medium text-fg-secondary transition-colors hover:text-fg disabled:text-fg-disabled"
								>
									Reset
								</button>
							</span>
						}
					>
						Who moves your {MARKET} score
					</SectionTitle>
					<div className="flex h-2 gap-0.5 overflow-hidden rounded-full">
						<div
							className="rounded-full bg-market-up transition-[width] duration-500"
							style={{ width: total ? `${pl}%` : "0%" }}
						/>
						<div className={cn("flex-1 rounded-full", total ? "bg-market-down" : "bg-control")} />
					</div>
					<div className="mt-1.5 flex justify-between text-2xs text-fg-muted tabular-nums">
						<span>
							<span className="text-market-up">{compactUsd(mood.long)}</span> long
						</span>
						<span>
							<span className="text-market-down">{compactUsd(mood.short)}</span> short
						</span>
					</div>

					<div className="mt-4 grid grid-cols-2 gap-2">
						<Side
							title="Long"
							tone="text-market-up"
							list={LONGS}
							selected={selected}
							onToggle={toggle}
							onAll={(on) => setSide(LONGS, on)}
						/>
						<Side
							title="Short"
							tone="text-market-down"
							list={SHORTS}
							selected={selected}
							onToggle={toggle}
							onAll={(on) => setSide(SHORTS, on)}
						/>
					</div>
					<div className="mt-3 flex items-center justify-between gap-3 rounded-8 bg-control px-3 py-2 text-xs">
						<span className="text-fg-secondary">
							No {MARKET} position
							<span className="ml-1.5 text-fg-muted tabular-nums">
								{flat.filter((t) => selected.has(t.usr)).length} of {flat.length}
							</span>
						</span>
						<Toggle
							size="xs"
							checked={flat.every((t) => selected.has(t.usr))}
							onCheckedChange={(on) => setSide(flat, on)}
							aria-label="Traders with no position"
						/>
					</div>
				</section>

				<AutoTargetCard score={mood.score} />
			</div>
		</DrawerFrame>
	);
}

function Side({
	title,
	tone,
	list,
	selected,
	onToggle,
	onAll,
}: {
	title: string;
	tone: string;
	list: Trader[];
	selected: ReadonlySet<string>;
	onToggle: (usr: string) => void;
	onAll: (on: boolean) => void;
}) {
	const count = list.filter((t) => selected.has(t.usr)).length;
	return (
		<div className="rounded-8 bg-control p-1.5">
			<div className="flex items-center justify-between gap-2 px-1.5 pt-1 pb-2">
				<span className="text-xs">
					<span className={cn("font-medium", tone)}>{title}</span>
					<span className="ml-1.5 text-fg-muted tabular-nums">
						{count}/{list.length}
					</span>
				</span>
				<Toggle size="xs" checked={count === list.length} onCheckedChange={onAll} aria-label={`All ${title}`} />
			</div>
			{list.map((t) => {
				const on = selected.has(t.usr);
				return (
					<button
						key={t.usr}
						type="button"
						onClick={() => onToggle(t.usr)}
						aria-pressed={on}
						className={cn(
							"flex w-full flex-col rounded-6 px-1.5 py-1.5 text-left transition-[background-color,opacity] hover:bg-control-hover",
							!on && "opacity-40",
						)}
					>
						<span className="flex items-baseline justify-between gap-2 text-xs tabular-nums">
							<span>{t.usr.slice(0, 6)}</span>
							<span>{compactUsd(t.pos?.ntl ?? 0)}</span>
						</span>
						<span className="flex items-baseline justify-between gap-2 text-2xs text-fg-muted tabular-nums">
							<span className="truncate">
								{Math.abs(t.pos?.szi ?? 0).toLocaleString("en-US", { maximumFractionDigits: 0 })} HYPE
							</span>
							<span className={(t.pos?.upnl ?? 0) >= 0 ? "text-market-up" : "text-market-down"}>
								{compactUsd(t.pos?.upnl ?? 0)}
							</span>
						</span>
					</button>
				);
			})}
		</div>
	);
}
