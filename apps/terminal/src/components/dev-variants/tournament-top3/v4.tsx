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

const COLS = "grid-cols-[32px_minmax(0,1fr)_150px_120px_120px_100px_220px]";

export function TopThree({ tier, className }: Props) {
	return (
		<section className={cn("flex flex-col gap-2", className)}>
			{tier.traders.slice(0, 3).map((r) => (
				<Row key={r.address} r={r} tier={tier} />
			))}
		</section>
	);
}

function Cell({ label, value, className }: { label: string; value: string; className?: string }) {
	return (
		<div className="flex flex-col gap-1 tabular-nums">
			<span className="text-xs text-fg-muted">{label}</span>
			<span className={cn("text-base leading-none font-medium", className)}>{value}</span>
		</div>
	);
}

function Row({ r, tier }: { r: Trader; tier: Tier }) {
	const lead = r.rank === 1;
	return (
		<article className={cn("grid h-[76px] items-center gap-6 rounded-8 bg-surface px-6", COLS)}>
			<span className={cn("text-xl leading-none font-semibold tabular-nums", lead ? "text-fg" : "text-fg-muted")}>
				{r.rank}
			</span>
			<div className="flex min-w-0 items-center gap-3">
				<Identicon id={r.address} className="size-9 rounded-4" />
				<span className="truncate text-sm">{traderName(r)}</span>
			</div>
			<Cell label="Round PNL" value={signedUsd(r.pnl)} className={cn("text-lg font-semibold", pnlClass(r.pnl))} />
			<Cell label="Prize" value={usd(prizeFor(tier, r.rank))} className="text-fg" />
			<Cell label="Account" value={usdCompact(r.accountValue)} className="text-fg-secondary" />
			<Cell label="24h" value={signedUsd(r.dayPnl, true)} className={pnlClass(r.dayPnl)} />
			<PnlChart values={path(r)} height={44} />
		</article>
	);
}
