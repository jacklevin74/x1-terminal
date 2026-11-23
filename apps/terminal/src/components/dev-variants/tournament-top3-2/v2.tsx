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
import { Identicon } from "@/components/tournament/parts";
import { PnlChart } from "@/components/tournament/pnl-chart";
import { cn } from "@/lib/cn";

interface Props {
	tier: Tier;
	className?: string;
}

const PLACE = ["1st", "2nd", "3rd"];

export function TopThree({ tier, className }: Props) {
	return (
		<section className={cn("grid grid-cols-3 gap-2", className)}>
			{tier.traders.slice(0, 3).map((r) => (
				<Card key={r.address} r={r} tier={tier} />
			))}
		</section>
	);
}

function Stat({ label, value, className }: { label: string; value: string; className?: string }) {
	return (
		<div className="flex flex-col gap-1">
			<dt className="text-2xs tracking-micro text-fg-muted uppercase">{label}</dt>
			<dd className={cn("text-sm leading-none font-medium", className)}>{value}</dd>
		</div>
	);
}

function Card({ r, tier }: { r: Trader; tier: Tier }) {
	return (
		<article className="flex flex-col gap-5 rounded-8 bg-surface p-5">
			<div className="flex items-center gap-3">
				<Identicon id={r.address} className="size-8 rounded-4" />
				<span className="min-w-0 flex-1 truncate text-sm">{traderName(r)}</span>
				<span
					className={cn(
						"rounded-full px-2 py-0.5 text-2xs font-semibold tracking-micro uppercase",
						r.rank === 1 ? "bg-fill text-fg-inverse" : "bg-control text-fg-secondary",
					)}
				>
					{PLACE[r.rank - 1]}
				</span>
			</div>
			<div className="flex flex-col gap-1">
				<span className={cn("text-2xl leading-none font-semibold tabular-nums", pnlClass(r.pnl))}>
					{signedUsd(r.pnl)}
				</span>
				<span className="text-xs text-fg-muted">Round PNL</span>
			</div>
			<div className="rounded-6 bg-control px-4 pt-4 pb-3">
				<PnlChart values={path(r)} height={96} labels />
			</div>
			<dl className="grid grid-cols-3 gap-4 tabular-nums">
				<Stat label="Prize" value={usd(prizeFor(tier, r.rank))} className="text-fg" />
				<Stat label="Account" value={usdCompact(r.accountValue)} className="text-fg-secondary" />
				<Stat label="24h" value={signedUsd(r.dayPnl, true)} className={pnlClass(r.dayPnl)} />
			</dl>
		</article>
	);
}
