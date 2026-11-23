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
import { Identicon, Spark } from "@/components/tournament/parts";
import { cn } from "@/lib/cn";

interface Props {
	tier: Tier;
	className?: string;
}

export function TopThree({ tier, className }: Props) {
	return (
		<section className={cn("grid grid-cols-3 gap-2", className)}>
			{tier.traders.slice(0, 3).map((r) => (
				<Cell key={r.address} r={r} tier={tier} />
			))}
		</section>
	);
}

function Cell({ r, tier }: { r: Trader; tier: Tier }) {
	return (
		<article className="flex h-16 items-center gap-3 rounded-8 bg-surface px-4">
			<span className={cn("w-4 text-base font-semibold tabular-nums", r.rank === 1 ? "text-fg" : "text-fg-muted")}>
				{r.rank}
			</span>
			<Identicon id={r.address} className="size-8 rounded-4" />
			<div className="flex min-w-0 flex-1 flex-col gap-0.5">
				<span className="truncate text-sm">{traderName(r)}</span>
				<span className="text-xs whitespace-nowrap text-fg-muted tabular-nums">
					Prize <span className="text-fg">{usd(prizeFor(tier, r.rank))}</span>
					<span className="ml-2">Acct</span> {usdCompact(r.accountValue)}
				</span>
			</div>
			<Spark values={path(r)} width={64} height={22} />
			<div className="flex flex-col items-end gap-0.5 tabular-nums">
				<span className={cn("text-base leading-none font-semibold", pnlClass(r.pnl))}>{signedUsd(r.pnl)}</span>
				<span className={cn("text-xs", pnlClass(r.dayPnl))}>{signedUsd(r.dayPnl, true)} 24h</span>
			</div>
		</article>
	);
}
