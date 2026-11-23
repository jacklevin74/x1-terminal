import { useState } from "react";
import { cn } from "@/lib/cn";
import { compactUsd, moodColor, signedScore } from "@/lib/mood/signal";
import {
	ALL,
	flat,
	holders,
	isLong,
	MARKET,
	moodFor,
	poolMood,
	sizeText,
	type Trader,
	traders,
	type VariantProps,
} from "./data";
import { AutoTargetCard, DrawerFrame, HeroCard, SectionTitle } from "./drawer";

export default function V3({ selected, onChange }: VariantProps) {
	const [focus, setFocus] = useState<string>(holders[0].usr);
	const mood = moodFor(selected);
	const all = selected.size === ALL.length;
	const active = traders.find((t) => t.usr === focus) ?? holders[0];
	function toggle(usr: string) {
		const next = new Set(selected);
		if (next.has(usr)) next.delete(usr);
		else next.add(usr);
		setFocus(usr);
		onChange(next);
	}
	function only(side: "long" | "short") {
		const keep = holders.filter((t) => (side === "long" ? isLong(t) : !isLong(t))).map((t) => t.usr);
		onChange(new Set([...keep, ...flat.map((t) => t.usr)]));
	}
	return (
		<DrawerFrame>
			<div className="space-y-3">
				<HeroCard score={mood.score}>
					<span className="text-fg-muted tabular-nums">
						{all ? "Pool score" : "Your score"}
						{!all && (
							<>
								{", pool "}
								<span style={{ color: moodColor(poolMood.score) }}>{signedScore(poolMood.score)}</span>
							</>
						)}
					</span>
				</HeroCard>

				<section className="rounded-12 bg-surface p-4">
					<SectionTitle
						aside={
							<span className="text-fg-muted tabular-nums">
								<span className="text-fg">{selected.size}</span> of {ALL.length} selected
							</span>
						}
					>
						Tap a trader to leave them out
					</SectionTitle>
					<div className="flex flex-wrap gap-1.5">
						{holders.map((t) => (
							<Chip key={t.usr} t={t} on={selected.has(t.usr)} onToggle={() => toggle(t.usr)} onFocus={setFocus} />
						))}
					</div>
					<div className="mt-3 mb-1.5 text-2xs tracking-micro text-fg-muted uppercase">No {MARKET} position</div>
					<div className="flex flex-wrap gap-1.5">
						{flat.map((t) => (
							<Chip key={t.usr} t={t} on={selected.has(t.usr)} onToggle={() => toggle(t.usr)} onFocus={setFocus} />
						))}
					</div>

					<Detail t={active} on={selected.has(active.usr)} />

					<div className="mt-3 flex flex-wrap items-center gap-2">
						<QuickChip label="Longs only" onClick={() => only("long")} />
						<QuickChip label="Shorts only" onClick={() => only("short")} />
						<span className="flex-1" />
						<button
							type="button"
							disabled={all}
							onClick={() => onChange(new Set(ALL))}
							className="h-7 rounded-full bg-control px-3 text-xs font-medium transition-colors hover:bg-control-hover disabled:text-fg-disabled disabled:hover:bg-control"
						>
							Reset to all
						</button>
					</div>
				</section>

				<AutoTargetCard score={mood.score} />
			</div>
		</DrawerFrame>
	);
}

function Chip({
	t,
	on,
	onToggle,
	onFocus,
}: {
	t: Trader;
	on: boolean;
	onToggle: () => void;
	onFocus: (usr: string) => void;
}) {
	let dot = "bg-fg-muted";
	if (t.pos) dot = isLong(t) ? "bg-market-up" : "bg-market-down";
	return (
		<button
			type="button"
			onClick={onToggle}
			onMouseEnter={() => onFocus(t.usr)}
			onFocus={() => onFocus(t.usr)}
			aria-pressed={on}
			className={cn(
				"inline-flex h-7 items-center gap-1.5 rounded-full px-2.5 text-xs tabular-nums transition-colors",
				on ? "bg-control-hover text-fg hover:bg-fill-hover" : "bg-background text-fg-disabled hover:text-fg-muted",
			)}
		>
			<span className={cn("size-1.5 rounded-full transition-opacity", dot, !on && "opacity-30")} />
			{t.usr.slice(0, 6)}
		</button>
	);
}

function Detail({ t, on }: { t: Trader; on: boolean }) {
	return (
		<div key={t.usr} className="mood-fade-in mt-3 flex flex-col gap-2 rounded-8 bg-control px-3 py-2.5 text-xs">
			<div className="flex items-baseline justify-between gap-2">
				<span className="tabular-nums">{`${t.usr.slice(0, 10)}…${t.usr.slice(-6)}`}</span>
				<span className="text-2xs text-fg-muted">{on ? "In your score" : "Left out"}</span>
			</div>
			<div className="grid grid-cols-3 gap-2">
				<Cell label="Side" value={side(t)} className={SIDE_CLASS[side(t)]} />
				<Cell label="Size" value={sizeText(t)} />
				<Cell
					label={t.pos ? "uPNL" : "30d PNL"}
					value={compactUsd(t.pos ? t.pos.upnl : t.pnl30)}
					className={(t.pos ? t.pos.upnl : t.pnl30) >= 0 ? "text-market-up" : "text-market-down"}
				/>
			</div>
		</div>
	);
}

function Cell({ label, value, className }: { label: string; value: string; className?: string }) {
	return (
		<span className="flex min-w-0 flex-col gap-0.5">
			<span className="text-2xs text-fg-muted">{label}</span>
			<span className={cn("truncate tabular-nums", className)}>{value}</span>
		</span>
	);
}

function QuickChip({ label, onClick }: { label: string; onClick: () => void }) {
	return (
		<button
			type="button"
			onClick={onClick}
			className="h-7 rounded-full bg-control px-3 text-xs text-fg-secondary transition-colors hover:bg-control-hover hover:text-fg"
		>
			{label}
		</button>
	);
}

const SIDE_CLASS = { Long: "text-market-up", Short: "text-market-down", Flat: "text-fg-muted" } as const;

function side(t: Trader) {
	if (!t.pos) return "Flat";
	return isLong(t) ? "Long" : "Short";
}
