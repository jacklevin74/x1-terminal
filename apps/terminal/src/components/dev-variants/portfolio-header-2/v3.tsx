import { Actions } from "../portfolio/parts";
import {
	ADDRESS,
	account,
	cn,
	Identicon,
	lastOf,
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

const TILES: { id: "value" | "pnl" | "perp"; label: string }[] = SERIES;

export function Header() {
	const c = useChartState();
	const stats = rangeStats(c.range);
	const tileValue = (id: "value" | "pnl" | "perp") =>
		id === "value" ? usd(account.value) : signedUsd(lastOf(id, c.range));
	return (
		<div className="flex flex-col">
			<div className="flex items-center justify-between">
				<span className="flex items-center gap-3">
					<h1 className="text-lg font-semibold">Portfolio</h1>
					<span className="flex items-center gap-1.5 text-xs text-fg-muted tabular-nums">
						<Identicon id={ADDRESS} className="size-4 rounded-xs" />
						{SHORT_ADDRESS}
					</span>
				</span>
				<Actions size="sm" />
			</div>
			<div className="mt-5 grid grid-cols-3 gap-2">
				{TILES.map((t) => {
					const on = c.series === t.id;
					return (
						<button
							key={t.id}
							type="button"
							onClick={() => c.setSeries(t.id)}
							className={cn(
								"flex flex-col gap-2 rounded-8 p-5 text-left transition-colors",
								on ? "bg-control-hover" : "bg-surface hover:bg-control",
							)}
						>
							<span className="text-xs text-fg-muted">
								{t.label}
								{t.id !== "value" && <span className="ml-1">{rangeLong(c.range)}</span>}
							</span>
							<span
								className={cn(
									"text-2xl leading-none font-semibold tracking-tight tabular-nums",
									t.id === "value" ? "text-fg" : pnlClass(lastOf(t.id, c.range)),
								)}
							>
								{tileValue(t.id)}
							</span>
						</button>
					);
				})}
			</div>
			<section className="mt-2 rounded-8 bg-surface p-6">
				<PortfolioChart series={c.series} range={c.range} height={180} />
				<div className="mt-5 flex items-center justify-between">
					<span className={cn("text-xs tabular-nums", pnlClass(stats.pnl))}>
						{signedUsd(stats.pnl)} <span className="text-fg-muted">{rangeLong(c.range)}</span>
					</span>
					<TextToggle items={RANGES} value={c.range} onChange={c.setRange} />
				</div>
			</section>
		</div>
	);
}
