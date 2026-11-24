import { ArrowUpRightIcon, CaretRightIcon, SlidersHorizontalIcon } from "@phosphor-icons/react";
import { Link } from "@tanstack/react-router";
import { useState } from "react";
import { TextToggle } from "@/components/portfolio/controls";
import { StatRow, stats } from "@/components/portfolio/portfolio-board";
import { PortfolioChart } from "@/components/portfolio/portfolio-chart";
import { pnlClass, signedUsd, usd, usdCompact } from "@/components/tournament/data";
import { Identicon } from "@/components/tournament/parts";
import { usePortfolio } from "@/hooks/use-portfolio";
import { cn } from "@/lib/cn";
import { type PoolTrader, type Stance, stanceOn } from "@/lib/mood/pool";
import { countAllMoodTraders, toggleMoodTrader } from "@/lib/mood/selection";
import { shortAddress, signedScore } from "@/lib/mood/signal";
import { RANGES, type RangeId, SERIES, type SeriesId, seriesFor } from "@/lib/portfolio/model";

const STANCES: { id: Stance; label: string; text: string; fill: string }[] = [
	{ id: "bullish", label: "Bullish", text: "text-market-up", fill: "bg-market-up" },
	{ id: "neutral", label: "Neutral", text: "text-fg-secondary", fill: "bg-fg-muted" },
	{ id: "bearish", label: "Bearish", text: "text-market-down", fill: "bg-market-down" },
];
const STAT_LABELS = ["Win rate", "Max drawdown", "Direction bias"];
const SERIES_SHORT = SERIES.map((s) => ({ id: s.id, label: s.id === "value" ? "Value" : s.label }));

interface PoolProps {
	pool: PoolTrader[];
	coin: string;
	selected: ReadonlySet<string>;
}

function countLabel(pool: PoolTrader[], selected: ReadonlySet<string>) {
	const n = pool.filter((t) => selected.has(t.usr)).length;
	return n === pool.length ? `${pool.length} traders` : `${n} of ${pool.length} traders`;
}

function positionText(t: PoolTrader, coin: string, name: string) {
	const p = t.positions.get(coin);
	if (!p) return `No ${name} position`;
	return `${p.szi > 0 ? "Long" : "Short"} ${usdCompact(p.ntl)}`;
}

function DotGroups({ pool, coin, selected }: PoolProps) {
	return (
		<div className="flex gap-4">
			{STANCES.map((s) => {
				const all = pool.filter((t) => stanceOn(t, coin) === s.id);
				const counted = all.filter((t) => selected.has(t.usr)).length;
				return (
					<div key={s.id} className="flex flex-col gap-2" style={{ flexGrow: Math.max(all.length, 1), flexBasis: 0 }}>
						<span className="flex min-h-2.5 flex-wrap gap-1">
							{all.map((t) => (
								<span
									key={t.usr}
									className={cn(
										"size-2.5 rounded-full transition-colors",
										selected.has(t.usr) ? s.fill : "bg-control-hover",
									)}
								/>
							))}
						</span>
						<span className="text-xs whitespace-nowrap">
							<span className={cn("font-medium tabular-nums", s.text)}>{counted}</span>{" "}
							<span className="text-fg-muted">{s.label.toLowerCase()}</span>
						</span>
					</div>
				);
			})}
		</div>
	);
}

interface CardProps extends PoolProps {
	onEdit: () => void;
	children?: React.ReactNode;
}

export function MoodTradersCard({ pool, coin, selected, onEdit, children }: CardProps) {
	return (
		<section className="rounded-12 bg-surface p-4">
			<div className="flex items-center justify-between gap-3">
				<span className="text-xs font-medium tabular-nums">{countLabel(pool, selected)}</span>
				<button
					type="button"
					onClick={onEdit}
					className="-my-1 flex h-8 items-center gap-1.5 text-xs text-fg-muted transition-colors hover:text-fg"
				>
					<SlidersHorizontalIcon weight="bold" className="size-3.5" />
					Edit traders
				</button>
			</div>
			<div className="mt-4">
				<DotGroups pool={pool} coin={coin} selected={selected} />
			</div>
			{children}
		</section>
	);
}

