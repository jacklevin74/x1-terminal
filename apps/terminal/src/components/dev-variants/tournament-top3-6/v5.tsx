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
const CHECK = "repeating-conic-gradient(var(--color-band) 0% 25%, transparent 0% 50%) 50% / 64px 64px";

export function TopThree({ tier, className }: Props) {
	return (
		<section className={cn("flex flex-col gap-3 rounded-12 p-6", className)} style={{ background: CHECK }}>
			<div className="grid grid-cols-[64px_minmax(0,1fr)_140px_120px_120px_100px_140px] gap-4 px-6 text-xs text-fg-muted">
				<span>Rank</span>
				<span>Name</span>
				<span className="text-right">Account</span>
				<span className="text-right">24h</span>
				<span className="text-right">Prize</span>
				<span className="pl-4">30d</span>
				<span className="text-right">Score</span>
			</div>
			{tier.traders.slice(0, 3).map((r) => (
				<Pill key={r.address} r={r} tier={tier} />
			))}
		</section>
	);
}

function Pill({ r, tier }: { r: Trader; tier: Tier }) {
	return (
		<div className="grid h-14 grid-cols-[64px_minmax(0,1fr)_140px_120px_120px_100px_140px] items-center gap-4 rounded-12 bg-surface px-6 text-sm tabular-nums">
			<span className={cn("grid size-6 place-items-center rounded-full text-xs font-bold", DISC[r.rank - 1])}>
				{r.rank}
			</span>
			<span className="flex min-w-0 items-center gap-3">
				<Identicon id={r.address} className="size-8 rounded-full" />
				<span className="truncate">{traderName(r)}</span>
			</span>
			<span className="text-right text-fg-secondary">{usdCompact(r.accountValue)}</span>
			<span className={cn("text-right", pnlClass(r.dayPnl))}>{signedUsd(r.dayPnl, true)}</span>
			<span className="text-right">{usd(prizeFor(tier, r.rank))}</span>
			<span className="pl-4">
				<Spark values={path(r)} width={56} height={18} />
			</span>
			<span className={cn("text-right text-base font-semibold", pnlClass(r.pnl))}>{signedUsd(r.pnl)}</span>
		</div>
	);
}
