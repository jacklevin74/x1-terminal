import { Actions } from "../portfolio/parts";
import {
	account,
	cn,
	PortfolioChart,
	pnlClass,
	RANGES,
	rangeStats,
	SERIES,
	signedUsd,
	TextToggle,
	usd,
	useChartState,
} from "./common";

export function Header() {
	const c = useChartState();
	const stats = rangeStats(c.range);
	return (
		<div className="flex flex-col">
			<div className="flex items-center justify-between gap-8">
				<h1 className="text-lg font-semibold">Portfolio</h1>
				<Actions />
			</div>
			<section className="mt-6 flex flex-col rounded-8 bg-surface p-5">
				<div className="flex items-start justify-between gap-8">
					<div className="flex flex-col gap-2">
						<span className="text-xs text-fg-muted">{SERIES.find((s) => s.id === c.series)?.label}</span>
						<span className="text-3xl leading-none font-semibold tracking-tight tabular-nums">
							{usd(account.value)}
						</span>
						<span className={cn("text-xs tabular-nums", pnlClass(stats.pnl))}>
							{signedUsd(stats.pnl)} <span className="text-fg-muted">{RANGES.find((r) => r.id === c.range)?.long}</span>
						</span>
					</div>
					<TextToggle items={SERIES} value={c.series} onChange={c.setSeries} />
				</div>
				<div className="mt-5">
					<PortfolioChart series={c.series} range={c.range} height={180} />
				</div>
				<TextToggle items={RANGES} value={c.range} onChange={c.setRange} className="mt-3 justify-end" />
			</section>
		</div>
	);
}
