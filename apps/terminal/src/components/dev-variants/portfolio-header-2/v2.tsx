import { Actions } from "../portfolio/parts";
import {
	account,
	cn,
	Dropdown,
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
			<h1 className="text-lg font-semibold">Portfolio</h1>
			<div className="mt-5 grid grid-cols-[340px_minmax(0,1fr)] gap-2">
				<section className="flex flex-col justify-between rounded-8 bg-surface p-6">
					<div className="flex flex-col gap-2">
						<span className="text-xs text-fg-muted">Account value</span>
						<span className="text-2xl leading-none font-semibold tracking-tight tabular-nums">
							{usd(account.value)}
						</span>
						<span className={cn("text-xs tabular-nums", pnlClass(stats.pnl))}>
							{signedUsd(stats.pnl)} <span className="text-fg-muted">{RANGES.find((r) => r.id === c.range)?.long}</span>
						</span>
					</div>
					<dl className="mt-6 flex flex-col gap-2 text-xs tabular-nums">
						<div className="flex justify-between">
							<dt className="text-fg-muted">Perps</dt>
							<dd>{usd(account.perpEquity)}</dd>
						</div>
						<div className="flex justify-between">
							<dt className="text-fg-muted">Spot</dt>
							<dd>{usd(account.spotEquity)}</dd>
						</div>
						<div className="flex justify-between">
							<dt className="text-fg-muted">Withdrawable</dt>
							<dd>{usd(account.withdrawable)}</dd>
						</div>
					</dl>
					<Actions size="sm" fullWidth className="mt-6" />
				</section>
				<section className="flex flex-col rounded-8 bg-surface p-6">
					<div className="flex items-center justify-between">
						<TextToggle items={SERIES} value={c.series} onChange={c.setSeries} />
						<Dropdown items={RANGES.map((r) => ({ id: r.id, label: r.long }))} value={c.range} onChange={c.setRange} />
					</div>
					<div className="mt-6">
						<PortfolioChart series={c.series} range={c.range} height={176} />
					</div>
				</section>
			</div>
		</div>
	);
}
