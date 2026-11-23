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
		<section className={cn("flex flex-col gap-1.5 rounded-8 bg-surface p-3", className)}>
			{tier.traders.slice(0, 3).map((r) => (
				<Bar key={r.address} r={r} tier={tier} share={r.pnl / lead} />
			))}
		</section>
	);
}

function Bar({ r, tier, share }: { r: Trader; tier: Tier; share: number }) {
	const lead = r.rank === 1;
	return (
		<div className="relative isolate flex h-16 items-center gap-4 overflow-hidden rounded-6 px-4">
			<span
				className={cn("absolute inset-y-0 left-0 -z-10 rounded-6", lead ? "bg-control-hover" : "bg-control")}
				style={{ width: `${Math.max(share * 100, 8)}%` }}
			/>
			<span className={cn("w-5 text-lg font-semibold tabular-nums", lead ? "text-fg" : "text-fg-muted")}>{r.rank}</span>
			<Identicon id={r.address} className="size-8 rounded-4" />
			<span className="w-[140px] truncate text-sm">{traderName(r)}</span>
			<span className={cn("text-xl leading-none font-semibold tabular-nums", pnlClass(r.pnl))}>{signedUsd(r.pnl)}</span>
			<span className="ml-auto flex items-center gap-6 text-xs text-fg-muted tabular-nums">
				<span>
					Prize <span className="text-fg">{usd(prizeFor(tier, r.rank))}</span>
				</span>
				<span>
					Account <span className="text-fg-secondary">{usdCompact(r.accountValue)}</span>
				</span>
				<span>
					24h <span className={pnlClass(r.dayPnl)}>{signedUsd(r.dayPnl, true)}</span>
				</span>
				<Spark values={path(r)} width={72} height={22} />
			</span>
		</div>
	);
}
