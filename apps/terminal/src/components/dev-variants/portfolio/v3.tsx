import { ArrowDownRightIcon, ArrowUpRightIcon } from "@phosphor-icons/react";
import { type ReactNode, useState } from "react";
import { cn } from "@/lib/cn";
import { PortfolioChart } from "./chart";
import {
	account,
	pct,
	pnlClass,
	RANGES,
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
import { Actions, BiasBar, Meter, TabsBar, WinDots } from "./parts";
import { MobileTabRows, TabTable } from "./tables";

interface Props {
	tab?: TabId;
}

const enter = "duration-200 motion-safe:animate-in motion-safe:fade-in motion-safe:zoom-in-97";

interface CardProps {
	title: string;
	aside?: ReactNode;
	children: ReactNode;
	className?: string;
}

function Card({ title, aside, children, className }: CardProps) {
	return (
		<div className={cn("flex flex-col rounded-8 bg-surface", className)}>
			<div className="flex h-10 items-center justify-between px-4 text-xs">
				<span className="font-medium">{title}</span>
				{aside}
			</div>
			<div className="flex flex-1 flex-col justify-between gap-3 px-4 pb-4">{children}</div>
		</div>
	);
}

interface ToggleProps<T extends string> {
	items: { id: T; label: string }[];
	value: T;
	onChange: (v: T) => void;
	label: string;
}

function TextToggle<T extends string>({ items, value, onChange, label }: ToggleProps<T>) {
	return (
		<fieldset aria-label={label} className="m-0 flex items-center gap-1 border-0 p-0">
			{items.map((it) => (
				<button
					key={it.id}
					type="button"
					aria-pressed={value === it.id}
					onClick={() => onChange(it.id)}
					className={cn(
						"h-7 rounded-6 px-2 text-2xs tracking-micro uppercase transition-colors",
						value === it.id ? "bg-control text-fg" : "text-fg-muted hover:text-fg",
					)}
				>
					{it.label}
				</button>
			))}
		</fieldset>
	);
}

interface PanelProps {
	s: RangeStats;
}

function Performance({ s }: PanelProps) {
	return (
		<Card title="Performance" aside={<span className="text-fg-muted">{s.long}</span>}>
			<span className={cn("text-lg font-medium tabular-nums", pnlClass(s.pnl))}>
				{signedUsd(s.pnl)} <span className="text-xs font-normal text-fg-muted">PNL</span>
			</span>
			<div className="flex flex-col gap-2">
				<WinDots />
				<span className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs whitespace-nowrap tabular-nums">
					<span className="text-market-up">{pct(account.winRate, 1)} win rate</span>
					<span className="text-fg-muted">{account.closed} closing fills</span>
				</span>
			</div>
		</Card>
	);
}

function Leverage() {
	return (
		<Card title="Leverage" aside={<span className="text-fg-muted">{account.setLeverage}x set</span>}>
			<span className={"text-lg font-medium tabular-nums"}>{account.leverage.toFixed(2)}x</span>
			<div className="flex flex-col gap-2">
				<Meter value={account.leverage / account.setLeverage} />
				<span className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs whitespace-nowrap tabular-nums">
					<span>{usdCompact(account.notional)} notional</span>
					<span className="text-fg-muted">{usdCompact(account.marginEquity)} equity</span>
				</span>
			</div>
		</Card>
	);
}

function Margin() {
	return (
		<Card title="Margin usage">
			<span className={"text-lg font-medium tabular-nums"}>{pct(account.marginUsage)}</span>
			<div className="flex flex-col gap-2">
				<Meter value={account.marginUsage} />
				<span className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs whitespace-nowrap tabular-nums">
					<span>{usdCompact(account.free)} free</span>
					<span className="text-fg-muted">{usdCompact(account.marginUsed)} used</span>
				</span>
			</div>
		</Card>
	);
}

function Bias() {
	const Arrow = account.longShare >= 0.5 ? ArrowUpRightIcon : ArrowDownRightIcon;
	return (
		<Card title="Direction bias">
			<span className={"flex items-center gap-1.5 text-lg font-medium"}>
				{account.bias}
				<Arrow className="size-4 text-fg-muted" />
			</span>
			<div className="flex flex-col gap-2">
				<BiasBar />
				<span className="flex justify-between text-xs tabular-nums">
					<span>
						{pct(account.longShare, 0)} long <span className="text-fg-muted">{usdCompact(account.longNotional)}</span>
					</span>
					<span>
						<span className="text-fg-muted">{usdCompact(account.shortNotional)}</span> short{" "}
						{pct(1 - account.longShare, 0)}
					</span>
				</span>
			</div>
		</Card>
	);
}

function summary(s: RangeStats) {
	return [
		{ label: "Account value", value: usd(account.value) },
		{ label: `Volume ${s.label}`, value: usdCompact(s.volume) },
		{ label: "Max drawdown", value: `${pct(s.drawdownPct)} (${usdCompact(s.drawdown)})` },
		{ label: "Perps equity", value: usd(account.perpEquity) },
		{ label: "Spot equity", value: usd(account.spotEquity) },
		{ label: "Withdrawable", value: usd(account.withdrawable) },
		{ label: "Fees, last 300 fills", value: usd(account.fees) },
	];
}

export function V3Desktop({ tab = "positions" }: Props) {
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

			<div className="mt-6 flex h-10 items-center justify-between text-xs">
				<span className="text-fg-secondary tabular-nums">{SHORT_ADDRESS}</span>
				<span className="text-fg-muted tabular-nums">
					Account value <span className="text-fg">{usd(account.value)}</span>
				</span>
			</div>

			<div key={range} className={cn("mt-4 flex flex-col gap-1", enter)}>
				<div className="grid grid-cols-[minmax(0,10fr)_minmax(0,11fr)] gap-1">
					<div className="grid grid-cols-2 grid-rows-2 gap-1">
						<Performance s={s} />
						<Leverage />
						<Margin />
						<Bias />
					</div>
					<div className="flex flex-col rounded-8 bg-surface">
						<div className="flex h-10 items-center justify-between px-2">
							<TextToggle items={SERIES} value={series} onChange={setSeries} label="Chart" />
							<TextToggle items={RANGES} value={range} onChange={setRange} label="Range" />
						</div>
						<div className="px-4 pt-2 pb-4">
							<PortfolioChart series={series} range={range} height={250} />
						</div>
					</div>
				</div>
				<div className="grid grid-cols-7 rounded-8 bg-surface px-1 py-4">
					{summary(s).map((r) => (
						<span key={r.label} className="flex flex-col gap-1 px-4">
							<span className="text-xs text-fg-muted">{r.label}</span>
							<span className="text-sm font-medium tabular-nums">{r.value}</span>
						</span>
					))}
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

export function V3Mobile({ tab = "positions" }: Props) {
	const [range, setRange] = useState<RangeId>("month");
	const [series, setSeries] = useState<SeriesId>("pnl");
	const [active, setActive] = useState<TabId>(tab);
	const s = rangeStats(range);

	return (
		<div className="flex flex-col pb-6">
			<div className="flex flex-col gap-1 px-4 pt-6">
				<h1 className="text-lg font-semibold">Portfolio</h1>
				<span className="text-xs text-fg-muted tabular-nums">
					Account value <span className="text-fg">{usd(account.value)}</span>
				</span>
			</div>
			<div className="px-4 pt-4">
				<Actions fullWidth />
			</div>
			<div key={range} className={cn("flex flex-col gap-1 px-2 pt-4", enter)}>
				<div className="flex flex-col rounded-8 bg-surface">
					<div className="flex h-10 items-center justify-between px-2">
						<TextToggle items={SERIES} value={series} onChange={setSeries} label="Chart" />
					</div>
					<div className="px-3 pb-2">
						<PortfolioChart series={series} range={range} height={180} />
					</div>
					<div className="flex justify-center px-2 pb-3">
						<TextToggle items={RANGES} value={range} onChange={setRange} label="Range" />
					</div>
				</div>
				<Performance s={s} />
				<div className="grid grid-cols-2 gap-1">
					<Leverage />
					<Margin />
				</div>
				<Bias />
				<div className="flex flex-col rounded-8 bg-surface px-4 py-2">
					{summary(s).map((r) => (
						<span key={r.label} className="flex h-9 items-center justify-between text-xs tabular-nums">
							<span className="text-fg-muted">{r.label}</span>
							<span>{r.value}</span>
						</span>
					))}
				</div>
			</div>
			<div className="mt-6 border-b border-stroke-weak px-2">
				<TabsBar value={active} onChange={setActive} mobile />
			</div>
			<MobileTabRows tab={active} />
		</div>
	);
}
