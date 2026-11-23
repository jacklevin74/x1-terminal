import {
	path,
	pnlClass,
	prizeFor,
	signedUsd,
	type Tier,
	type Trader,
	traderName,
	usd,
	usdCompact,
} from "@/components/tournament/data";
import { Identicon } from "@/components/tournament/parts";
import { PnlChart } from "@/components/tournament/pnl-chart";
import { cn } from "@/lib/cn";

interface Props {
	tier: Tier;
	className?: string;
}

export function TopThree({ tier, className }: Props) {
	return (
		<section className={cn("grid grid-cols-3 gap-2", className)}>
			{tier.traders.slice(0, 3).map((r) => (
				<Card key={r.address} r={r} tier={tier} />
			))}
		</section>
	);
}

function Card({ r, tier }: { r: Trader; tier: Tier }) {
	return (
		<article className="flex flex-col overflow-hidden rounded-8 bg-surface">
			<div className="flex items-center justify-between px-5 pt-4">
				<span className={cn("text-sm font-semibold tabular-nums", r.rank === 1 ? "text-fg" : "text-fg-muted")}>
					#{r.rank}
				</span>
				<span className={cn("text-xs tabular-nums", pnlClass(r.dayPnl))}>{signedUsd(r.dayPnl, true)} today</span>
			</div>
			<div className="px-5 pt-3">
				<PnlChart values={path(r)} height={120} labels />
			</div>
			<div className="mt-2 flex items-center gap-3 bg-control px-5 py-4">
				<Identicon id={r.address} className="size-9 rounded-4" />
				<div className="flex min-w-0 flex-1 flex-col gap-0.5">
					<span className="truncate text-sm">{traderName(r)}</span>
					<span className="text-xs text-fg-muted tabular-nums">Account {usdCompact(r.accountValue)}</span>
				</div>
				<div className="flex flex-col items-end gap-0.5 tabular-nums">
					<span className={cn("text-lg leading-none font-semibold", pnlClass(r.pnl))}>{signedUsd(r.pnl)}</span>
					<span className="text-xs text-fg-muted">
						Prize <span className="text-fg">{usd(prizeFor(tier, r.rank))}</span>
					</span>
				</div>
			</div>
		</article>
	);
}
