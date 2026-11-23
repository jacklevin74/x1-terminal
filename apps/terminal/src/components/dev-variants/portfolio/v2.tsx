import { useState } from "react";
import { cn } from "@/lib/cn";
import { PortfolioChart } from "./chart";
import {
	account,
	pct,
	pnlClass,
	type RangeId,
	type RangeStats,
	rangeStats,
	type SeriesId,
	SHORT_ADDRESS,
	signedUsd,
	type TabId,
	usd,
	usdCompact,
} from "./data";
import { Actions, BiasBar, Meter, RangeSwitch, SeriesSwitch, TabsBar, WinDots } from "./parts";
import { MobileTabRows, TabTable } from "./tables";

interface Props {
	tab?: TabId;
}

const enter = "duration-200 motion-safe:animate-in motion-safe:fade-in motion-safe:zoom-in-97";

function cells(s: RangeStats) {
	return [
		{ label: `PNL ${s.label}`, value: signedUsd(s.pnl), tone: pnlClass(s.pnl) },
		{ label: `Perps PNL ${s.label}`, value: signedUsd(s.perpPnl), tone: pnlClass(s.perpPnl) },
		{ label: `Volume ${s.label}`, value: usdCompact(s.volume) },
		{ label: "Max drawdown", value: `${pct(s.drawdownPct)}`, sub: usd(s.drawdown) },
		{ label: "Perps equity", value: usd(account.perpEquity) },
		{ label: "Spot equity", value: usd(account.spotEquity) },
		{ label: "Withdrawable", value: usd(account.withdrawable) },
		{ label: "Fees, last 300 fills", value: usd(account.fees) },
	];
}

interface CellProps {
	label: string;
	value: string;
	tone?: string;
	sub?: string;
}

function Cell({ label, value, tone, sub }: CellProps) {
	return (
		<div className="flex flex-col gap-1.5 bg-surface px-4 py-4">
			<span className="text-xs text-fg-muted">{label}</span>
			<span className={cn("text-base font-medium tabular-nums", tone)}>{value}</span>
			{sub && <span className="text-2xs text-fg-muted tabular-nums">{sub}</span>}
		</div>
	);
}

function TraderCells() {
	return (
		<>
			<div className="flex flex-col gap-2 bg-surface px-4 py-4">
				<span className="flex items-baseline justify-between text-xs">
					<span className="text-fg-muted">Win rate</span>
					<span className="text-base font-medium tabular-nums">{pct(account.winRate, 1)}</span>
				</span>
				<WinDots />
				<span className="text-2xs text-fg-muted tabular-nums">
					{account.wins} of {account.closed} closing fills
				</span>
			</div>
			<div className="flex flex-col gap-2 bg-surface px-4 py-4">
				<span className="flex items-baseline justify-between text-xs">
					<span className="text-fg-muted">Leverage</span>
					<span className="text-base font-medium tabular-nums">{account.leverage.toFixed(2)}x</span>
				</span>
				<Meter value={account.leverage / account.setLeverage} />
				<span className="text-2xs text-fg-muted tabular-nums">
					{usdCompact(account.notional)} notional on {usdCompact(account.marginEquity)} equity
				</span>
			</div>
			<div className="flex flex-col gap-2 bg-surface px-4 py-4">
				<span className="flex items-baseline justify-between text-xs">
					<span className="text-fg-muted">Margin usage</span>
					<span className="text-base font-medium tabular-nums">{pct(account.marginUsage)}</span>
				</span>
				<Meter value={account.marginUsage} />
				<span className="text-2xs text-fg-muted tabular-nums">{usdCompact(account.free)} free</span>
			</div>
			<div className="flex flex-col gap-2 bg-surface px-4 py-4">
				<span className="flex items-baseline justify-between text-xs">
					<span className="text-fg-muted">Direction bias</span>
					<span className="text-base font-medium">{account.bias}</span>
				</span>
				<BiasBar />
				<span className="flex justify-between text-2xs text-fg-muted tabular-nums">
					<span>{pct(account.longShare, 0)} long</span>
					<span>{pct(1 - account.longShare, 0)} short</span>
				</span>
			</div>
		</>
	);
}

