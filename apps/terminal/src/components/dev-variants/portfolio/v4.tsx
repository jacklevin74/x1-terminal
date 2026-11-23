import { Tabs, TabsList, TabsTrigger } from "@hypeterminal/ui";
import { type ReactNode, useState } from "react";
import { cn } from "@/lib/cn";
import { PortfolioChart } from "./chart";
import {
	account,
	pct,
	pnlClass,
	type RangeId,
	type RangeStats,
	rangeStats,
	SERIES,
	type SeriesId,
	SHORT_ADDRESS,
	signedUsd,
	type TabId,
	usd,
	usdCompact,
} from "./data";
import { Actions, BiasBar, Meter, RangeSwitch, SeriesValue, TabsBar, WinDots } from "./parts";
import { MobileTabRows, TabTable } from "./tables";

interface Props {
	tab?: TabId;
}

const enter = "duration-200 motion-safe:animate-in motion-safe:fade-in motion-safe:zoom-in-97";

interface RowProps {
	label: string;
	children: ReactNode;
	tone?: string;
}

function Row({ label, children, tone }: RowProps) {
	return (
		<div className="flex h-8 items-center justify-between gap-3 text-xs tabular-nums">
			<span className="text-fg-muted">{label}</span>
			<span className={cn("text-right", tone)}>{children}</span>
		</div>
	);
}

interface GroupProps {
	title: string;
	children: ReactNode;
}

function Group({ title, children }: GroupProps) {
	return (
		<div className="flex flex-col pt-4">
			<span className="pb-1 text-2xs tracking-micro text-fg-muted uppercase">{title}</span>
			{children}
		</div>
	);
}

interface LedgerProps {
	s: RangeStats;
}

function Ledger({ s }: LedgerProps) {
	return (
		<>
			<Group title="Equity">
				<Row label="Total equity">{usd(account.value)}</Row>
				<Row label="Perps">{usd(account.perpEquity)}</Row>
				<Row label="Spot">{usd(account.spotEquity)}</Row>
				<Row label="Withdrawable">{usd(account.withdrawable)}</Row>
				<Row label="Unrealized PNL" tone={pnlClass(account.unrealized)}>
					{signedUsd(account.unrealized)}
				</Row>
			</Group>
			<Group title={`Range ${s.label}`}>
				<Row label="PNL" tone={pnlClass(s.pnl)}>
					{signedUsd(s.pnl)}
				</Row>
				<Row label="Perps PNL" tone={pnlClass(s.perpPnl)}>
					{signedUsd(s.perpPnl)}
				</Row>
				<Row label="Volume">{usd(s.volume)}</Row>
				<Row label="Max drawdown">
					{pct(s.drawdownPct)} <span className="text-fg-muted">{usdCompact(s.drawdown)}</span>
				</Row>
				<Row label="Fees, last 300 fills">{usd(account.fees)}</Row>
			</Group>
			<Group title="Trader">
				<Row label="Win rate">
					{pct(account.winRate, 1)}{" "}
					<span className="text-fg-muted">
						{account.wins} of {account.closed}
					</span>
				</Row>
				<WinDots className="mt-1 mb-2" />
				<Row label="Leverage">
					{account.leverage.toFixed(2)}x{" "}
					<span className="text-fg-muted">
						{usdCompact(account.notional)} on {usdCompact(account.marginEquity)}
					</span>
				</Row>
				<Meter value={account.leverage / account.setLeverage} className="mt-1 mb-2" />
				<Row label="Margin usage">
					{pct(account.marginUsage)} <span className="text-fg-muted">{usdCompact(account.free)} free</span>
				</Row>
				<Meter value={account.marginUsage} className="mt-1 mb-2" />
				<Row label="Direction bias">{account.bias}</Row>
				<BiasBar className="mt-1" />
				<span className="flex justify-between pt-2 text-2xs text-fg-muted tabular-nums">
					<span>
						{pct(account.longShare, 0)} long {usdCompact(account.longNotional)}
					</span>
					<span>
						{usdCompact(account.shortNotional)} short {pct(1 - account.longShare, 0)}
					</span>
				</span>
			</Group>
		</>
	);
}

interface SeriesTabsProps {
	value: SeriesId;
	onChange: (v: SeriesId) => void;
}

function SeriesTabs({ value, onChange }: SeriesTabsProps) {
	return (
		<Tabs value={value} onValueChange={(v) => onChange(v as SeriesId)} variant="underline" className="h-full">
			<TabsList className="h-full border-b-0">
				{SERIES.map((x) => (
					<TabsTrigger key={x.id} value={x.id} className="h-full py-0">
						{x.label}
					</TabsTrigger>
				))}
			</TabsList>
		</Tabs>
	);
}

