import { CaretDownIcon, CheckIcon } from "@phosphor-icons/react";
import { useState } from "react";
import { cn } from "@/lib/cn";
import { compactUsd, moodColor, shortAddress, signedScore } from "@/lib/mood/signal";
import { ALL, flat, holders, isLong, moodFor, poolMood, sizeText, type Trader, type VariantProps } from "./data";
import { AutoTargetCard, DrawerFrame, HeroCard, SectionTitle } from "./drawer";

export default function V1({ selected, onChange }: VariantProps) {
	const [showFlat, setShowFlat] = useState(false);
	const mood = moodFor(selected);
	const all = selected.size === ALL.length;
	function toggle(usr: string) {
		const next = new Set(selected);
		if (next.has(usr)) next.delete(usr);
		else next.add(usr);
		onChange(next);
	}
	const counting = holders.filter((t) => selected.has(t.usr)).length;
	return (
		<DrawerFrame>
			<div className="space-y-3">
				<HeroCard score={mood.score}>
					<span className="text-fg-muted tabular-nums">
						{all ? "All 37 traders" : `Your ${selected.size} traders`}
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
						Traders in your score
					</SectionTitle>
					<div className="mb-1 grid grid-cols-[16px_1fr_76px_60px] gap-3 px-2 text-2xs tracking-micro text-fg-muted uppercase">
						<span />
						<span>Trader</span>
						<span className="text-right">Size</span>
						<span className="text-right">uPNL</span>
					</div>
					<div className="-mx-2">
						{holders.map((t) => (
							<Row key={t.usr} t={t} on={selected.has(t.usr)} onToggle={() => toggle(t.usr)} />
						))}
					</div>
					<p className="mt-2 text-2xs text-fg-muted tabular-nums">
						{counting} of {holders.length} HYPE holders count toward this score.
					</p>
					<button
						type="button"
						onClick={() => setShowFlat(!showFlat)}
						className="-mx-2 mt-2 flex w-[calc(100%+16px)] items-center gap-2 rounded-8 px-2 py-2 text-left text-xs text-fg-secondary transition-colors hover:bg-fill-hover"
					>
						<span className="flex-1">{flat.length} traders hold no HYPE</span>
						<span className="text-2xs text-fg-muted">They count in other markets</span>
						<CaretDownIcon className={cn("size-3.5 text-fg-muted transition-transform", showFlat && "rotate-180")} />
					</button>
					{showFlat && (
						<div className="mood-fade-in -mx-2">
							{flat.map((t) => (
								<Row key={t.usr} t={t} on={selected.has(t.usr)} onToggle={() => toggle(t.usr)} />
							))}
						</div>
					)}
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
			className="grid w-full grid-cols-[16px_1fr_76px_60px] items-center gap-3 rounded-8 px-2 py-1.5 text-left text-xs transition-colors hover:bg-fill-hover"
		>
			<span
				className={cn(
					"grid size-4 place-items-center rounded-4 transition-colors",
					on ? "bg-fill text-fg-inverse" : "bg-control-hover",
				)}
			>
				{on && <CheckIcon weight="bold" className="size-3" />}
			</span>
			<span className={cn("min-w-0 transition-opacity", !on && "opacity-50")}>
				<span className="block truncate">{t.name}</span>
				<span className="block text-2xs text-fg-muted">{shortAddress(t.usr)}</span>
			</span>
			<span className={cn("text-right tabular-nums transition-opacity", !on && "opacity-50")}>
				{t.pos ? (
					<>
						<span className={cn("block", long ? "text-market-up" : "text-market-down")}>{long ? "Long" : "Short"}</span>
						<span className="block text-2xs text-fg-muted">{sizeText(t)}</span>
					</>
				) : (
					<span className="text-fg-muted">Flat</span>
				)}
			</span>
			<span
				className={cn(
					"text-right tabular-nums transition-opacity",
					!on && "opacity-50",
					t.pos && (t.pos.upnl >= 0 ? "text-market-up" : "text-market-down"),
				)}
			>
				{t.pos ? compactUsd(t.pos.upnl) : "–"}
			</span>
		</button>
	);
}
