import { cn } from "@/lib/cn";
import { account, pct, pnlClass, type RangeStats, rangeStats, signedUsd, usd, usdCompact } from "../portfolio/data";
import { BiasBar, Meter, WinDots } from "../portfolio/parts";
import { enter, MobileTabs, TabPanel, useChartState, type VariantProps } from "./common";
import { TopDesktop, TopMobile } from "./top";

function statRows(s: RangeStats) {
	return [
		{ label: `Volume ${s.long}`, value: usd(s.volume) },
		{ label: `Fees, last ${account.feeFills} fills`, value: usd(account.fees) },
		{ label: "Max drawdown", value: `${pct(s.drawdownPct)} (${usdCompact(s.drawdown)})` },
		{ label: `Perps PNL ${s.long}`, value: signedUsd(s.perpPnl), tone: pnlClass(s.perpPnl) },
		{ label: "Unrealized PNL", value: signedUsd(account.unrealized), tone: pnlClass(account.unrealized) },
		{ label: "Total equity", value: usd(account.value) },
	];
}

function StatList({ s, mobile }: { s: RangeStats; mobile?: boolean }) {
	return (
		<section className={cn("flex flex-col rounded-8 bg-surface", mobile ? "px-4 py-2" : "px-6 py-4")}>
			{statRows(s).map((r) => (
				<div
					key={r.label}
					className={cn("flex items-center justify-between text-xs tabular-nums", mobile ? "h-9" : "h-8")}
				>
					<span className="text-fg-muted">{r.label}</span>
					<span className={r.tone ?? "text-fg"}>{r.value}</span>
				</div>
			))}
		</section>
	);
}

function TraderCard({ mobile }: { mobile?: boolean }) {
	return (
		<section className={cn("flex flex-col justify-between gap-6 rounded-8 bg-surface", mobile ? "p-4" : "p-6")}>
			<div className="flex flex-col gap-3">
				<div className="flex items-baseline justify-between">
					<span className="text-xs text-fg-muted">Win rate</span>
					<span className="text-sm font-medium tabular-nums">{pct(account.winRate, 1)}</span>
				</div>
				<WinDots />
				<span className="text-2xs text-fg-muted tabular-nums">
					{account.wins} of {account.closed} closing fills in profit
				</span>
			</div>
			<div className={cn("grid gap-x-8 gap-y-5 text-xs tabular-nums", mobile ? "grid-cols-2" : "grid-cols-3")}>
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
				<span className={cn("flex flex-col gap-1.5", mobile && "col-span-2")}>
					<span className="flex justify-between">
						<span className="text-fg-muted">Direction bias</span>
						<span>{account.bias}</span>
					</span>
					<span>{pct(account.longShare, 0)} long</span>
					<BiasBar />
					<span className="flex justify-between text-2xs text-fg-muted">
						<span>{usdCompact(account.longNotional)} long</span>
						<span>{usdCompact(account.shortNotional)} short</span>
					</span>
				</span>
			</div>
		</section>
	);
}

export function V1Desktop({ tab = "positions" }: VariantProps) {
	const c = useChartState();
	const s = rangeStats(c.range);
	return (
		<div className="mx-auto flex w-full max-w-[1440px] flex-col gap-2 px-8 pt-8 pb-10">
			<TopDesktop c={c} />
			<div key={c.range} className={cn("grid grid-cols-[340px_minmax(0,1fr)] gap-2", enter)}>
				<StatList s={s} />
				<TraderCard />
			</div>
			<TabPanel tab={tab} />
		</div>
	);
}

export function V1Mobile({ tab = "positions" }: VariantProps) {
	const c = useChartState();
	const s = rangeStats(c.range);
	return (
		<div className="flex flex-col pb-6">
			<TopMobile c={c} />
			<div key={c.range} className={cn("mt-2 flex flex-col gap-2 px-2", enter)}>
				<StatList s={s} mobile />
				<TraderCard mobile />
			</div>
			<MobileTabs tab={tab} />
		</div>
	);
}
