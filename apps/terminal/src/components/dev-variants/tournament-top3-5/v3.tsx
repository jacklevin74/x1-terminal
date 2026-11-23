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
	const lead = tier.traders[0].pnl;
	return (
		<section className={cn("flex flex-col gap-2 rounded-8 bg-surface p-6", className)}>
			<div className="grid grid-cols-[56px_minmax(0,1fr)_200px] gap-6 text-2xs tracking-micro text-fg-muted uppercase">
				<span>Rank</span>
				<span className="flex justify-between">
					<span>Round start</span>
					<span>Leader</span>
				</span>
				<span className="text-right">Prize at the finish</span>
			</div>
			{tier.traders.slice(0, 3).map((r) => (
				<Lane key={r.address} r={r} tier={tier} pos={r.pnl / lead} />
			))}
		</section>
	);
}

function Lane({ r, tier, pos }: { r: Trader; tier: Tier; pos: number }) {
	const lead = r.rank === 1;
	return (
		<div className="grid h-[72px] grid-cols-[56px_minmax(0,1fr)_200px] items-center gap-6">
			<span className={cn("text-2xl leading-none font-semibold tabular-nums", lead ? "text-fg" : "text-fg-muted")}>
				{r.rank}
			</span>
			<div className="relative h-full">
				<span className="absolute inset-x-0 top-1/2 h-0.5 -translate-y-1/2 bg-control" />
				<span className="absolute top-1/2 h-0.5 -translate-y-1/2 bg-fill" style={{ left: 0, width: `${pos * 100}%` }} />
				<span className="absolute top-1/2 right-0 h-8 w-0.5 -translate-y-1/2 bg-fill" />
				<div
					className={cn(
						"absolute top-1/2 flex -translate-y-1/2 items-center gap-3",
						lead ? "-translate-x-full flex-row-reverse pr-5" : "pl-0",
					)}
					style={{ left: `${pos * 100}%` }}
				>
					<Identicon id={r.address} className="size-10 rounded-full ring-4 ring-surface" />
					<div className={cn("flex flex-col gap-0.5 whitespace-nowrap tabular-nums", lead && "items-end")}>
						<span className={cn("text-base leading-none font-semibold", pnlClass(r.pnl))}>{signedUsd(r.pnl)}</span>
						<span className="text-xs text-fg-muted">
							{traderName(r)}
							<span className="mx-1.5">{usdCompact(r.accountValue)}</span>
							<span className={pnlClass(r.dayPnl)}>{signedUsd(r.dayPnl, true)} 24h</span>
						</span>
					</div>
				</div>
			</div>
			<div className="flex items-center justify-end gap-4">
				<Spark values={path(r)} width={64} height={20} />
				<span className="w-[72px] text-right text-base font-semibold tabular-nums">{usd(prizeFor(tier, r.rank))}</span>
			</div>
		</div>
	);
}
