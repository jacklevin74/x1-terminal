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

const FILL = ["bg-fill text-fg-inverse", "bg-fg-secondary text-fg-inverse", "bg-fg-muted text-fg-inverse"];
const SHARE = [50, 30, 20];

export function TopThree({ tier, className }: Props) {
	const top = tier.traders.slice(0, 3);
	return (
		<section className={cn("flex flex-col gap-5 rounded-8 bg-surface p-6", className)}>
			<div className="flex items-baseline justify-between">
				<span className="text-sm">Prize split</span>
				<span className="text-xs text-fg-muted tabular-nums">80% of the {usd(tier.pot)} pot goes to the top 3</span>
			</div>
			<div className="flex h-8 gap-0.5 overflow-hidden rounded-6">
				{top.map((r) => (
					<div
						key={r.address}
						className={cn("flex items-center px-3 text-xs font-semibold tabular-nums", FILL[r.rank - 1])}
						style={{ width: `${SHARE[r.rank - 1]}%` }}
					>
						{usd(prizeFor(tier, r.rank))}
						<span className="ml-1.5 font-normal opacity-70">{SHARE[r.rank - 1]}%</span>
					</div>
				))}
			</div>
			<div className="grid grid-cols-[5fr_3fr_2fr] gap-0.5">
				{top.map((r) => (
					<Col key={r.address} r={r} />
				))}
			</div>
		</section>
	);
}

function Col({ r }: { r: Trader }) {
	return (
		<div className="flex flex-col gap-4 px-3 pt-1">
			<div className="flex items-center gap-2">
				<Identicon id={r.address} className="size-7 rounded-4" />
				<span className="truncate text-sm">{traderName(r)}</span>
			</div>
			<span className={cn("text-xl leading-none font-semibold tabular-nums", pnlClass(r.pnl))}>{signedUsd(r.pnl)}</span>
			<span className="text-xs text-fg-muted tabular-nums">
				Account <span className="text-fg-secondary">{usdCompact(r.accountValue)}</span>
				<span className="ml-3">24h</span> <span className={pnlClass(r.dayPnl)}>{signedUsd(r.dayPnl, true)}</span>
			</span>
			<Spark values={path(r)} width={100} height={24} />
		</div>
	);
}
