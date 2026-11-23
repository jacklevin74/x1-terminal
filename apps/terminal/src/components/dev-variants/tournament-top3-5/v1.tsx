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
	return (
		<section className={cn("grid grid-cols-3 gap-px overflow-hidden rounded-8 bg-background", className)}>
			{tier.traders.slice(0, 3).map((r) => (
				<Panel key={r.address} r={r} tier={tier} />
			))}
		</section>
	);
}

function Panel({ r, tier }: { r: Trader; tier: Tier }) {
	const lead = r.rank === 1;
	return (
		<article className="flex flex-col items-center bg-surface px-6 pt-7 pb-6 text-center">
			<span className={cn("text-xs font-semibold tracking-micro uppercase", lead ? "text-fg" : "text-fg-muted")}>
				{PLACE[r.rank - 1]}
			</span>
			<span
				className={cn(
					"mt-5 leading-none font-semibold tracking-tighter tabular-nums",
					pnlClass(r.pnl),
					lead ? "text-6xl" : "text-5xl text-fg",
				)}
			>
				{signedUsd(r.pnl)}
			</span>
			<div className="mt-6 flex items-center gap-2">
				<Identicon id={r.address} className="size-6 rounded-4" />
				<span className="text-sm">{traderName(r)}</span>
			</div>
			<div className="mt-6 grid w-full grid-cols-3 gap-px overflow-hidden rounded-6 bg-background tabular-nums">
				<Cell label="Prize" value={usd(prizeFor(tier, r.rank))} />
				<Cell label="Account" value={usdCompact(r.accountValue)} />
				<Cell label="24h" value={signedUsd(r.dayPnl, true)} className={pnlClass(r.dayPnl)} />
			</div>
			<div className="mt-5">
				<Spark values={path(r)} width={160} height={28} />
			</div>
		</article>
	);
}

function Cell({ label, value, className }: { label: string; value: string; className?: string }) {
	return (
		<div className="flex flex-col gap-1 bg-control py-2.5">
			<span className="text-2xs tracking-micro text-fg-muted uppercase">{label}</span>
			<span className={cn("text-sm font-medium", className)}>{value}</span>
		</div>
	);
}
