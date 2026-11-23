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

const PLACE = ["1st", "2nd", "3rd"];

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
		<article className="flex gap-5 rounded-8 bg-surface p-5">
			<Identicon id={r.address} className="size-[120px] flex-none rounded-8" />
			<div className="flex min-w-0 flex-1 flex-col">
				<span className={cn("text-xs font-semibold", r.rank === 1 ? "text-fg" : "text-fg-muted")}>
					{PLACE[r.rank - 1]}
				</span>
				<span className="mt-1 truncate text-base">{traderName(r)}</span>
				<span className={cn("mt-3 text-2xl leading-none font-semibold tabular-nums", pnlClass(r.pnl))}>
					{signedUsd(r.pnl)}
				</span>
				<div className="mt-auto flex items-end justify-between gap-3 pt-3">
					<span className="flex flex-col gap-0.5 text-xs text-fg-muted tabular-nums">
						<span>
							Prize <span className="text-fg">{usd(prizeFor(tier, r.rank))}</span>
						</span>
						<span>
							{usdCompact(r.accountValue)} <span className="mx-0.5">acct</span>
							<span className={pnlClass(r.dayPnl)}>{signedUsd(r.dayPnl, true)}</span> 24h
						</span>
					</span>
					<Spark values={path(r)} width={80} height={24} />
				</div>
			</div>
		</article>
	);
}
