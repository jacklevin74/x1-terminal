import {
	move,
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
import { Identicon, RankMove, Spark } from "@/components/tournament/parts";
import { cn } from "@/lib/cn";

interface Props {
	tier: Tier;
	className?: string;
}

const HEX = "polygon(50% 0, 100% 25%, 100% 75%, 50% 100%, 0 75%, 0 25%)";
const TINT = ["bg-control-hover", "bg-control", "bg-surface"];
const BADGE = ["bg-fill text-fg-inverse", "bg-fg-secondary text-fg-inverse", "bg-fg-muted text-fg-inverse"];
const COLS = "grid-cols-[72px_minmax(0,1fr)_80px_150px_120px_120px_120px]";

export function TopThree({ tier, className }: Props) {
	return (
		<section className={cn("flex flex-col overflow-hidden rounded-6 bg-surface", className)}>
			<div className={cn("grid h-10 items-center gap-4 bg-band px-4 text-xs text-fg-muted", COLS)}>
				<span>Place</span>
				<span>Trader</span>
				<span>Last 24h</span>
				<span className="text-right">Round PNL</span>
				<span className="text-right">Account</span>
				<span className="text-right">Prize</span>
				<span className="pl-4">30d</span>
			</div>
			{tier.traders.slice(0, 3).map((r) => (
				<Row key={r.address} r={r} tier={tier} />
			))}
		</section>
	);
}

function Row({ r, tier }: { r: Trader; tier: Tier }) {
	const m = move(r);
	return (
		<div className={cn("grid h-16 items-center gap-4 px-4 text-sm tabular-nums", COLS, TINT[r.rank - 1])}>
			<span
				className={cn("grid h-9 w-8 place-items-center text-sm font-bold", BADGE[r.rank - 1])}
				style={{ clipPath: HEX }}
			>
				{r.rank}
			</span>
			<span className="flex min-w-0 items-center gap-3">
				<Identicon id={r.address} className="size-8 rounded-full" />
				<span className="truncate font-medium">{traderName(r)}</span>
			</span>
			{m === 0 ? <span className="text-fg-muted">=</span> : <RankMove value={m} />}
			<span className={cn("text-right text-base font-semibold", pnlClass(r.pnl))}>{signedUsd(r.pnl)}</span>
			<span className="text-right text-fg-secondary">{usdCompact(r.accountValue)}</span>
			<span className="text-right">{usd(prizeFor(tier, r.rank))}</span>
			<span className="pl-4">
				<Spark values={path(r)} width={72} height={20} />
			</span>
		</div>
	);
}
