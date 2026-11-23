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

function Line({ label, value, className }: { label: string; value: string; className?: string }) {
	return (
		<div className="flex h-7 items-center justify-between text-xs tabular-nums">
			<dt className="text-fg-muted">{label}</dt>
			<dd className={cn("font-medium", className)}>{value}</dd>
		</div>
	);
}

function Card({ r, tier }: { r: Trader; tier: Tier }) {
	return (
		<article className="flex flex-col rounded-8 bg-surface p-5">
			<div className="flex items-start justify-between">
				<Identicon id={r.address} className="size-11 rounded-full" />
				<span className={cn("text-sm font-semibold tabular-nums", r.rank === 1 ? "text-fg" : "text-fg-muted")}>
					{PLACE[r.rank - 1]}
				</span>
			</div>
			<span className="mt-3 truncate text-sm">{traderName(r)}</span>
			<span className={cn("mt-4 text-2xl leading-none font-semibold tabular-nums", pnlClass(r.pnl))}>
				{signedUsd(r.pnl)}
			</span>
			<span className="mt-1 text-xs text-fg-muted">Round PNL</span>
			<div className="mt-4">
				<PnlChart values={path(r)} height={64} />
			</div>
			<dl className="mt-3 flex flex-col">
				<Line label="Prize" value={usd(prizeFor(tier, r.rank))} className="text-fg" />
				<Line label="Account value" value={usdCompact(r.accountValue)} className="text-fg-secondary" />
				<Line label="24h PNL" value={signedUsd(r.dayPnl, true)} className={pnlClass(r.dayPnl)} />
			</dl>
		</article>
	);
}
