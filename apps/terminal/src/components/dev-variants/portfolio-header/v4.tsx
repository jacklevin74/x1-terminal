import { useState } from "react";
import { Actions, RangeSwitch } from "../portfolio/parts";
import {
	AccountChip,
	account,
	cn,
	PortfolioChart,
	pnlClass,
	rangeStats,
	SERIES,
	signedUsd,
	UnderlineTabs,
	usd,
	useChartState,
} from "./common";

const PAGE = [
	{ id: "overview", label: "Overview" },
	{ id: "positions", label: "Positions" },
	{ id: "history", label: "History" },
	{ id: "transfers", label: "Transfers" },
] as const;

export function Header() {
	const c = useChartState();
	const [page, setPage] = useState<(typeof PAGE)[number]["id"]>("overview");
	const stats = rangeStats(c.range);
	return (
		<div className="flex flex-col">
			<h1 className="text-lg font-semibold">Portfolio</h1>
			<div className="mt-4 flex h-10 items-stretch justify-between border-b border-stroke-weak">
				<span className="flex gap-6">
					{PAGE.map((p) => (
						<button
							key={p.id}
							type="button"
							onClick={() => setPage(p.id)}
							className={cn(
								"relative text-xs transition-colors",
								page === p.id ? "text-fg" : "text-fg-muted hover:text-fg-secondary",
							)}
						>
							{p.label}
							{page === p.id && <span className="absolute inset-x-0 -bottom-px h-0.5 bg-fg" />}
						</button>
					))}
				</span>
				<AccountChip className="self-center" />
			</div>
			<div className="mt-4 grid grid-cols-[320px_minmax(0,1fr)] gap-2">
				<section className="flex flex-col justify-between rounded-8 bg-surface p-5">
					<div className="flex flex-col gap-2">
						<span className="text-xs text-fg-muted">Account value</span>
						<span className="text-2xl leading-none font-semibold tracking-tight tabular-nums">
							{usd(account.value)}
						</span>
						<span className={cn("text-xs tabular-nums", pnlClass(stats.pnl))}>{signedUsd(stats.pnl)} this range</span>
					</div>
					<Actions size="sm" fullWidth className="mt-6" />
				</section>
				<section className="overflow-hidden rounded-8 bg-surface">
					<UnderlineTabs
						items={SERIES}
						value={c.series}
						onChange={c.setSeries}
						right={<RangeSwitch value={c.range} onChange={c.setRange} size="xs" />}
					/>
					<div className="p-4">
						<PortfolioChart series={c.series} range={c.range} height={160} />
					</div>
				</section>
			</div>
		</div>
	);
}
