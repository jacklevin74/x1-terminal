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
const STEP = [168, 120, 92];

export function TopThree({ tier, className }: Props) {
	return (
		<section className={cn("flex flex-col rounded-8 bg-surface px-8 pt-8", className)}>
			<div className="grid grid-cols-3 items-end gap-2">
				{tier.traders.slice(0, 3).map((r) => (
					<Column key={r.address} r={r} tier={tier} />
				))}
			</div>
		</section>
	);
}

function Column({ r, tier }: { r: Trader; tier: Tier }) {
	const lead = r.rank === 1;
	return (
		<div className={cn("flex flex-col items-center", ORDER[r.rank - 1])}>
			<Identicon id={r.address} className={cn("rounded-full", lead ? "size-16" : "size-12")} />
			<span className="mt-3 text-sm">{traderName(r)}</span>
			<span
				className={cn(
					"mt-2 rounded-full px-3 py-1 text-sm font-semibold tabular-nums",
					lead ? "bg-fill text-fg-inverse" : "bg-control text-fg",
				)}
			>
				{signedUsd(r.pnl)}
			</span>
			<span className="mt-2 text-xs text-fg-muted tabular-nums">
				Wins {usd(prizeFor(tier, r.rank))}
				<span className="mx-1.5">Account</span> {usdCompact(r.accountValue)}
				<span className="mx-1.5">24h</span>
				<span className={pnlClass(r.dayPnl)}>{signedUsd(r.dayPnl, true)}</span>
			</span>
			<div className="mt-2">
				<Spark values={path(r)} width={96} height={20} />
			</div>
			<div
				className={cn(
					"mt-4 flex w-full items-start justify-center rounded-t-8 pt-4",
					lead ? "bg-control-hover" : "bg-control",
				)}
				style={{ height: STEP[r.rank - 1] }}
			>
				<span
					className={cn(
						"text-6xl leading-none font-black tracking-tighter tabular-nums",
						lead ? "text-fg" : "text-fg-disabled",
					)}
				>
					{r.rank}
				</span>
			</div>
		</div>
	);
}
