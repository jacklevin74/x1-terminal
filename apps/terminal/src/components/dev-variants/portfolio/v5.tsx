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
import { Actions, BiasBar, Meter, RangeSwitch, SeriesSwitch, SeriesValue, TabsBar, WinDots } from "./parts";
import { MobileTabRows, TabTable } from "./tables";

interface Props {
	tab?: TabId;
}

const enter = "duration-200 motion-safe:animate-in motion-safe:fade-in motion-safe:zoom-in-97";

interface Stat {
	label: string;
	value: ReactNode;
	tone?: string;
	extra?: ReactNode;
}

function stats(s: RangeStats): Stat[] {
	return [
		{ label: "Account value", value: usd(account.value) },
		{ label: `PNL ${s.label}`, value: signedUsd(s.pnl), tone: pnlClass(s.pnl) },
		{ label: `Perps PNL ${s.label}`, value: signedUsd(s.perpPnl), tone: pnlClass(s.perpPnl) },
		{ label: "Perps equity", value: usd(account.perpEquity) },
		{ label: `Volume ${s.label}`, value: usd(s.volume) },
		{ label: "Unrealized PNL", value: signedUsd(account.unrealized), tone: pnlClass(account.unrealized) },
		{ label: "Spot equity", value: usd(account.spotEquity) },
		{
			label: "Max drawdown",
			value: (
				<>
					{pct(s.drawdownPct)} <span className="text-fg-muted">{usdCompact(s.drawdown)}</span>
				</>
			),
		},
		{ label: "Fees, last 300 fills", value: usd(account.fees) },
		{ label: "Withdrawable", value: usd(account.withdrawable) },
		{
			label: "Leverage",
			value: (
				<>
					{account.leverage.toFixed(2)}x{" "}
					<span className="text-fg-muted">
						{usdCompact(account.notional)} / {usdCompact(account.marginEquity)}
					</span>
				</>
			),
			extra: <Meter value={account.leverage / account.setLeverage} className="w-12" />,
		},
		{
			label: "Margin usage",
			value: pct(account.marginUsage),
			extra: <Meter value={account.marginUsage} className="w-12" />,
		},
		{
			label: "Win rate",
			value: (
				<>
					{pct(account.winRate, 1)}{" "}
					<span className="text-fg-muted">
						{account.wins}/{account.closed}
					</span>
				</>
			),
			extra: <WinDots className="w-28" gap="gap-0.5" />,
		},
		{
			label: "Direction bias",
			value: (
				<>
					{pct(account.longShare, 0)} long <span className="text-fg-muted">{account.bias}</span>
				</>
			),
			extra: <BiasBar className="w-12" />,
		},
		{
			label: "Long / short",
			value: (
				<>
					{usdCompact(account.longNotional)} <span className="text-fg-muted">/</span>{" "}
					{usdCompact(account.shortNotional)}
				</>
			),
		},
	];
}

interface StatRowProps {
	stat: Stat;
}

function StatRow({ stat }: StatRowProps) {
	return (
		<div className="flex h-8 items-center justify-between gap-3 px-3 text-xs tabular-nums transition-colors hover:bg-band">
			<span className="shrink-0 text-fg-muted">{stat.label}</span>
			<span className="flex min-w-0 items-center gap-2">
				{stat.extra}
				<span className={cn("truncate text-right", stat.tone)}>{stat.value}</span>
			</span>
		</div>
	);
}

export function V5Desktop({ tab = "positions" }: Props) {
	const [range, setRange] = useState<RangeId>("day");
	const [series, setSeries] = useState<SeriesId>("pnl");
	const [active, setActive] = useState<TabId>(tab);
	const s = rangeStats(range);
	const list = stats(s);
	const cols = [list.slice(0, 5), list.slice(5, 10), list.slice(10)];

	return (
		<div className="flex w-full flex-col gap-1 p-1">
			<div className="flex h-12 items-center justify-between rounded-8 bg-surface px-3">
				<span className="flex items-baseline gap-3">
					<h1 className="text-base font-semibold">Portfolio</h1>
					<span className="text-xs text-fg-secondary tabular-nums">{SHORT_ADDRESS}</span>
				</span>
				<span className="flex items-center gap-2">
					<SeriesSwitch value={series} onChange={setSeries} size="xs" />
					<RangeSwitch value={range} onChange={setRange} size="xs" />
					<Actions size="sm" className="ml-2" />
				</span>
			</div>

			<div key={range} className={cn("grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_420px] gap-1", enter)}>
				{cols.map((c) => (
					<div key={c[0].label} className="flex flex-col rounded-8 bg-surface py-1">
						{c.map((st) => (
							<StatRow key={st.label} stat={st} />
						))}
					</div>
				))}
				<div className="flex flex-col gap-1 rounded-8 bg-surface px-3 pt-2 pb-2">
					<div className="flex h-6 items-center justify-between text-xs">
						<span className="text-fg-muted">
							{SERIES.find((x) => x.id === series)?.label} {s.label}
						</span>
						<SeriesValue series={series} range={range} className="text-xs" />
					</div>
					<PortfolioChart
						series={series}
						range={range}
						height={118}
						axis="none"
						dots
						endChip
						smooth={false}
						strokeWidth={1.25}
						xTicks={false}
						gridCount={2}
					/>
				</div>
			</div>

			<section className="flex flex-col rounded-8 bg-surface">
				<div className="flex h-9 items-stretch border-b border-stroke-weak px-3">
					<TabsBar value={active} onChange={setActive} counts="all" className="h-9 flex-1" />
				</div>
				<TabTable tab={active} rowHeight="h-8" maxHeight={640} />
			</section>
		</div>
	);
}

export function V5Mobile({ tab = "positions" }: Props) {
	const [range, setRange] = useState<RangeId>("day");
	const [series, setSeries] = useState<SeriesId>("pnl");
	const [active, setActive] = useState<TabId>(tab);
	const s = rangeStats(range);

	return (
		<div className="flex flex-col gap-1 p-1 pb-6">
			<div className="flex flex-col gap-3 rounded-8 bg-surface p-3">
				<span className="flex items-baseline justify-between">
					<h1 className="text-base font-semibold">Portfolio</h1>
					<span className="text-xs text-fg-secondary tabular-nums">{SHORT_ADDRESS}</span>
				</span>
				<Actions size="sm" fullWidth />
				<RangeSwitch value={range} onChange={setRange} fullWidth />
			</div>
			<div key={range} className={cn("flex flex-col gap-1", enter)}>
				<div className="flex flex-col gap-2 rounded-8 bg-surface p-3">
					<SeriesSwitch value={series} onChange={setSeries} fullWidth size="xs" />
					<PortfolioChart
						series={series}
						range={range}
						height={120}
						axis="none"
						dots
						endChip
						smooth={false}
						strokeWidth={1.25}
						xTicks={false}
						gridCount={2}
					/>
				</div>
				<div className="flex flex-col rounded-8 bg-surface py-1">
					{stats(s).map((st) => (
						<StatRow key={st.label} stat={st} />
					))}
				</div>
			</div>
			<div className="rounded-8 bg-surface">
				<div className="border-b border-stroke-weak px-1">
					<TabsBar value={active} onChange={setActive} counts="all" mobile />
				</div>
				<MobileTabRows tab={active} />
			</div>
		</div>
	);
}