function Switch({ on }: { on: boolean }) {
	return (
		<span
			className={cn(
				"relative flex h-5 w-9 flex-none rounded-full p-0.5 transition-colors",
				on ? "bg-fill" : "bg-control-hover",
			)}
		>
			<span
				className={cn(
					"size-4 rounded-full transition-transform duration-200",
					on ? "translate-x-4 bg-background" : "bg-fg-muted",
				)}
			/>
		</span>
	);
}

interface EditProps extends PoolProps {
	name: string;
	score: number;
	onOpen: (usr: string) => void;
}

export function MoodTradersPage({ pool, coin, name, selected, score, onOpen }: EditProps) {
	const all = pool.every((t) => selected.has(t.usr));
	return (
		<div className="flex flex-col gap-6 pt-2">
			<div className="rounded-12 bg-surface p-4">
				<div className="mb-4 flex items-baseline justify-between text-xs">
					<span className="font-medium tabular-nums">{countLabel(pool, selected)}</span>
					<span className="text-fg-muted tabular-nums">
						{name} mood {signedScore(score)}
					</span>
				</div>
				<DotGroups pool={pool} coin={coin} selected={selected} />
			</div>
			{STANCES.map((s) => {
				const rows = pool.filter((t) => stanceOn(t, coin) === s.id);
				if (!rows.length) return null;
				const inCount = rows.filter((t) => selected.has(t.usr)).length;
				return (
					<section key={s.id} className="flex flex-col">
						<div className="flex items-baseline gap-2 px-1 pb-2 text-xs">
							<span className={cn("font-medium", s.text)}>{s.label}</span>
							<span className="text-fg-muted tabular-nums">
								{inCount} of {rows.length}
							</span>
						</div>
						<div className="flex flex-col rounded-12 bg-surface p-1">
							{rows.map((t) => {
								const on = selected.has(t.usr);
								return (
									<div
										key={t.usr}
										className="flex h-14 items-center gap-1 rounded-8 pr-3 transition-colors hover:bg-control"
									>
										<button
											type="button"
											onClick={() => onOpen(t.usr)}
											aria-label={`Open ${t.name}`}
											className="flex h-full min-w-0 flex-1 items-center gap-3 pl-3 text-left"
										>
											<Identicon id={t.usr} className={cn("size-7 rounded-full", !on && "opacity-40")} />
											<span className={cn("min-w-0 flex-1", !on && "text-fg-muted")}>
												<span className="block truncate text-xs">
													{t.name} <span className="text-fg-muted">{shortAddress(t.usr)}</span>
												</span>
												<span
													className={cn(
														"block text-2xs tabular-nums",
														on && s.id !== "neutral" ? s.text : "text-fg-muted",
													)}
												>
													{positionText(t, coin, name)}
												</span>
											</span>
											<CaretRightIcon weight="bold" className="mr-2 size-3 flex-none text-fg-muted" />
										</button>
										<button
											type="button"
											aria-pressed={on}
											aria-label={`${on ? "Leave out" : "Count"} ${t.name}`}
											onClick={() => toggleMoodTrader(t.usr)}
											className="grid h-full flex-none place-items-center pl-2"
										>
											<Switch on={on} />
										</button>
									</div>
								);
							})}
						</div>
					</section>
				);
			})}
			{!all && (
				<button
					type="button"
					onClick={() => countAllMoodTraders(pool.map((t) => t.usr))}
					className="h-9 self-start rounded-8 bg-control px-3 text-xs font-medium transition-colors hover:bg-control-hover"
				>
					Reset to all {pool.length}
				</button>
			)}
		</div>
	);
}

function Stat({ label, value, className }: { label: string; value: string; className?: string }) {
	return (
		<div className="flex flex-col gap-1 rounded-8 bg-control px-3 py-2.5">
			<span className="text-2xs text-fg-muted">{label}</span>
			<span className={cn("text-sm font-medium tabular-nums", className)}>{value}</span>
		</div>
	);
}

