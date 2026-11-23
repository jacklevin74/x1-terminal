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

const DISC = ["bg-fill text-fg-inverse", "bg-fg-secondary text-fg-inverse", "bg-fg-muted text-fg-inverse"];

export function TopThree({ tier, className }: Props) {
	const zone = "color-mix(in oklch, var(--color-market-up) 9%, var(--color-surface))";
	return (
		<section className={cn("flex flex-col rounded-12 bg-surface p-2", className)}>
			<div className="flex flex-col rounded-8 p-2" style={{ backgroundColor: zone }}>
				{tier.traders.slice(0, 3).map((r) => (
					<Row key={r.address} r={r} tier={tier} inZone />
				))}
			</div>
			<div className="flex items-center gap-3 px-4 py-3 text-2xs tracking-micro text-market-up uppercase">
				<span className="h-px flex-1 bg-market-up" />
				Prize zone
				<span className="h-px flex-1 bg-market-up" />
			</div>
			<div className="flex flex-col p-2 opacity-60">
				{tier.traders.slice(3, 6).map((r) => (
					<Row key={r.address} r={r} tier={tier} />
				))}
			</div>
		</section>
	);
}

function Row({ r, tier, inZone }: { r: Trader; tier: Tier; inZone?: boolean }) {
	return (
		<div className="flex h-14 items-center gap-4 rounded-6 px-3 tabular-nums">
			<span
				className={cn(
					"grid size-7 place-items-center rounded-full text-xs font-bold",
					inZone ? DISC[r.rank - 1] : "bg-control text-fg-secondary",
				)}
			>
				{r.rank}
			</span>
			<Identicon id={r.address} className="size-9 rounded-full" />
			<div className="flex min-w-0 flex-1 flex-col gap-0.5">
				<span className="truncate text-sm font-medium">{traderName(r)}</span>
				<span className="text-xs text-fg-muted">
					Account {usdCompact(r.accountValue)}
					<span className="mx-1.5">24h</span>
					<span className={pnlClass(r.dayPnl)}>{signedUsd(r.dayPnl, true)}</span>
				</span>
			</div>
			<Spark values={path(r)} width={64} height={20} />
			{inZone && (
				<span className="w-[80px] text-right text-xs text-fg-muted">
					Wins <span className="text-fg">{usd(prizeFor(tier, r.rank))}</span>
				</span>
			)}
			<span className={cn("w-[120px] text-right text-base font-semibold", pnlClass(r.pnl))}>{signedUsd(r.pnl)}</span>
		</div>
	);
}
