import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import { account, pct, pnlClass, type RangeStats, rangeStats, signedUsd, usd, usdCompact } from "../portfolio/data";
import { BiasBar, Meter, WinDots } from "../portfolio/parts";
import { enter, MobileTabs, TabPanel, useChartState, type VariantProps } from "./common";
import { TopDesktop, TopMobile } from "./top";

interface Stat {
	label: string;
	value: ReactNode;
	tone?: string;
	extra?: ReactNode;
}

function stats(s: RangeStats): Stat[] {
	return [
		{ label: `Perps PNL ${s.label}`, value: signedUsd(s.perpPnl), tone: pnlClass(s.perpPnl) },
		{ label: `Volume ${s.label}`, value: usd(s.volume) },
		{ label: "Unrealized PNL", value: signedUsd(account.unrealized), tone: pnlClass(account.unrealized) },
		{
			label: "Max drawdown",
			value: (
				<>
					{pct(s.drawdownPct)} <span className="text-fg-muted">{usdCompact(s.drawdown)}</span>
				</>
			),
		},
		{ label: `Fees, last ${account.feeFills} fills`, value: usd(account.fees) },
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
			extra: <WinDots className="w-40" />,
		},
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
			value: (
				<>
					{pct(account.marginUsage)} <span className="text-fg-muted">{usdCompact(account.free)} free</span>
				</>
			),
			extra: <Meter value={account.marginUsage} className="w-12" />,
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
		{ label: "Margin used", value: usd(account.marginUsed) },
		{ label: `Max leverage set`, value: `${account.setLeverage}x` },
	];
}

function StatRow({ stat }: { stat: Stat }) {
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

export function V5Desktop({ tab = "positions" }: VariantProps) {
	const c = useChartState();
	const list = stats(rangeStats(c.range));
	const cols = [list.slice(0, 4), list.slice(4, 8), list.slice(8)];
	return (
		<div className="mx-auto flex w-full max-w-[1440px] flex-col gap-2 px-8 pt-8 pb-10">
			<TopDesktop c={c} />
			<div key={c.range} className={cn("grid grid-cols-3 gap-2", enter)}>
				{cols.map((col) => (
					<div key={col[0].label} className="flex flex-col rounded-8 bg-surface py-1">
						{col.map((st) => (
							<StatRow key={st.label} stat={st} />
						))}
					</div>
				))}
			</div>
			<TabPanel tab={tab} dense />
		</div>
	);
}

export function V5Mobile({ tab = "positions" }: VariantProps) {
	const c = useChartState();
	const list = stats(rangeStats(c.range));
	return (
		<div className="flex flex-col pb-6">
			<TopMobile c={c} />
			<div key={c.range} className={cn("mt-2 flex flex-col rounded-8 bg-surface py-1 mx-2", enter)}>
				{list.map((st) => (
					<StatRow key={st.label} stat={st} />
				))}
			</div>
			<MobileTabs tab={tab} dense />
		</div>
	);
}
