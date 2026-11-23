import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import { account, pct, pnlClass, type RangeStats, rangeStats, signedUsd, usd, usdCompact } from "../portfolio/data";
import { BiasBar, Meter, WinDots } from "../portfolio/parts";
import { enter, MobileTabs, TabPanel, useChartState, type VariantProps } from "./common";
import { TopDesktop, TopMobile } from "./top";

interface RowProps {
	label: string;
	children: ReactNode;
	tone?: string;
	extra?: ReactNode;
}

function Row({ label, children, tone, extra }: RowProps) {
	return (
		<div className="flex items-center justify-between gap-3">
			<dt className="shrink-0 text-fg-muted">{label}</dt>
			<dd className="flex min-w-0 items-center gap-2">
				{extra}
				<span className={cn("truncate text-right", tone)}>{children}</span>
			</dd>
		</div>
	);
}

function Ledger({ s }: { s: RangeStats }) {
	return (
		<dl key={s.range} className={cn("mt-6 flex flex-col gap-2 text-xs tabular-nums", enter)}>
			<Row label={`Volume ${s.long}`}>{usd(s.volume)}</Row>
			<Row label={`Fees, last ${account.feeFills} fills`}>{usd(account.fees)}</Row>
			<Row label="Max drawdown">
				{pct(s.drawdownPct)} <span className="text-fg-muted">{usdCompact(s.drawdown)}</span>
			</Row>
			<Row label="Unrealized PNL" tone={pnlClass(account.unrealized)}>
				{signedUsd(account.unrealized)}
			</Row>
			<Row label="Win rate">
				{pct(account.winRate, 1)}{" "}
				<span className="text-fg-muted">
					{account.wins} of {account.closed}
				</span>
			</Row>
			<WinDots className="mb-1" />
			<Row label="Leverage" extra={<Meter value={account.leverage / account.setLeverage} className="w-12" />}>
				{account.leverage.toFixed(2)}x
			</Row>
			<Row label="Margin usage" extra={<Meter value={account.marginUsage} className="w-12" />}>
				{pct(account.marginUsage)}
			</Row>
			<Row label="Direction bias" extra={<BiasBar className="w-12" />}>
				{pct(account.longShare, 0)} long <span className="text-fg-muted">{account.bias}</span>
			</Row>
		</dl>
	);
}

export function V4Desktop({ tab = "positions" }: VariantProps) {
	const c = useChartState();
	const s = rangeStats(c.range);
	return (
		<div className="mx-auto flex w-full max-w-[1440px] flex-col gap-2 px-8 pt-8 pb-10">
			<TopDesktop c={c} ledger={<Ledger s={s} />} fill />
			<TabPanel tab={tab} />
		</div>
	);
}

export function V4Mobile({ tab = "positions" }: VariantProps) {
	const c = useChartState();
	const s = rangeStats(c.range);
	return (
		<div className="flex flex-col pb-6">
			<TopMobile c={c} ledger={<Ledger s={s} />} />
			<MobileTabs tab={tab} />
		</div>
	);
}
