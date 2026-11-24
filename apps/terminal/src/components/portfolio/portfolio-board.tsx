import { Button } from "@hypeterminal/ui";
import { type ReactNode, useState } from "react";
import { cn } from "@/lib/cn";
import { pct, pnlClass, signedUsd, usd, usdCompact } from "@/lib/portfolio/format";
import { type PortfolioData, rangeStats } from "@/lib/portfolio/model";
import { WalletModal } from "../trade/components/wallet-modal";
import { enter, useChartState } from "./controls";
import { BiasBar, Meter, WinDots } from "./parts";
import { PortfolioTop } from "./portfolio-top";
import { TabPanel } from "./tab-panel";

interface Stat {
	label: string;
	value: ReactNode;
	tone?: string;
	extra?: ReactNode;
}

function stats(data: PortfolioData, range: Parameters<typeof rangeStats>[1]): Stat[] {
	const s = rangeStats(data.history, range);
	const a = data.account;
	const chart = data.loading.chart;
	const state = data.loading.summary;
	const fills = data.loading.history;
	return [
		{ label: `Perps PNL ${s.label}`, value: chart ? "-" : signedUsd(s.perpPnl), tone: pnlClass(s.perpPnl) },
		{ label: `Volume ${s.label}`, value: chart ? "-" : usd(s.volume) },
		{ label: "Unrealized PNL", value: state ? "-" : signedUsd(a.unrealized), tone: pnlClass(a.unrealized) },
		{
			label: "Max drawdown",
			value: chart ? (
				"-"
			) : (
				<>
					{pct(s.drawdownPct)} <span className="text-fg-muted">{usdCompact(s.drawdown)}</span>
				</>
			),
		},
		{ label: `Fees, last ${a.feeFills} fills`, value: fills ? "-" : usd(a.fees) },
		{
			label: "Win rate",
			value: fills ? (
				"-"
			) : (
				<>
					{pct(a.winRate, 1)}{" "}
					<span className="text-fg-muted">
						{a.wins}/{a.closed}
					</span>
				</>
			),
			extra: fills ? null : <WinDots outcomes={a.outcomes} className="w-40" />,
		},
		{
			label: "Leverage",
			value: state ? (
				"-"
			) : (
				<>
					{a.leverage.toFixed(2)}x{" "}
					<span className="text-fg-muted">
						{usdCompact(a.notional)} / {usdCompact(a.marginEquity)}
					</span>
				</>
			),
			extra: state ? null : <Meter value={a.setLeverage ? a.leverage / a.setLeverage : 0} className="w-12" />,
		},
		{
			label: "Margin usage",
			value: state ? (
				"-"
			) : (
				<>
					{pct(a.marginUsage)} <span className="text-fg-muted">{usdCompact(a.free)} free</span>
				</>
			),
			extra: state ? null : <Meter value={a.marginUsage} className="w-12" />,
		},
		{
			label: "Direction bias",
			value: state ? (
				"-"
			) : (
				<>
					{pct(a.longShare, 0)} long <span className="text-fg-muted">{a.bias}</span>
				</>
			),
			extra: state ? null : <BiasBar longShare={a.longShare} className="w-12" />,
		},
		{
			label: "Long / short",
			value: state ? (
				"-"
			) : (
				<>
					{usdCompact(a.longNotional)} <span className="text-fg-muted">/</span> {usdCompact(a.shortNotional)}
				</>
			),
		},
		{ label: "Margin used", value: state ? "-" : usd(a.marginUsed) },
		{ label: "Max leverage set", value: a.setLeverage === null ? "-" : `${a.setLeverage}x` },
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

function ConnectPrompt({ mobile }: { mobile?: boolean }) {
	const [open, setOpen] = useState(false);
	return (
		<section
			className={cn(
				"flex flex-col items-center gap-4 rounded-8 bg-surface p-10 text-center",
				mobile ? "mx-2 mt-4" : "mt-5",
			)}
		>
			<p className="text-sm text-fg-secondary">Connect a wallet to see your portfolio.</p>
			<Button variant="filled" intent="brand" size="md" onClick={() => setOpen(true)}>
				Connect Wallet
			</Button>
			<WalletModal open={open} onOpenChange={setOpen} />
		</section>
	);
}

interface Props {
	data: PortfolioData;
	connected: boolean;
	header?: ReactNode;
	readOnly?: boolean;
}

export function PortfolioBoard({ data, connected, header, readOnly }: Props) {
	const c = useChartState();
	const list = stats(data, c.range);
	const cols = [list.slice(0, 4), list.slice(4, 8), list.slice(8)];
	return (
		<div className="mx-auto flex w-full max-w-[1440px] flex-col gap-2 px-8 pt-8 pb-10">
			<div className="flex flex-col">
				{header ?? <h1 className="text-lg font-semibold">Portfolio</h1>}
				{connected ? <PortfolioTop c={c} data={data} readOnly={readOnly} /> : <ConnectPrompt />}
			</div>
			{connected && (
				<>
					<div key={c.range} className={cn("grid grid-cols-3 gap-2", enter)}>
						{cols.map((col) => (
							<div key={col[0].label} className="flex flex-col rounded-8 bg-surface py-1">
								{col.map((st) => (
									<StatRow key={st.label} stat={st} />
								))}
							</div>
						))}
					</div>
					<TabPanel data={data} readOnly={readOnly} />
				</>
			)}
		</div>
	);
}

export function PortfolioBoardMobile({ data, connected, header, readOnly }: Props) {
	const c = useChartState();
	const list = stats(data, c.range);
	return (
		<div className="flex flex-col pb-6">
			<div className="flex flex-col">
				{header ?? <h1 className="px-4 pt-6 text-lg font-semibold">Portfolio</h1>}
				{connected ? <PortfolioTop c={c} data={data} mobile readOnly={readOnly} /> : <ConnectPrompt mobile />}
			</div>
			{connected && (
				<>
					<div key={c.range} className={cn("mt-2 flex flex-col rounded-8 bg-surface py-1 mx-2", enter)}>
						{list.map((st) => (
							<StatRow key={st.label} stat={st} />
						))}
					</div>
					<TabPanel data={data} mobile readOnly={readOnly} />
				</>
			)}
		</div>
	);
}
