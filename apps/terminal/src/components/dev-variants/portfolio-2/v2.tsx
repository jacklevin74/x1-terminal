import { cn } from "@/lib/cn";
import { account, pct, pnlClass, type RangeStats, rangeStats, signedUsd, usd, usdCompact } from "../portfolio/data";
import { BiasBar, Meter, WinDots } from "../portfolio/parts";
import { enter, MobileTabs, TabPanel, useChartState, type VariantProps } from "./common";
import { TopDesktop, TopMobile } from "./top";

function cells(s: RangeStats) {
	return [
		{ label: `Volume ${s.long}`, value: usdCompact(s.volume), sub: usd(s.volume) },
		{ label: "Max drawdown", value: pct(s.drawdownPct), sub: usd(s.drawdown) },
		{
			label: "Unrealized PNL",
			value: signedUsd(account.unrealized),
			tone: pnlClass(account.unrealized),
			sub: `Perps PNL ${s.label} ${signedUsd(s.perpPnl, true)}`,
		},
		{ label: "Fees", value: usd(account.fees), sub: `Last ${account.feeFills} fills` },
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
					<span>
						{pct(account.longShare, 0)} long {usdCompact(account.longNotional)}
					</span>
					<span>
						{usdCompact(account.shortNotional)} short {pct(1 - account.longShare, 0)}
					</span>
				</span>
			</div>
		</>
	);
}

export function V2Desktop({ tab = "positions" }: VariantProps) {
	const c = useChartState();
	const s = rangeStats(c.range);
	return (
		<div className="mx-auto flex w-full max-w-[1440px] flex-col gap-2 px-8 pt-8 pb-10">
			<TopDesktop c={c} />
			<div key={c.range} className={cn("grid grid-cols-4 gap-px overflow-hidden rounded-8 bg-background", enter)}>
				{cells(s).map((x) => (
					<Cell key={x.label} {...x} />
				))}
				<TraderCells />
			</div>
			<TabPanel tab={tab} />
		</div>
	);
}

export function V2Mobile({ tab = "positions" }: VariantProps) {
	const c = useChartState();
	const s = rangeStats(c.range);
	return (
		<div className="flex flex-col pb-6">
			<TopMobile c={c} />
			<div key={c.range} className={cn("mt-2 flex flex-col gap-2 px-2", enter)}>
				<div className="grid grid-cols-2 gap-px overflow-hidden rounded-8 bg-background">
					{cells(s).map((x) => (
						<Cell key={x.label} {...x} />
					))}
				</div>
				<div className="grid grid-cols-1 gap-px overflow-hidden rounded-8 bg-background">
					<TraderCells />
				</div>
			</div>
			<MobileTabs tab={tab} />
		</div>
	);
}
