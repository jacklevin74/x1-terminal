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
const RING = ["ring-fill", "ring-fg-secondary", "ring-fg-muted"];
const DISC = ["bg-fill text-fg-inverse", "bg-fg-secondary text-fg-inverse", "bg-fg-muted text-fg-inverse"];

export function TopThree({ tier, className }: Props) {
	return (
		<section
			className={cn("mx-auto flex w-full max-w-[640px] flex-col rounded-16 bg-surface px-8 pt-8 pb-4", className)}
		>
			<div className="grid grid-cols-3 items-end gap-4">
				{tier.traders.slice(0, 3).map((r) => (
					<Winner key={r.address} r={r} tier={tier} />
				))}
			</div>
			<div className="mt-8 flex items-baseline justify-between">
				<span className="text-sm font-medium">Traders around you</span>
				<span className="text-xs text-fg-muted">View all</span>
			</div>
			<div className="mt-2 flex flex-col">
				{tier.traders.slice(3, 7).map((r) => (
					<div key={r.address} className="flex h-12 items-center gap-3 text-sm tabular-nums">
						<span className="w-4 text-fg-muted">{r.rank}</span>
						<Identicon id={r.address} className="size-8 rounded-full" />
						<div className="flex min-w-0 flex-1 flex-col">
							<span className="truncate">{traderName(r)}</span>
							<span className="text-xs text-fg-muted">{usdCompact(r.accountValue)} account</span>
						</div>
						<span className={cn("font-medium", pnlClass(r.pnl))}>{signedUsd(r.pnl)}</span>
					</div>
				))}
			</div>
		</section>
	);
}

function Winner({ r, tier }: { r: Trader; tier: Tier }) {
	const lead = r.rank === 1;
	return (
		<div className={cn("flex flex-col items-center text-center", ORDER[r.rank - 1])}>
			<span className="text-xs text-fg-muted">{traderName(r)}</span>
			<span className="relative mt-2">
				<Identicon
					id={r.address}
					className={cn(
						"rounded-full ring-[3px] ring-offset-4 ring-offset-surface",
						RING[r.rank - 1],
						lead ? "size-24" : "size-16",
					)}
				/>
				<span
					className={cn(
						"absolute left-1/2 grid size-6 -translate-x-1/2 place-items-center rounded-full text-xs font-bold ring-2 ring-surface",
						DISC[r.rank - 1],
						lead ? "-bottom-2" : "-bottom-2",
					)}
				>
					{r.rank}
				</span>
			</span>
			<span
				className={cn("mt-5 leading-none font-semibold tabular-nums", pnlClass(r.pnl), lead ? "text-xl" : "text-base")}
			>
				{signedUsd(r.pnl)}
			</span>
			<span className="mt-1.5 text-xs text-fg-muted tabular-nums">Wins {usd(prizeFor(tier, r.rank))}</span>
			<span className="mt-0.5 text-xs text-fg-muted tabular-nums">
				{usdCompact(r.accountValue)}, <span className={pnlClass(r.dayPnl)}>{signedUsd(r.dayPnl, true)}</span> 24h
			</span>
			<div className="mt-2">
				<Spark values={path(r)} width={64} height={16} />
			</div>
		</div>
	);
}
