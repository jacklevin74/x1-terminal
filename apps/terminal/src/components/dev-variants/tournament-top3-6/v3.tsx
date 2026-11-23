import {
	path,
	pct,
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

const COLS = "grid-cols-[40px_minmax(0,1fr)_110px_130px_110px_260px_100px]";

export function TopThree({ tier, className }: Props) {
	return (
		<section className={cn("flex flex-col rounded-6 bg-surface", className)}>
			<div className={cn("grid h-9 items-center gap-4 px-4 text-xs text-fg-muted", COLS)}>
				<span>#</span>
				<span>Trader</span>
				<span>Prize</span>
				<span className="text-right">Round PNL</span>
				<span className="text-right">24h</span>
				<span>Account to PNL</span>
				<span className="text-right">ROI</span>
			</div>
			{tier.traders.slice(0, 3).map((r) => (
				<Row key={r.address} r={r} tier={tier} />
			))}
		</section>
	);
}

function Row({ r, tier }: { r: Trader; tier: Tier }) {
	const total = r.accountValue + Math.max(0, r.pnl);
	const share = Math.max(0, r.pnl) / total;
	return (
		<div className={cn("grid h-12 items-center gap-4 px-4 text-xs tabular-nums odd:bg-band", COLS)}>
			<span className="text-fg-muted">{r.rank}</span>
			<span className="flex min-w-0 items-center gap-3">
				<span className="grid size-8 place-items-center rounded-full bg-fill">
					<Identicon id={r.address} className="size-6 rounded-full" />
				</span>
				<span className="truncate text-sm font-medium">{traderName(r)}</span>
				<Spark values={path(r)} width={48} height={16} />
			</span>
			<span>{usd(prizeFor(tier, r.rank))}</span>
			<span className={cn("text-right text-sm font-semibold", pnlClass(r.pnl))}>{signedUsd(r.pnl)}</span>
			<span className={cn("text-right", pnlClass(r.dayPnl))}>{signedUsd(r.dayPnl, true)}</span>
			<span className="flex h-5 overflow-hidden rounded-xs text-2xs font-semibold">
				<span className="flex items-center bg-control-hover px-2 text-fg" style={{ width: `${(1 - share) * 100}%` }}>
					{usdCompact(r.accountValue)}
				</span>
				<span
					className="flex items-center justify-end bg-market-up px-2 text-fg-inverse"
					style={{ width: `${share * 100}%` }}
				>
					{usdCompact(r.pnl)}
				</span>
			</span>
			<span className="text-right text-market-up">{pct(r.roi)}</span>
		</div>
	);
}
