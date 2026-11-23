import { Actions } from "../portfolio/parts";
import {
	ADDRESS,
	account,
	cn,
	Identicon,
	PortfolioChart,
	pnlClass,
	RANGES,
	rangeLong,
	rangeStats,
	SERIES,
	SHORT_ADDRESS,
	signedUsd,
	TextToggle,
	usd,
	useChartState,
} from "./common";

export function Header() {
	const c = useChartState();
	const stats = rangeStats(c.range);
	return (
		<div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1.6fr)] gap-x-12">
			<div className="flex flex-col">
				<span className="flex items-center gap-2 text-xs text-fg-muted tabular-nums">
					<Identicon id={ADDRESS} className="size-5 rounded-4" />
					{SHORT_ADDRESS}
				</span>
				<span className="mt-6 text-xs text-fg-muted">Account value</span>
				<span className="mt-2 text-3xl leading-none font-semibold tracking-tight tabular-nums">
					{usd(account.value)}
				</span>
				<span className={cn("mt-3 text-sm tabular-nums", pnlClass(stats.pnl))}>
					{signedUsd(stats.pnl)} <span className="text-fg-muted">{rangeLong(c.range)}</span>
				</span>
				<dl className="mt-8 grid grid-cols-2 gap-x-8 gap-y-4 text-xs tabular-nums">
					<div className="flex flex-col gap-1">
						<dt className="text-fg-muted">Perps</dt>
						<dd className="text-sm">{usd(account.perpEquity)}</dd>
					</div>
					<div className="flex flex-col gap-1">
						<dt className="text-fg-muted">Spot</dt>
						<dd className="text-sm">{usd(account.spotEquity)}</dd>
					</div>
					<div className="flex flex-col gap-1">
						<dt className="text-fg-muted">Withdrawable</dt>
						<dd className="text-sm">{usd(account.withdrawable)}</dd>
					</div>
					<div className="flex flex-col gap-1">
						<dt className="text-fg-muted">Unrealized</dt>
						<dd className={cn("text-sm", pnlClass(account.unrealized))}>{signedUsd(account.unrealized)}</dd>
					</div>
				</dl>
				<Actions size="sm" className="mt-8" />
			</div>
			<div className="flex flex-col pt-1">
				<div className="flex items-center justify-between">
					<TextToggle items={SERIES} value={c.series} onChange={c.setSeries} />
					<TextToggle items={RANGES} value={c.range} onChange={c.setRange} />
				</div>
				<div className="mt-6">
					<PortfolioChart series={c.series} range={c.range} height={260} />
				</div>
			</div>
		</div>
	);
}
