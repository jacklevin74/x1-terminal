import { CheckIcon } from "@phosphor-icons/react";
import { useState } from "react";
import { cn } from "@/lib/cn";
import { compactUsd, moodColor, signedScore } from "@/lib/mood/signal";
import { ALL, holders, isLong, MARKET, moodFor, PRESETS, type Trader, type VariantProps } from "./data";
import { AutoTargetCard, DrawerFrame, HeroCard, SectionTitle } from "./drawer";

type Preset = "all" | "top" | "consistent" | "mine";

const OPTIONS: { id: Preset; label: string; hint: string }[] = [
	{ id: "all", label: "All traders", hint: "The full pool" },
	{ id: "top", label: "Top 10 by PNL", hint: "All-time PNL" },
	{ id: "consistent", label: "Consistent", hint: "3 of 4 months green" },
	{ id: "mine", label: "My picks", hint: "Tap traders below" },
];

function same(a: ReadonlySet<string>, b: readonly string[]) {
	return a.size === b.length && b.every((x) => a.has(x));
}

function presetOf(selected: ReadonlySet<string>): Preset {
	if (same(selected, PRESETS.all)) return "all";
	if (same(selected, PRESETS.top)) return "top";
	if (same(selected, PRESETS.consistent)) return "consistent";
	return "mine";
}

export default function V5({ selected, onChange }: VariantProps) {
	const [mine, setMine] = useState<Set<string>>(() => new Set(PRESETS.consistent));
	const mood = moodFor(selected);
	const preset = presetOf(selected);
	function pick(id: Preset) {
		if (id === "mine") onChange(new Set(mine));
		else onChange(new Set(PRESETS[id]));
	}
	function toggle(usr: string) {
		const next = new Set(selected);
		if (next.has(usr)) next.delete(usr);
		else next.add(usr);
		setMine(next);
		onChange(next);
	}
	function setFor(id: Preset) {
		if (id === "mine") return mine;
		return new Set(PRESETS[id]);
	}
	const shownHolders = holders.filter((t) => selected.has(t.usr)).length;
	return (
		<DrawerFrame>
			<div className="space-y-3">
				<HeroCard score={mood.score}>
					<span className="text-fg-muted">{OPTIONS.find((o) => o.id === preset)?.label}</span>
				</HeroCard>

				<section className="rounded-12 bg-surface p-4">
					<SectionTitle
						aside={
							<span className="flex items-center gap-3">
								<span className="text-fg-muted tabular-nums">
									<span className="text-fg">{selected.size}</span> of {ALL.length} selected
								</span>
								<button
									type="button"
									disabled={preset === "all"}
									onClick={() => pick("all")}
									className="font-medium text-fg-secondary transition-colors hover:text-fg disabled:text-fg-disabled"
								>
									Reset
								</button>
							</span>
						}
					>
						Score from
					</SectionTitle>
					<div className="grid grid-cols-2 gap-2">
						{OPTIONS.map((o) => {
							const set = setFor(o.id);
							const s = moodFor(set).score;
							const on = preset === o.id;
							return (
								<button
									key={o.id}
									type="button"
									onClick={() => pick(o.id)}
									className={cn(
										"flex flex-col gap-1 rounded-8 px-3 py-2.5 text-left transition-colors",
										on ? "bg-control-hover" : "bg-control hover:bg-control-hover",
									)}
								>
									<span className="flex items-baseline justify-between gap-2 text-xs">
										<span className={cn(on ? "font-medium text-fg" : "text-fg-secondary")}>{o.label}</span>
										<span className="font-semibold tabular-nums" style={{ color: moodColor(s) }}>
											{signedScore(s)}
										</span>
									</span>
									<span className="flex items-baseline justify-between gap-2 text-2xs text-fg-muted tabular-nums">
										<span>{o.hint}</span>
										<span>{set.size}</span>
									</span>
								</button>
							);
						})}
					</div>
				</section>

				<section className="rounded-12 bg-surface p-2">
					<div className="flex items-baseline justify-between px-2 pt-2 pb-1 text-xs">
						<span className="font-medium">{MARKET} holders</span>
						<span className="text-2xs text-fg-muted tabular-nums">
							{shownHolders} of {holders.length} in your score
						</span>
					</div>
					<div className="grid grid-cols-[16px_1fr_52px_56px_40px] gap-2.5 px-2 py-1 text-2xs tracking-micro text-fg-muted uppercase">
						<span />
						<span>Trader</span>
						<span className="text-right">Side</span>
						<span className="text-right">PNL all</span>
						<span className="text-right">Green</span>
					</div>
					{holders.map((t) => (
						<Row key={t.usr} t={t} on={selected.has(t.usr)} onToggle={() => toggle(t.usr)} />
					))}
				</section>

				<AutoTargetCard score={mood.score} />
			</div>
		</DrawerFrame>
	);
}

function Row({ t, on, onToggle }: { t: Trader; on: boolean; onToggle: () => void }) {
	const long = isLong(t);
	return (
		<button
			type="button"
			onClick={onToggle}
			aria-pressed={on}
			className="grid w-full grid-cols-[16px_1fr_52px_56px_40px] items-center gap-2.5 rounded-8 px-2 py-1.5 text-left text-xs tabular-nums transition-colors hover:bg-fill-hover"
		>
			<span
				className={cn(
					"grid size-4 place-items-center rounded-full transition-colors",
					on ? "bg-fill text-fg-inverse" : "bg-control-hover",
				)}
			>
				{on && <CheckIcon weight="bold" className="size-2.5" />}
			</span>
			<span className={cn("min-w-0 truncate", !on && "text-fg-muted")}>
				{t.usr.slice(0, 6)}…{t.usr.slice(-4)}
				<span className="block text-2xs text-fg-muted">{compactUsd(t.pos?.ntl ?? 0)}</span>
			</span>
			<span className={cn("text-right", long ? "text-market-up" : "text-market-down", !on && "opacity-50")}>
				{long ? "Long" : "Short"}
			</span>
			<span className={cn("text-right", !on && "text-fg-muted")}>{compactUsd(t.pnlAll)}</span>
			<span className={cn("text-right", !on && "text-fg-muted")}>
				{t.green}/{t.months}
			</span>
		</button>
	);
}
