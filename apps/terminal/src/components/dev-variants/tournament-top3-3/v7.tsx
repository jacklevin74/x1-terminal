import {
	move,
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
import { Identicon, RankMove, Spark } from "@/components/tournament/parts";
import { cn } from "@/lib/cn";

interface Props {
	tier: Tier;
	className?: string;
}

const COLS = "grid-cols-[48px_56px_minmax(0,1fr)_120px_128px_136px_96px_104px_104px_96px]";

export function TopThree({ tier, className }: Props) {
	return (
		<section className={cn("flex flex-col", className)}>
			<div className={cn("grid h-8 items-center gap-2 px-3 text-xs text-fg-muted", COLS)}>
				<span>Rank</span>
				<span>24h</span>
				<span>Trader</span>
				<span className="text-right">Prize</span>
				<span className="text-right">Account value</span>
				<span className="text-right">Round PNL</span>
				<span className="text-right">ROI</span>
				<span className="text-right">Volume</span>
				<span className="pl-4">30d PNL</span>
				<span className="text-right">24h PNL</span>
			</div>
			<div className="flex flex-col gap-1">
				{tier.traders.slice(0, 3).map((r) => (
					<Row key={r.address} r={r} tier={tier} />
				))}
			</div>
		</section>
	);
}

function Row({ r, tier }: { r: Trader; tier: Tier }) {
	return (
		<div className={cn("grid h-14 items-center gap-2 rounded-6 bg-surface px-3 text-xs tabular-nums", COLS)}>
			<span className={cn("text-lg font-semibold", r.rank === 1 ? "text-fg" : "text-fg-muted")}>{r.rank}</span>
			<RankMove value={move(r)} />
			<span className="flex min-w-0 items-center gap-3">
				<Identicon id={r.address} className="size-8 rounded-4" />
				<span className="truncate text-sm">{traderName(r)}</span>
			</span>
			<span className="text-right text-sm font-medium text-fg">{usd(prizeFor(tier, r.rank))}</span>
			<span className="text-right text-fg-secondary">{usd(r.accountValue)}</span>
			<span className={cn("text-right text-base font-semibold", pnlClass(r.pnl))}>{signedUsd(r.pnl)}</span>
			<span className="text-right text-fg-secondary">{pct(r.roi)}</span>
			<span className="text-right text-fg-secondary">{usdCompact(r.vlm)}</span>
			<span className="pl-4">
				<Spark values={path(r)} width={72} height={22} />
			</span>
			<span className={cn("text-right", pnlClass(r.dayPnl))}>{signedUsd(r.dayPnl, true)}</span>
		</div>
	);
}
