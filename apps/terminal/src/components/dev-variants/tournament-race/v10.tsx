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

const PLACE = ["First", "Second", "Third"];

export function TopThree({ tier, className }: Props) {
	const t = useTimeLeft();
	return (
		<section className={cn("flex flex-col", className)}>
			<div className="flex items-end justify-between pb-8">
				<div className="flex flex-col gap-2">
					<span className="text-sm text-fg-muted">Round 1 pot</span>
					<span className="text-6xl leading-none font-light tracking-tighter tabular-nums">{usd(tier.pot)}</span>
				</div>
				<div className="flex flex-col items-end gap-2">
					<span className="text-sm text-fg-muted">Ends in</span>
					<span className="text-4xl leading-none font-light tracking-tight tabular-nums">
						{t.d}d {pad(t.h)}h {pad(t.m)}m {pad(t.s)}s
					</span>
				</div>
			</div>
			<div className="grid grid-cols-3 gap-px overflow-hidden rounded-8 bg-background">
				{tier.traders.slice(0, 3).map((r) => (
					<div key={r.address} className="flex flex-col gap-6 bg-surface p-6">
						<div className="flex flex-col gap-1">
							<span className="text-xs text-fg-muted">{PLACE[r.rank - 1]}</span>
							<span className="text-3xl leading-none font-light tracking-tight tabular-nums">
								{usd(prizeFor(tier, r.rank))}
							</span>
						</div>
						<div className="flex items-center gap-3">
							<Identicon id={r.address} className="size-8 rounded-4" />
							<div className="flex min-w-0 flex-1 flex-col">
								<span className="truncate text-sm">{traderName(r)}</span>
								<span className="text-xs text-fg-muted tabular-nums">
									{usdCompact(r.accountValue)}, <span className={pnlClass(r.dayPnl)}>{signedUsd(r.dayPnl, true)}</span>{" "}
									24h
								</span>
							</div>
							<Spark values={path(r)} width={56} height={16} />
							<span className={cn("text-base font-medium tabular-nums", pnlClass(r.pnl))}>{signedUsd(r.pnl)}</span>
						</div>
					</div>
				))}
			</div>
		</section>
	);
}