export function V4Desktop({ tab = "positions" }: Props) {
	const [range, setRange] = useState<RangeId>("month");
	const [series, setSeries] = useState<SeriesId>("value");
	const [active, setActive] = useState<TabId>(tab);
	const s = rangeStats(range);

	return (
		<div className="mx-auto flex w-full max-w-[1440px] flex-col px-8 pt-8 pb-10">
			<header className="flex items-center justify-between gap-8">
				<h1 className="text-lg font-semibold">Portfolio</h1>
			</header>
			<div className="mt-6 flex h-10 items-center justify-between">
				<span className="text-xs text-fg-secondary tabular-nums">{SHORT_ADDRESS}</span>
				<RangeSwitch value={range} onChange={setRange} />
			</div>

			<div className="mt-4 grid grid-cols-[320px_minmax(0,1fr)] items-start gap-1">
				<aside className="sticky top-24 flex flex-col rounded-8 bg-surface p-4">
					<span className="text-xs text-fg-muted">Account value</span>
					<span className="mt-1 text-xl font-semibold tracking-tight tabular-nums">{usd(account.value)}</span>
					<span key={range} className={cn("mt-1 text-sm tabular-nums", pnlClass(s.pnl), enter)}>
						{signedUsd(s.pnl)} {s.long}
					</span>
					<Actions fullWidth className="mt-4" />
					<div key={`l-${range}`} className={enter}>
						<Ledger s={s} />
					</div>
				</aside>

				<div className="flex min-w-0 flex-col gap-1">
					<section className="flex flex-col rounded-8 bg-surface">
						<div className="flex h-10 items-center justify-between border-b border-stroke-weak px-3">
							<SeriesTabs value={series} onChange={setSeries} />
							<SeriesValue series={series} range={range} />
						</div>
						<div key={range} className={cn("px-4 pt-4 pb-4", enter)}>
							<PortfolioChart series={series} range={range} height={320} />
						</div>
					</section>
					<section className="flex flex-col rounded-8 bg-surface">
						<div className="border-b border-stroke-weak px-3">
							<TabsBar value={active} onChange={setActive} />
						</div>
						<TabTable tab={active} maxHeight={520} />
					</section>
				</div>
			</div>
		</div>
	);
}

export function V4Mobile({ tab = "positions" }: Props) {
	const [range, setRange] = useState<RangeId>("month");
	const [series, setSeries] = useState<SeriesId>("value");
	const [active, setActive] = useState<TabId>(tab);
	const s = rangeStats(range);
	const tiles = [
		{ label: `PNL ${s.label}`, value: signedUsd(s.pnl, true), tone: pnlClass(s.pnl) },
		{ label: `Volume ${s.label}`, value: usdCompact(s.volume) },
		{ label: "Max drawdown", value: pct(s.drawdownPct) },
		{ label: "Withdrawable", value: usdCompact(account.withdrawable) },
	];

	return (
		<div className="flex flex-col pb-6">
			<div className="flex flex-col px-4 pt-6">
				<h1 className="text-lg font-semibold">Portfolio</h1>
				<span className="mt-3 text-xs text-fg-muted">Account value</span>
				<span className="text-xl font-semibold tracking-tight tabular-nums">{usd(account.value)}</span>
				<Actions fullWidth className="mt-4" />
				<RangeSwitch value={range} onChange={setRange} fullWidth className="mt-4" />
			</div>
			<div key={range} className={cn("flex flex-col gap-1 px-2 pt-4", enter)}>
				<div className="grid grid-cols-2 gap-1">
					{tiles.map((t) => (
						<div key={t.label} className="flex flex-col gap-1 rounded-8 bg-surface p-3">
							<span className="text-xs text-fg-muted">{t.label}</span>
							<span className={cn("text-sm font-medium tabular-nums", t.tone)}>{t.value}</span>
						</div>
					))}
				</div>
				<section className="flex flex-col rounded-8 bg-surface">
					<div className="h-10 overflow-x-auto border-b border-stroke-weak px-2 scrollbar-none">
						<SeriesTabs value={series} onChange={setSeries} />
					</div>
					<div className="p-3">
						<PortfolioChart series={series} range={range} height={180} />
					</div>
				</section>
				<div className="flex flex-col rounded-8 bg-surface px-4 pb-4">
					<Ledger s={s} />
				</div>
			</div>
			<div className="mt-6 border-b border-stroke-weak px-2">
				<TabsBar value={active} onChange={setActive} mobile />
			</div>
			<MobileTabRows tab={active} />
		</div>
	);
}
