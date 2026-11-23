import { Button, Toggle } from "@hypeterminal/ui";
import { CaretLeftIcon, CaretRightIcon } from "@phosphor-icons/react";
import { useState } from "react";
import { ScoreArc } from "@/components/trade/mood/mood-parts";
import { cn } from "@/lib/cn";
import { compactUsd, moodColor, moodLabel, shortAddress, signedScore } from "@/lib/mood/signal";
import { ALL, flat, holders, isLong, MARKET, moodFor, sizeText, type Trader, type VariantProps } from "./data";
import { AutoTargetCard, DrawerFrame, HeroCard } from "./drawer";

export default function V2({ selected, onChange }: VariantProps) {
	const [page, setPage] = useState<"market" | "traders">("market");
	const [dir, setDir] = useState<1 | -1 | 0>(0);
	const mood = moodFor(selected);
	const all = selected.size === ALL.length;
	function go(next: "market" | "traders") {
		setDir(next === "traders" ? 1 : -1);
		setPage(next);
	}
	function toggle(usr: string, on: boolean) {
		const next = new Set(selected);
		if (on) next.add(usr);
		else next.delete(usr);
		onChange(next);
	}
	const view = viewClass(dir);

	if (page === "traders")
		return (
			<DrawerFrame
				header={
					<div className="mood-fade-in flex items-center gap-3">
						<button
							type="button"
							onClick={() => go("market")}
							className="flex h-8 items-center gap-1.5 rounded-full bg-control pr-3.5 pl-2.5 text-xs font-medium transition-colors hover:bg-control-hover"
						>
							<CaretLeftIcon weight="bold" className="size-3.5" />
							{MARKET} mood
						</button>
						<span className="text-xs text-fg-muted tabular-nums">
							{selected.size} of {ALL.length} selected
						</span>
					</div>
				}
				footer={
					<div className="flex flex-none items-center gap-3 px-4 pt-3 pb-4">
						<div className="relative">
							<ScoreArc value={mood.score} size={40} stroke={4} />
							<span
								className="absolute inset-0 grid place-items-center text-xs font-semibold tabular-nums"
								style={{ color: moodColor(mood.score) }}
							>
								{signedScore(mood.score)}
							</span>
						</div>
						<div className="min-w-0 flex-1">
							<div className="text-xs font-medium">Your {MARKET} mood</div>
							<div className="text-2xs text-fg-muted">{moodLabel(mood.score)}</div>
						</div>
						<Button
							variant="secondary"
							intent="neutral"
							size="md"
							disabled={all}
							onClick={() => onChange(new Set(ALL))}
						>
							Reset
						</Button>
						<Button variant="filled" intent="brand" size="md" onClick={() => go("market")}>
							Done
						</Button>
					</div>
				}
			>
				<div key="traders" className={cn("space-y-3", view)}>
					<List title={`Hold ${MARKET}`} list={holders} selected={selected} onToggle={toggle} />
					<List title={`No ${MARKET} position`} list={flat} selected={selected} onToggle={toggle} />
				</div>
			</DrawerFrame>
		);

	const counting = holders.filter((t) => selected.has(t.usr));
	return (
		<DrawerFrame>
			<div key="market" className={cn("space-y-3", view)}>
				<HeroCard score={mood.score} />
				<button
					type="button"
					onClick={() => go("traders")}
					className="group flex w-full items-center gap-3 rounded-12 bg-surface p-4 text-left transition-colors hover:bg-control"
				>
					<span className="min-w-0 flex-1">
						<span className="block text-xs font-medium">
							{all ? "All 37 traders" : `Your ${selected.size} traders`}
						</span>
						<span className="mt-0.5 block text-2xs text-fg-muted tabular-nums">
							<span className="text-market-up">{counting.filter(isLong).length} long</span>
							<span className="ml-2 text-market-down">{counting.filter((t) => !isLong(t)).length} short</span>
							<span className="ml-2">in {MARKET}</span>
						</span>
					</span>
					<span className="text-xs text-fg-secondary">Choose</span>
					<CaretRightIcon weight="bold" className="size-3 text-fg-muted" />
				</button>
				<AutoTargetCard score={mood.score} />
			</div>
		</DrawerFrame>
	);
}

function List({
	title,
	list,
	selected,
	onToggle,
}: {
	title: string;
	list: Trader[];
	selected: ReadonlySet<string>;
	onToggle: (usr: string, on: boolean) => void;
}) {
	return (
		<section className="rounded-12 bg-surface p-2">
			<div className="flex items-baseline justify-between px-2 pt-2 pb-1 text-xs">
				<span className="font-medium">{title}</span>
				<span className="text-2xs text-fg-muted tabular-nums">
					{list.filter((t) => selected.has(t.usr)).length} of {list.length}
				</span>
			</div>
			{list.map((t) => {
				const on = selected.has(t.usr);
				return (
					<div key={t.usr} className="flex items-center gap-3 rounded-8 px-2 py-2">
						<span className={cn("min-w-0 flex-1 transition-opacity", !on && "opacity-50")}>
							<span className="block truncate text-xs">{shortAddress(t.usr)}</span>
							<span className="block text-2xs text-fg-muted tabular-nums">
								{t.pos ? (
									<>
										<span className={isLong(t) ? "text-market-up" : "text-market-down"}>
											{isLong(t) ? "Long" : "Short"}
										</span>{" "}
										{sizeText(t)}, uPNL{" "}
										<span className={t.pos.upnl >= 0 ? "text-market-up" : "text-market-down"}>
											{compactUsd(t.pos.upnl)}
										</span>
									</>
								) : (
									<>30d PNL {compactUsd(t.pnl30)}</>
								)}
							</span>
						</span>
						<Toggle size="xs" checked={on} onCheckedChange={(v) => onToggle(t.usr, v)} aria-label={t.usr} />
					</div>
				);
			})}
		</section>
	);
}

function viewClass(dir: 0 | 1 | -1) {
	if (dir === 1) return "mood-view-next";
	if (dir === -1) return "mood-view-prev";
	return undefined;
}
