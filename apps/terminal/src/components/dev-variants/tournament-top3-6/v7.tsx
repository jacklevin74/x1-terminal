import { ArrowRightIcon } from "@phosphor-icons/react";
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

export function TopThree({ tier, className }: Props) {
	return (
		<section className={cn("flex flex-col rounded-16 bg-surface p-6", className)}>
			<h3 className="text-lg font-semibold">Biggest wins this round</h3>
			<ol className="mt-4 flex flex-col">
				{tier.traders.slice(0, 3).map((r) => (
					<Row key={r.address} r={r} tier={tier} />
				))}
			</ol>
		</section>
	);
}

function Row({ r, tier }: { r: Trader; tier: Tier }) {
	const [, atStart, , now] = path(r);
	return (
		<li className="flex items-center gap-4 py-4">
			<span className="w-4 text-sm text-fg-muted tabular-nums">{r.rank}</span>
			<Identicon id={r.address} className="size-10 rounded-full" />
			<div className="flex min-w-0 flex-1 flex-col gap-1">
				<span className="flex items-center gap-2 text-sm">
					<span className="font-medium">{traderName(r)}</span>
					<span className="text-fg-muted">Round 1, {tier.label.toLowerCase()}</span>
				</span>
				<span className="flex items-center gap-1.5 text-sm tabular-nums">
					<span className="text-fg-secondary">{signedUsd(atStart)}</span>
					<ArrowRightIcon className="size-3.5 text-fg-muted" />
					<span className={cn("font-semibold", pnlClass(now))}>{signedUsd(now)}</span>
					<span className="ml-2 text-xs text-fg-muted">
						30d PNL, account {usdCompact(r.accountValue)}, 24h{" "}
						<span className={pnlClass(r.dayPnl)}>{signedUsd(r.dayPnl, true)}</span>
					</span>
				</span>
			</div>
			<Spark values={path(r)} width={80} height={24} />
			<div className="flex w-[120px] flex-col items-end gap-0.5 tabular-nums">
				<span className={cn("text-base font-semibold", pnlClass(r.pnl))}>{signedUsd(r.pnl)}</span>
				<span className="text-xs text-fg-muted">Wins {usd(prizeFor(tier, r.rank))}</span>
			</div>
		</li>
	);
}
