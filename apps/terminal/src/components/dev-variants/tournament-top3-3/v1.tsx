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

const ORDER = ["order-2", "order-1", "order-3"];
const BAR = 200;

export function TopThree({ tier, className }: Props) {
	const lead = tier.traders[0].pnl;
	return (
		<section className={cn("grid grid-cols-3 items-end gap-6 rounded-8 bg-surface px-10 pt-8 pb-0", className)}>
			{tier.traders.slice(0, 3).map((r) => (
				<Column key={r.address} r={r} tier={tier} share={r.pnl / lead} />
			))}
		</section>
	);
}

function Column({ r, tier, share }: { r: Trader; tier: Tier; share: number }) {
	const lead = r.rank === 1;
	return (
		<div className={cn("flex flex-col items-center", ORDER[r.rank - 1])}>
			<Identicon id={r.address} className="size-10 rounded-6" />
			<span className="mt-2 text-sm">{traderName(r)}</span>
			<span className="mt-1 text-xs text-fg-muted tabular-nums">
				Account {usdCompact(r.accountValue)}
				<span className="mx-2">24h</span>
				<span className={pnlClass(r.dayPnl)}>{signedUsd(r.dayPnl, true)}</span>
			</span>
			<span className={cn("mt-4 text-2xl leading-none font-semibold tabular-nums", pnlClass(r.pnl))}>
				{signedUsd(r.pnl)}
			</span>
			<div className="mt-3">
				<Spark values={path(r)} width={120} height={28} />
			</div>
			<div
				className={cn(
					"mt-3 flex w-full flex-col items-center justify-end rounded-t-6 pb-5",
					lead ? "bg-fill" : "bg-control",
				)}
				style={{ height: Math.max(56, BAR * share) }}
			>
				<span className={cn("text-2xs tracking-micro uppercase", lead ? "text-fg-inverse-muted" : "text-fg-muted")}>
					{r.rank === 1 ? "1st" : r.rank === 2 ? "2nd" : "3rd"} prize
				</span>
				<span className={cn("mt-1 text-base font-semibold tabular-nums", lead ? "text-fg-inverse" : "text-fg")}>
					{usd(prizeFor(tier, r.rank))}
				</span>
			</div>
		</div>
	);
}
