import {
	pad,
	path,
	pnlClass,
	prizeFor,
	signedUsd,
	type Tier,
	traderName,
	usd,
	usdCompact,
	useTimeLeft,
} from "@/components/tournament/data";
import { Identicon, Spark } from "@/components/tournament/parts";
import { cn } from "@/lib/cn";

interface Props {
	tier: Tier;
	className?: string;
}

const PLACE = ["1st", "2nd", "3rd"];

export function TopThree({ tier, className }: Props) {
	const t = useTimeLeft();
	return (
		<section className={cn("flex flex-col overflow-hidden rounded-8 bg-surface", className)}>
			<div className="flex h-16 items-center gap-8 bg-control px-6">
				<span className="flex items-baseline gap-2">
					<span className="text-2xl leading-none font-bold tabular-nums">{usd(tier.pot)}</span>
					<span className="text-xs text-fg-muted">pot</span>
				</span>
				<span className="flex items-baseline gap-2">
					<span className="text-2xl leading-none font-bold tabular-nums">
						{t.d}d {pad(t.h)}h {pad(t.m)}m {pad(t.s)}s
					</span>
					<span className="text-xs text-fg-muted">left</span>
				</span>
				<span className="ml-auto text-xs text-fg-muted">80% of the pot is paid to the top 3</span>
			</div>
			{tier.traders.slice(0, 3).map((r) => (
				<div
					key={r.address}
					className="grid h-16 grid-cols-[56px_120px_minmax(0,1fr)_200px_100px_140px] items-center gap-6 px-6 odd:bg-band"
				>
					<span className={cn("text-sm font-bold", r.rank === 1 ? "text-fg" : "text-fg-muted")}>
						{PLACE[r.rank - 1]}
					</span>
					<span className="text-xl font-bold tabular-nums">{usd(prizeFor(tier, r.rank))}</span>
					<span className="flex min-w-0 items-center gap-3">
						<Identicon id={r.address} className="size-8 rounded-full" />
						<span className="truncate text-sm">{traderName(r)}</span>
					</span>
					<span className="text-xs text-fg-muted tabular-nums">
						{usdCompact(r.accountValue)} account,{" "}
						<span className={pnlClass(r.dayPnl)}>{signedUsd(r.dayPnl, true)}</span> 24h
					</span>
					<Spark values={path(r)} width={72} height={20} />
					<span className={cn("text-right text-base font-semibold tabular-nums", pnlClass(r.pnl))}>
						{signedUsd(r.pnl)}
					</span>
				</div>
			))}
		</section>
	);
}
