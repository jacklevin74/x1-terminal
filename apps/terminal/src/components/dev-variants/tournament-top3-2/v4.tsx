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
		<article className="flex flex-col rounded-8 bg-surface p-6">
			<div className="flex items-end gap-4">
				<span className="relative">
					<Identicon id={r.address} className="size-16 rounded-8" />
					<span
						className={cn(
							"absolute -right-2 -bottom-2 grid size-7 place-items-center rounded-6 text-sm font-bold tabular-nums ring-4 ring-surface",
							r.rank === 1 ? "bg-fill text-fg-inverse" : "bg-control-hover text-fg",
						)}
					>
						{r.rank}
					</span>
				</span>
				<div className="flex min-w-0 flex-1 flex-col gap-1 pb-1">
					<span className="truncate text-base">{traderName(r)}</span>
					<span className="text-xs text-fg-muted tabular-nums">Account {usdCompact(r.accountValue)}</span>
				</div>
			</div>
			<div className="mt-7 flex items-end justify-between gap-4 tabular-nums">
				<div className="flex flex-col gap-1">
					<span className={cn("text-2xl leading-none font-semibold", pnlClass(r.pnl))}>{signedUsd(r.pnl)}</span>
					<span className="text-xs text-fg-muted">
						Round PNL, <span className={pnlClass(r.dayPnl)}>{signedUsd(r.dayPnl, true)}</span> today
					</span>
				</div>
				<div className="flex flex-col items-end gap-1">
					<span className="text-lg leading-none font-semibold text-fg">{usd(prizeFor(tier, r.rank))}</span>
					<span className="text-xs text-fg-muted">Prize</span>
				</div>
			</div>
			<div className="mt-6">
				<PnlChart values={path(r)} height={88} labels />
			</div>
		</article>
	);
}