export function V2Desktop({ tab = "positions" }: Props) {
	const [range, setRange] = useState<RangeId>("month");
	const [series, setSeries] = useState<SeriesId>("value");
	const [active, setActive] = useState<TabId>(tab);
	const s = rangeStats(range);

	return (
		<div className="mx-auto flex w-full max-w-[1440px] flex-col px-8 pt-8 pb-10">
			<header className="flex items-center justify-between gap-8">
				<h1 className="text-lg font-semibold">Portfolio</h1>
				<Actions />
			</header>

			<div className="mt-6 flex h-10 items-center justify-between">
				<span className="text-xs text-fg-secondary tabular-nums">{SHORT_ADDRESS}</span>
				<div className="flex items-center gap-2">
					<SeriesSwitch value={series} onChange={setSeries} />
					<RangeSwitch value={range} onChange={setRange} />
				</div>
			</div>

			<div key={range} className={cn("mt-4 flex flex-col gap-1", enter)}>
				<section className="flex flex-col gap-6 rounded-8 bg-surface px-6 pt-6 pb-5">
					<div className="flex items-end gap-10">
						<span className="flex flex-col gap-1">
							<span className="text-xs text-fg-muted">Account value</span>
							<span className="text-2xl font-semibold tracking-tight tabular-nums">{usd(account.value)}</span>
						</span>
						<span className="flex flex-col gap-1 pb-1.5">
							<span className="text-xs text-fg-muted">PNL {s.long}</span>
							<span className={cn("text-lg font-semibold tabular-nums", pnlClass(s.pnl))}>{signedUsd(s.pnl)}</span>
						</span>
					</div>
					<PortfolioChart series={series} range={range} height={360} strokeWidth={2} />
				</section>

				<div className="grid grid-cols-4 gap-px overflow-hidden rounded-8 bg-background">
					{cells(s).map((c) => (
						<Cell key={c.label} {...c} />
					))}
					<TraderCells />
				</div>
			</div>

			<section className="mt-1 flex flex-col rounded-8 bg-surface">
				<div className="border-b border-stroke-weak px-3">
					<TabsBar value={active} onChange={setActive} />
				</div>
				<TabTable tab={active} />
			</section>
		</div>
	);
}

export function V2Mobile({ tab = "positions" }: Props) {
	const [range, setRange] = useState<RangeId>("month");
	const [series, setSeries] = useState<SeriesId>("value");
	const [active, setActive] = useState<TabId>(tab);
	const s = rangeStats(range);

	return (
		<div className="flex flex-col pb-6">
			<div className="px-4 pt-6">
				<h1 className="text-lg font-semibold">Portfolio</h1>
			</div>
			<div key={range} className={cn("flex flex-col gap-1 px-2 pt-4", enter)}>
				<section className="flex flex-col gap-4 rounded-8 bg-surface p-4">
					<span className="flex flex-col gap-1">
						<span className="text-xs text-fg-muted">Account value</span>
						<span className="text-xl font-semibold tracking-tight tabular-nums">{usd(account.value)}</span>
						<span className={cn("text-sm tabular-nums", pnlClass(s.pnl))}>
							{signedUsd(s.pnl)} {s.long}
						</span>
					</span>
					<PortfolioChart series={series} range={range} height={200} axis="none" />
					<SeriesSwitch value={series} onChange={setSeries} fullWidth />
					<RangeSwitch value={range} onChange={setRange} fullWidth />
				</section>
				<div className="grid grid-cols-2 gap-px overflow-hidden rounded-8 bg-background">
					{cells(s).map((c) => (
						<Cell key={c.label} {...c} />
					))}
				</div>
				<div className="grid grid-cols-1 gap-px overflow-hidden rounded-8 bg-background">
					<TraderCells />
				</div>
			</div>
			<div className="px-4 pt-4">
				<Actions fullWidth />
			</div>
			<div className="mt-6 border-b border-stroke-weak px-2">
				<TabsBar value={active} onChange={setActive} mobile />
			</div>
			<MobileTabRows tab={active} />
		</div>
	);
}