interface TraderProps {
	t: PoolTrader;
	coin: string;
	name: string;
	on: boolean;
}

export function MoodTraderPage({ t, coin, name, on }: TraderProps) {
	const pos = t.positions.get(coin);
	const stance = STANCES.find((s) => s.id === stanceOn(t, coin));
	const { data } = usePortfolio(t.usr as `0x${string}`);
	const [series, setSeries] = useState<SeriesId>("pnl");
	const [range, setRange] = useState<RangeId>("month");
	const rows = stats(data, range).filter((s) => STAT_LABELS.includes(s.label));

	return (
		<div className="flex flex-col gap-3 pt-2">
			<div className="flex items-center gap-3 rounded-12 bg-surface p-4">
				<Identicon id={t.usr} className="size-11 rounded-full" />
				<div className="flex min-w-0 flex-1 flex-col">
					<span className="truncate text-base font-semibold">{t.name}</span>
					<span className="truncate text-xs text-fg-muted tabular-nums">{shortAddress(t.usr)}</span>
				</div>
			</div>

			<button
				type="button"
				onClick={() => toggleMoodTrader(t.usr)}
				aria-pressed={on}
				className="flex h-14 items-center gap-3 rounded-12 bg-surface px-4 text-left transition-colors hover:bg-control"
			>
				<span className="flex min-w-0 flex-1 flex-col">
					<span className="text-sm">Counts in my mood</span>
					<span className="text-xs text-fg-muted">
						{on ? `This trader moves your ${name} mood` : `Left out of your ${name} mood`}
					</span>
				</span>
				<Switch on={on} />
			</button>

			<section className="flex flex-col gap-3 rounded-12 bg-surface p-4">
				<span className="text-xs text-fg-muted">{name} position</span>
				{pos ? (
					<>
						<span className={cn("text-base font-semibold tabular-nums", stance?.text)}>
							{pos.szi > 0 ? "Long" : "Short"} {usdCompact(pos.ntl)}
						</span>
						<div className="grid grid-cols-3 gap-2">
							<Stat label="Entry" value={usd(pos.entry)} />
							<Stat label="Unrealized PNL" value={signedUsd(pos.upnl, true)} className={pnlClass(pos.upnl)} />
							<Stat label="Leverage" value={pos.lev} />
						</div>
					</>
				) : (
					<span className="text-sm text-fg-secondary">No {name} position now</span>
				)}
			</section>

			<section className="flex flex-col gap-4 rounded-12 bg-surface p-4">
				<div className="flex items-center justify-between">
					<TextToggle items={SERIES_SHORT} value={series} onChange={setSeries} />
					<TextToggle items={RANGES} value={range} onChange={setRange} />
				</div>
				<PortfolioChart
					points={seriesFor(data.history, series, range)}
					series={series}
					range={range}
					height={132}
					loading={data.loading.chart}
				/>
			</section>

			<section className="flex flex-col gap-3 rounded-12 bg-surface p-4">
				<span className="text-xs text-fg-muted">Account</span>
				<div className="grid grid-cols-2 gap-2">
					<Stat label="Account value" value={usd(t.acct)} />
					<Stat label="Green months" value={`${t.green} of ${t.months}`} />
					<Stat label="PNL 30d" value={signedUsd(t.pnl30, true)} className={pnlClass(t.pnl30)} />
					<Stat label="All-time PNL" value={signedUsd(t.pnlAll, true)} className={pnlClass(t.pnlAll)} />
				</div>
				<div className="-mx-4 -mb-1 flex flex-col">
					{rows.map((s) => (
						<StatRow key={s.label} stat={s} />
					))}
				</div>
			</section>

			<Link
				to="/tournament/$address"
				params={{ address: t.usr }}
				className="flex h-10 items-center justify-center gap-1.5 rounded-8 bg-control text-sm font-medium transition-colors hover:bg-control-hover"
			>
				Open full account
				<ArrowUpRightIcon weight="bold" className="size-3.5" />
			</Link>
		</div>
	);
}
