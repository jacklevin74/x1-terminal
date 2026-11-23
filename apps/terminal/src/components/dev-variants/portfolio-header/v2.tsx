import { Actions, RangeSwitch, SeriesSwitch } from "../portfolio/parts";
import {
	ADDRESS,
	account,
	cn,
	Identicon,
	lastOf,
	PortfolioChart,
	pnlClass,
	SHORT_ADDRESS,
	usd,
	useChartState,
} from "./common";

export function Header() {
	const c = useChartState();
	const v = lastOf(c.series, c.range);
	return (
		<div className="flex flex-col">
			<div className="flex items-center justify-between gap-8">
				<div className="flex items-center gap-3">
					<Identicon id={ADDRESS} className="size-10 rounded-8" />
					<div className="flex flex-col gap-0.5">
						<span className="text-lg leading-none font-semibold">Portfolio</span>
						<span className="text-xs text-fg-muted tabular-nums">
							{SHORT_ADDRESS} <span className="mx-1">Perps and spot</span> {usd(account.value)}
						</span>
					</div>
				</div>
				<Actions />
			</div>
			<section className="mt-6 flex flex-col gap-4 rounded-8 bg-surface p-4">
				<div className="flex items-center justify-between">
					<SeriesSwitch value={c.series} onChange={c.setSeries} size="xs" />
					<RangeSwitch value={c.range} onChange={c.setRange} size="xs" />
				</div>
				<span
					className={cn(
						"text-2xl leading-none font-semibold tabular-nums",
						c.series === "value" ? "text-fg" : pnlClass(v),
					)}
				>
					{c.series === "value" ? usd(v) : `${v >= 0 ? "+" : ""}${usd(v)}`}
				</span>
				<PortfolioChart series={c.series} range={c.range} height={180} />
			</section>
		</div>
	);
}
