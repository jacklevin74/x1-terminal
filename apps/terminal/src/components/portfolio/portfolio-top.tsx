import { cn } from "@/lib/cn";
import { pnlClass, signedUsd, usd } from "@/lib/portfolio/format";
import { type PortfolioData, RANGES, rangeStats, SERIES, seriesFor } from "@/lib/portfolio/model";
import { type ChartState, Dropdown, TextToggle } from "./controls";
import { Actions } from "./parts";
import { PortfolioChart } from "./portfolio-chart";

interface SummaryProps {
	c: ChartState;
	data: PortfolioData;
	mobile?: boolean;
}

function Summary({ c, data, mobile }: SummaryProps) {
	const stats = rangeStats(data.history, c.range);
	const { account, loading } = data;
	return (
		<section className={cn("flex flex-col justify-between rounded-8 bg-surface", mobile ? "p-4" : "p-6")}>
			<div className="flex flex-col gap-2">
				<span className="text-xs text-fg-muted">Account value</span>
				{loading.summary ? (
					<span className="h-9 w-48 animate-pulse rounded-4 bg-control motion-reduce:animate-none" />
				) : (
					<span className="text-2xl leading-none font-semibold tracking-tight tabular-nums">{usd(account.value)}</span>
				)}
				<span className={cn("text-xs tabular-nums", pnlClass(stats.pnl))}>
					{loading.chart ? "-" : signedUsd(stats.pnl)}{" "}
					<span className="text-fg-muted">{RANGES.find((r) => r.id === c.range)?.long}</span>
				</span>
			</div>
			<dl className="mt-6 flex flex-col gap-2 text-xs tabular-nums">
				<div className="flex justify-between">
					<dt className="text-fg-muted">Perps</dt>
					<dd>{loading.summary ? "-" : usd(account.perpEquity)}</dd>
				</div>
				<div className="flex justify-between">
					<dt className="text-fg-muted">Spot</dt>
					<dd>{loading.summary ? "-" : usd(account.spotEquity)}</dd>
				</div>
				<div className="flex justify-between">
					<dt className="text-fg-muted">Withdrawable</dt>
					<dd>{loading.summary ? "-" : usd(account.withdrawable)}</dd>
				</div>
			</dl>
			<Actions size={mobile ? "md" : "sm"} className="mt-6" />
		</section>
	);
}

interface ChartProps {
	c: ChartState;
	data: PortfolioData;
	height: number;
	mobile?: boolean;
}

function ChartCard({ c, data, height, mobile }: ChartProps) {
	return (
		<section className={cn("flex flex-col rounded-8 bg-surface", mobile ? "p-4" : "p-6")}>
			<div className="flex items-center justify-between">
				<TextToggle items={SERIES} value={c.series} onChange={c.setSeries} />
				<Dropdown items={RANGES.map((r) => ({ id: r.id, label: r.long }))} value={c.range} onChange={c.setRange} />
			</div>
			<div className={mobile ? "mt-4" : "mt-6"}>
				<PortfolioChart
					points={seriesFor(data.history, c.series, c.range)}
					series={c.series}
					range={c.range}
					height={height}
					loading={data.loading.chart}
				/>
			</div>
		</section>
	);
}

interface Props {
	c: ChartState;
	data: PortfolioData;
	mobile?: boolean;
}

export function PortfolioTop({ c, data, mobile }: Props) {
	if (mobile)
		return (
			<div className="mt-4 flex flex-col gap-2 px-2">
				<Summary c={c} data={data} mobile />
				<ChartCard c={c} data={data} height={180} mobile />
			</div>
		);
	return (
		<div className="mt-5 grid grid-cols-[340px_minmax(0,1fr)] gap-2">
			<Summary c={c} data={data} />
			<ChartCard c={c} data={data} height={176} />
		</div>
	);
}
