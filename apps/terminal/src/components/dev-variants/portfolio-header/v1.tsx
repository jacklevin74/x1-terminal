import { Actions, RangeSwitch } from "../portfolio/parts";
import {
	AccountChip,
	account,
	cn,
	PortfolioChart,
	pnlClass,
	RANGES,
	rangeStats,
	SERIES,
	signedUsd,
	UnderlineTabs,
	usd,
	useChartState,
} from "./common";

export function Header() {
	const c = useChartState();
	const stats = rangeStats(c.range);
	const long = RANGES.find((r) => r.id === c.range)?.long;
	return (
		<div className="flex flex-col">
			<AccountChip />
			<div className="mt-3 flex items-end justify-between gap-8">
				<div className="flex flex-col gap-2">
					<span className="text-3xl leading-none font-semibold tracking-tight tabular-nums">{usd(account.value)}</span>
					<span className={cn("text-sm tabular-nums", pnlClass(stats.pnl))}>
						{signedUsd(stats.pnl)} <span className="text-fg-muted">{long}</span>
					</span>
				</div>
				<Actions />
			</div>
			<section className="mt-6 overflow-hidden rounded-8 bg-surface">
				<UnderlineTabs
					items={SERIES}
					value={c.series}
					onChange={c.setSeries}
					right={<RangeSwitch value={c.range} onChange={c.setRange} size="xs" />}
				/>
				<div className="p-4">
					<PortfolioChart series={c.series} range={c.range} height={200} />
				</div>
			</section>
		</div>
	);
}
