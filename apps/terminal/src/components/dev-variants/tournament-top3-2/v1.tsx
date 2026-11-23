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
	const lead = tier.traders[0].pnl;
	return (
		<section className={cn("grid grid-cols-3 gap-2", className)}>
			{tier.traders.slice(0, 3).map((r) => (
				<Card key={r.address} r={r} tier={tier} share={Math.max(0.02, r.pnl / lead)} />
			))}
		</section>
	);
}

function Card({ r, tier, share }: { r: Trader; tier: Tier; share: number }) {
	const gap = tier.traders[0].pnl - r.pnl;
	return (
		<article className="flex flex-col overflow-hidden rounded-8 bg-surface">
			<div className="flex items-start gap-3 p-5">
				<Identicon id={r.address} className="size-10 rounded-6" />
				<div className="flex min-w-0 flex-1 flex-col gap-0.5">
					<span className="truncate text-sm">{traderName(r)}</span>
					<span className="text-xs text-fg-muted tabular-nums">
						{PLACE[r.rank - 1]} of {tier.count.toLocaleString()}
					</span>
				</div>
				<Spark values={path(r)} width={120} height={40} />
			</div>
			<div className="flex items-center gap-3 px-5 pb-4">
				<span className="h-1 flex-1 rounded-full bg-control">
					<span className="block h-1 rounded-full bg-fill" style={{ width: `${share * 100}%` }} />
				</span>
				<span className="text-2xs whitespace-nowrap text-fg-muted tabular-nums">
					{r.rank === 1 ? "Leader" : `${usdCompact(gap)} behind`}
				</span>
			</div>
			<dl className="grid grid-cols-[1fr_auto] items-end gap-4 bg-control px-5 py-4 tabular-nums">
				<div className="flex flex-col gap-1">
					<dt className="text-2xs tracking-micro text-fg-muted uppercase">Round PNL</dt>
					<dd className={cn("text-xl leading-none font-semibold", pnlClass(r.pnl))}>{signedUsd(r.pnl)}</dd>
				</div>
				<div className="flex flex-col items-end gap-1">
					<dt className="text-2xs tracking-micro text-fg-muted uppercase">Prize</dt>
					<dd className="text-xl leading-none font-semibold text-fg">{usd(prizeFor(tier, r.rank))}</dd>
				</div>
				<div className="col-span-2 mt-1 flex gap-4 text-xs text-fg-muted">
					<span>
						Account <span className="text-fg-secondary">{usdCompact(r.accountValue)}</span>
					</span>
					<span>
						24h <span className={pnlClass(r.dayPnl)}>{signedUsd(r.dayPnl, true)}</span>
					</span>
				</div>
			</dl>
		</article>
	);
}
