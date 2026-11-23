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
import { Actions, BiasBar, Meter, RangeSwitch, SeriesSwitch, SeriesValue, TabsBar, WinDots } from "./parts";
import { MobileTabRows, TabTable } from "./tables";

interface Props {
	tab?: TabId;
}

const enter = "duration-200 motion-safe:animate-in motion-safe:fade-in motion-safe:zoom-in-97";

function summaryRows(s: RangeStats) {
	return [
		{ label: "PNL", value: signedUsd(s.pnl), tone: pnlClass(s.pnl) },
		{ label: "Volume", value: usd(s.volume) },
		{ label: "Max drawdown", value: `${pct(s.drawdownPct)} (${usdCompact(s.drawdown)})` },
		{ label: "Total equity", value: usd(account.value) },
		{ label: "Perps equity", value: usd(account.perpEquity) },
		{ label: "Spot equity", value: usd(account.spotEquity) },
		{ label: "Withdrawable", value: usd(account.withdrawable) },
	];
}

export function V1Desktop({ tab = "positions" }: Props) {
	const [range, setRange] = useState<RangeId>("month");
	const [series, setSeries] = useState<SeriesId>("pnl");
	const [active, setActive] = useState<TabId>(tab);
	const s = rangeStats(range);

	return (
		<div className="mx-auto flex w-full max-w-[1440px] flex-col px-8 pt-8 pb-10">
			<header className="flex items-center justify-between gap-8">
				<h1 className="text-lg font-semibold">Portfolio</h1>
				<Actions />
			</header>

			<div className="mt-6 flex h-10 items-center justify-between">
				<span className="flex items-center gap-3 text-xs text-fg-muted tabular-nums">
					<span className="text-fg-secondary">{SHORT_ADDRESS}</span>
					<span>Perps and spot</span>
				</span>
				<RangeSwitch value={range} onChange={setRange} />
			</div>

			<div key={range} className={cn("mt-4 grid grid-cols-[minmax(0,9fr)_minmax(0,10fr)_minmax(0,17fr)] gap-1", enter)}>
				<div className="flex flex-col gap-1">
					<div className="flex flex-col gap-2 rounded-8 bg-surface p-4">
						<span className="text-xs text-fg-muted">Volume {s.long}</span>
						<span className="text-xl font-semibold tracking-tight tabular-nums">{usdCompact(s.volume)}</span>
						<span className="text-xs text-fg-muted tabular-nums">
							Fees {usd(account.fees)} on the last {account.feeFills} fills
						</span>
					</div>
					<div className="flex flex-1 flex-col gap-3 rounded-8 bg-surface p-4">
						<div className="flex items-baseline justify-between">
							<span className="text-xs text-fg-muted">Win rate</span>
							<span className="text-sm font-medium tabular-nums">{pct(account.winRate, 1)}</span>
						</div>
						<WinDots />
						<span className="text-2xs text-fg-muted tabular-nums">
							{account.wins} of {account.closed} closing fills in profit
						</span>
						<div className="mt-1 grid grid-cols-2 gap-x-4 gap-y-3 text-xs tabular-nums">
							<span className="flex flex-col gap-1.5">
								<span className="text-fg-muted">Leverage</span>
								<span>{account.leverage.toFixed(2)}x</span>
								<Meter value={account.leverage / account.setLeverage} />
								<span className="text-2xs text-fg-muted">
									{usdCompact(account.notional)} on {usdCompact(account.marginEquity)}
								</span>
							</span>
							<span className="flex flex-col gap-1.5">
								<span className="text-fg-muted">Margin usage</span>
								<span>{pct(account.marginUsage)}</span>
								<Meter value={account.marginUsage} />
								<span className="text-2xs text-fg-muted">{usdCompact(account.free)} free</span>
							</span>
						</div>
						<span className="flex flex-col gap-1.5 text-xs tabular-nums">
							<span className="flex justify-between">
								<span className="text-fg-muted">Direction bias</span>
								<span>{account.bias}</span>
							</span>
							<BiasBar />
							<span className="flex justify-between text-2xs text-fg-muted">
								<span>
									{pct(account.longShare, 0)} long {usdCompact(account.longNotional)}
								</span>
								<span>
									{usdCompact(account.shortNotional)} short {pct(1 - account.longShare, 0)}
								</span>
							</span>
						</span>
					</div>
				</div>

				<div className="flex flex-col rounded-8 bg-surface p-4">
					<span className="text-xs text-fg-muted">Account value</span>
					<span className="mt-2 text-xl font-semibold tracking-tight tabular-nums">{usd(account.value)}</span>
					<span className={cn("mt-1 text-xs tabular-nums", pnlClass(s.pnl))}>
						{signedUsd(s.pnl)} {s.long}
					</span>
					<div className="mt-5 flex flex-col">
						{summaryRows(s).map((r) => (
							<div key={r.label} className="flex h-9 items-center justify-between text-xs tabular-nums">
								<span className="text-fg-muted">{r.label}</span>
								<span className={r.tone ?? "text-fg"}>{r.value}</span>
							</div>
						))}
					</div>
				</div>

				<div className="flex flex-col gap-3 rounded-8 bg-surface p-4">
					<div className="flex items-center justify-between">
						<SeriesSwitch value={series} onChange={setSeries} />
						<SeriesValue series={series} range={range} />
					</div>
					<PortfolioChart series={series} range={range} height={300} />
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

export function V1Mobile({ tab = "positions" }: Props) {
	const [range, setRange] = useState<RangeId>("month");
	const [series, setSeries] = useState<SeriesId>("pnl");
	const [active, setActive] = useState<TabId>(tab);
	const s = rangeStats(range);
	const tiles = [
		{ label: `PNL ${s.label}`, value: signedUsd(s.pnl, true), tone: pnlClass(s.pnl) },
		{ label: `Volume ${s.label}`, value: usdCompact(s.volume) },
		{ label: "Max drawdown", value: pct(s.drawdownPct) },
		{ label: "Withdrawable", value: usdCompact(account.withdrawable) },
		{ label: "Perps equity", value: usdCompact(account.perpEquity) },
		{ label: "Spot equity", value: usd(account.spotEquity) },
	];

	return (
		<div className="flex flex-col pb-6">
			<div className="flex flex-col gap-4 px-4 pt-6">
				<div className="flex flex-col gap-1">
					<h1 className="text-lg font-semibold">Portfolio</h1>
					<span className="text-xl font-semibold tracking-tight tabular-nums">{usd(account.value)}</span>
				</div>
				<Actions fullWidth />
				<RangeSwitch value={range} onChange={setRange} fullWidth />
			</div>

			<div key={range} className={cn("flex flex-col gap-1 px-2 pt-4", enter)}>
				<div className="grid grid-cols-2 gap-1">
					{tiles.map((t) => (
						<div key={t.label} className="flex flex-col gap-1 rounded-8 bg-surface px-3 py-3">
							<span className="text-xs text-fg-muted">{t.label}</span>
							<span className={cn("text-sm font-medium tabular-nums", t.tone)}>{t.value}</span>
						</div>
					))}
				</div>
				<div className="flex flex-col gap-3 rounded-8 bg-surface p-3">
					<SeriesSwitch value={series} onChange={setSeries} fullWidth />
					<PortfolioChart series={series} range={range} height={180} />
				</div>
				<div className="flex flex-col gap-3 rounded-8 bg-surface p-3">
					<div className="flex items-baseline justify-between text-xs">
						<span className="text-fg-muted">Win rate</span>
						<span className="font-medium tabular-nums">{pct(account.winRate, 1)}</span>
					</div>
					<WinDots />
					<div className="grid grid-cols-3 gap-3 text-xs tabular-nums">
						<span className="flex flex-col gap-1">
							<span className="text-fg-muted">Leverage</span>
							<span>{account.leverage.toFixed(2)}x</span>
							<span className="text-2xs text-fg-muted">{usdCompact(account.notional)} notional</span>
						</span>
						<span className="flex flex-col gap-1">
							<span className="text-fg-muted">Margin</span>
							<span>{pct(account.marginUsage)}</span>
							<span className="text-2xs text-fg-muted">{usdCompact(account.marginEquity)} equity</span>
						</span>
						<span className="flex flex-col gap-1">
							<span className="text-fg-muted">Bias</span>
							<span>{pct(account.longShare, 0)} long</span>
							<span className="text-2xs text-fg-muted">{account.bias}</span>
						</span>
					</div>
				</div>
			</div>

			<div className="mt-6 border-b border-stroke-weak px-2">
				<TabsBar value={active} onChange={setActive} mobile />
			</div>
			<MobileTabRows tab={active} />
		</div>
	);
}
