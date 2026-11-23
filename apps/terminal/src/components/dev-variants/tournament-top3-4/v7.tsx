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
		<section className={cn("flex flex-col py-4", className)}>
			{tier.traders.slice(0, 3).map((r) => (
				<Row key={r.address} r={r} tier={tier} />
			))}
		</section>
	);
}

function Row({ r, tier }: { r: Trader; tier: Tier }) {
	return (
		<div className="grid grid-cols-[96px_minmax(0,1fr)_auto] items-center gap-8 py-7">
			<span className="text-6xl leading-none font-light tracking-tighter text-fg-disabled tabular-nums">{r.rank}</span>
			<div className="flex items-center gap-4">
				<Identicon id={r.address} className="size-12 rounded-full" />
				<div className="flex flex-col gap-1">
					<span className="text-xl font-medium">{traderName(r)}</span>
					<span className="text-sm text-fg-muted tabular-nums">
						Wins {usd(prizeFor(tier, r.rank))}. Account {usdCompact(r.accountValue)}. Today{" "}
						<span className={pnlClass(r.dayPnl)}>{signedUsd(r.dayPnl, true)}</span>.
					</span>
				</div>
			</div>
			<div className="flex items-center gap-8">
				<Spark values={path(r)} width={120} height={32} />
				<span className={cn("text-4xl leading-none font-light tracking-tight tabular-nums", pnlClass(r.pnl))}>
					{signedUsd(r.pnl)}
				</span>
			</div>
		</div>
	);
}
