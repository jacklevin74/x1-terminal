import { ArrowDownRightIcon, ArrowUpRightIcon } from "@phosphor-icons/react";
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import { account, pct, pnlClass, type RangeStats, rangeStats, signedUsd, usd, usdCompact } from "../portfolio/data";
import { BiasBar, Meter, WinDots } from "../portfolio/parts";
import { enter, MobileTabs, TabPanel, useChartState, type VariantProps } from "./common";
import { TopDesktop, TopMobile } from "./top";

interface CardProps {
	title: string;
	aside?: ReactNode;
	children: ReactNode;
}

function Card({ title, aside, children }: CardProps) {
	return (
		<div className="flex flex-col rounded-8 bg-surface">
			<div className="flex h-10 items-center justify-between px-4 text-xs">
				<span className="font-medium">{title}</span>
				{aside}
			</div>
			<div className="flex flex-1 flex-col justify-between gap-3 px-4 pb-4">{children}</div>
		</div>
	);
}

function Performance({ s }: { s: RangeStats }) {
	return (
		<Card title="Performance" aside={<span className="text-fg-muted">{s.long}</span>}>
			<span className={cn("text-lg font-medium tabular-nums", pnlClass(s.pnl))}>
				{signedUsd(s.pnl)} <span className="text-xs font-normal text-fg-muted">PNL</span>
			</span>
			<div className="flex flex-col gap-2">
				<WinDots />
				<span className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs whitespace-nowrap tabular-nums">
					<span className="text-market-up">{pct(account.winRate, 1)} win rate</span>
					<span className="text-fg-muted">
						{account.wins} of {account.closed} closing fills
					</span>
				</span>
			</div>
		</Card>
	);
}

function Leverage() {
	return (
		<Card title="Leverage" aside={<span className="text-fg-muted">{account.setLeverage}x set</span>}>
			<span className="text-lg font-medium tabular-nums">{account.leverage.toFixed(2)}x</span>
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
			<span className="text-lg font-medium tabular-nums">{pct(account.marginUsage)}</span>
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
			<span className="flex items-center gap-1.5 text-lg font-medium">
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

function strip(s: RangeStats) {
	return [
		{ label: `Volume ${s.label}`, value: usdCompact(s.volume) },
		{ label: "Max drawdown", value: `${pct(s.drawdownPct)} (${usdCompact(s.drawdown)})` },
		{ label: `Perps PNL ${s.label}`, value: signedUsd(s.perpPnl), tone: pnlClass(s.perpPnl) },
		{ label: "Unrealized PNL", value: signedUsd(account.unrealized), tone: pnlClass(account.unrealized) },
		{ label: `Fees, last ${account.feeFills} fills`, value: usd(account.fees) },
		{ label: "Notional", value: usd(account.notional) },
		{ label: "Total equity", value: usd(account.value) },
	];
}

export function V3Desktop({ tab = "positions" }: VariantProps) {
	const c = useChartState();
	const s = rangeStats(c.range);
	return (
		<div className="mx-auto flex w-full max-w-[1440px] flex-col gap-2 px-8 pt-8 pb-10">
			<TopDesktop c={c} />
			<div key={c.range} className={cn("flex flex-col gap-2", enter)}>
				<div className="grid grid-cols-2 grid-rows-2 gap-2">
					<Performance s={s} />
					<Leverage />
					<Margin />
					<Bias />
				</div>
				<div className="grid grid-cols-7 rounded-8 bg-surface py-4">
					{strip(s).map((r) => (
						<span key={r.label} className="flex flex-col gap-1 px-4">
							<span className="text-xs text-fg-muted">{r.label}</span>
							<span className={cn("text-sm font-medium tabular-nums", r.tone)}>{r.value}</span>
						</span>
					))}
				</div>
			</div>
			<TabPanel tab={tab} />
		</div>
	);
}

export function V3Mobile({ tab = "positions" }: VariantProps) {
	const c = useChartState();
	const s = rangeStats(c.range);
	return (
		<div className="flex flex-col pb-6">
			<TopMobile c={c} />
			<div key={c.range} className={cn("mt-2 flex flex-col gap-2 px-2", enter)}>
				<Performance s={s} />
				<div className="grid grid-cols-2 gap-2">
					<Leverage />
					<Margin />
				</div>
				<Bias />
				<div className="flex flex-col rounded-8 bg-surface px-4 py-2">
					{strip(s).map((r) => (
						<span key={r.label} className="flex h-9 items-center justify-between text-xs tabular-nums">
							<span className="text-fg-muted">{r.label}</span>
							<span className={r.tone}>{r.value}</span>
						</span>
					))}
				</div>
			</div>
			<MobileTabs tab={tab} />
		</div>
	);
}
