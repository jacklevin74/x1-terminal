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
	usd,
	useChartState,
} from "./common";

export function Header() {
	const c = useChartState();
	const stats = rangeStats(c.range);
	return (
		<div className="flex flex-col">
			<div className="flex items-end justify-between">
				<div className="flex flex-col gap-2">
					<h1 className="text-lg font-semibold">Portfolio</h1>
					<span className="text-xs text-fg-muted">Perps and spot, main account</span>
				</div>
				<Actions size="sm" />
			</div>
			<div className="mt-6 grid grid-cols-3 gap-8">
				<Stat label="Account value" value={usd(account.value)} />
				<Stat
					label={`PNL ${RANGES.find((r) => r.id === c.range)?.long}`}
					value={signedUsd(stats.pnl)}
					className={pnlClass(stats.pnl)}
				/>
				<Stat label="Withdrawable" value={usd(account.withdrawable)} />
			</div>
			<section className="mt-8 rounded-8 bg-surface p-6">
				<div className="flex items-center gap-1">
					<Dropdown items={SERIES} value={c.series} onChange={c.setSeries} align="start" />
					<span className="text-xs text-fg-muted">for</span>
					<Dropdown
						items={RANGES.map((r) => ({ id: r.id, label: r.long }))}
						value={c.range}
						onChange={c.setRange}
						align="start"
					/>
				</div>
				<div className="mt-5">
					<PortfolioChart series={c.series} range={c.range} height={170} />
				</div>
			</section>
		</div>
	);
}

function Stat({ label, value, className }: { label: string; value: string; className?: string }) {
	return (
		<div className="flex flex-col gap-2">
			<span className="text-xs text-fg-muted">{label}</span>
			<span className={cn("text-2xl leading-none font-semibold tracking-tight tabular-nums", className)}>{value}</span>
		</div>
	);
}
