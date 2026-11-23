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

const ORDER = ["order-2", "order-1", "order-3"];
const STEP = [140, 100, 76];

export function TopThree({ tier, className }: Props) {
	const t = useTimeLeft();
	return (
		<section className={cn("flex flex-col overflow-hidden rounded-12 bg-surface", className)}>
			<div className="flex items-center justify-between px-8 py-5">
				<span className="flex items-baseline gap-2">
					<span className="text-3xl leading-none font-black tracking-tight tabular-nums">{usd(tier.pot)}</span>
					<span className="text-sm text-fg-muted">pot, round 1</span>
				</span>
				<span className="flex items-baseline gap-2 tabular-nums">
					<span className="text-sm text-fg-muted">Ends in</span>
					<span className="text-xl font-bold">
						{t.d}d {pad(t.h)}h {pad(t.m)}m {pad(t.s)}s
					</span>
				</span>
			</div>
			<div className="grid grid-cols-3 items-end gap-2 px-8">
				{tier.traders.slice(0, 3).map((r) => (
					<div key={r.address} className={cn("flex flex-col items-center", ORDER[r.rank - 1])}>
						<Identicon id={r.address} className="size-12 rounded-full" />
						<span className="mt-2 text-sm">{traderName(r)}</span>
						<span className={cn("mt-1 text-base font-semibold tabular-nums", pnlClass(r.pnl))}>{signedUsd(r.pnl)}</span>
						<span className="mt-0.5 text-xs text-fg-muted tabular-nums">
							{usdCompact(r.accountValue)}, <span className={pnlClass(r.dayPnl)}>{signedUsd(r.dayPnl, true)}</span> 24h
						</span>
						<Spark values={path(r)} width={72} height={16} />
						<div
							className={cn(
								"mt-3 flex w-full flex-col items-center justify-start rounded-t-8 pt-4",
								r.rank === 1 ? "bg-fill text-fg-inverse" : "bg-control",
							)}
							style={{ height: STEP[r.rank - 1] }}
						>
							<span
								className={cn(
									"text-2xs tracking-micro uppercase",
									r.rank === 1 ? "text-fg-inverse-muted" : "text-fg-muted",
								)}
							>
								Prize
							</span>
							<span className="text-2xl font-black tracking-tight tabular-nums">{usd(prizeFor(tier, r.rank))}</span>
						</div>
					</div>
				))}
			</div>
		</section>
	);
}
