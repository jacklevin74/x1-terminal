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
		<div className="flex flex-col">
			<div className="flex items-center justify-between">
				<span className="flex items-center gap-2 text-xs text-fg-muted tabular-nums">
					<Identicon id={ADDRESS} className="size-5 rounded-4" />
					{SHORT_ADDRESS}
				</span>
				<TextToggle items={SERIES} value={c.series} onChange={c.setSeries} />
			</div>
			<span className="mt-4 text-3xl leading-none font-semibold tracking-tight tabular-nums">{usd(account.value)}</span>
			<span className={cn("mt-2 text-sm tabular-nums", pnlClass(stats.pnl))}>
				{signedUsd(stats.pnl)} <span className="text-fg-muted">{rangeLong(c.range)}</span>
			</span>
			<div className="mt-6">
				<PortfolioChart series={c.series} range={c.range} height={220} axis="none" />
			</div>
			<div className="mt-4 flex items-center justify-between">
				<TextToggle items={RANGES} value={c.range} onChange={c.setRange} size="sm" />
				<Actions size="sm" />
			</div>
		</div>
	);
}
