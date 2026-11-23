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
		<section className={cn("flex flex-col gap-2", className)}>
			{tier.traders.slice(0, 3).map((r) => (
				<Row key={r.address} r={r} tier={tier} share={Math.max(0.02, r.pnl / lead)} />
			))}
		</section>
	);
}

function Row({ r, tier, share }: { r: Trader; tier: Tier; share: number }) {
	const lead = r.rank === 1;
	return (
		<article className="grid grid-cols-[48px_280px_minmax(0,1fr)_140px_120px] items-center gap-8 rounded-8 bg-surface px-6 py-5">
			<span className={cn("text-3xl leading-none font-light tabular-nums", lead ? "text-fg" : "text-fg-muted")}>
				{r.rank}
			</span>
			<div className="flex items-center gap-3">
				<Identicon id={r.address} className="size-10 rounded-6" />
				<div className="flex min-w-0 flex-col gap-0.5">
					<span className="truncate text-sm">{traderName(r)}</span>
					<span className="text-xs text-fg-muted tabular-nums">Account {usdCompact(r.accountValue)}</span>
				</div>
			</div>
			<div className="flex flex-col gap-2 tabular-nums">
				<div className="flex items-baseline justify-between">
					<span className={cn("text-xl leading-none font-semibold", pnlClass(r.pnl))}>{signedUsd(r.pnl)}</span>
					<span className="text-xs text-fg-muted">
						{lead ? "Leader" : `${usdCompact(tier.traders[0].pnl - r.pnl)} behind`}
						<span className="mx-2">24h</span>
						<span className={pnlClass(r.dayPnl)}>{signedUsd(r.dayPnl, true)}</span>
					</span>
				</div>
				<span className="h-1.5 w-full rounded-full bg-control">
					<span className="block h-1.5 rounded-full bg-fill" style={{ width: `${share * 100}%` }} />
				</span>
			</div>
			<Spark values={path(r)} width={140} height={36} />
			<div className="flex flex-col items-end gap-1 tabular-nums">
				<span className="text-lg leading-none font-semibold text-fg">{usd(prizeFor(tier, r.rank))}</span>
				<span className="text-xs text-fg-muted">Prize</span>
			</div>
		</article>
	);
}
