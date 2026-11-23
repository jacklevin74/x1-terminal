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

export function TopThree({ tier, className }: Props) {
	return (
		<section className={cn("grid grid-cols-3 gap-2", className)}>
			{tier.traders.slice(0, 3).map((r) => (
				<Card key={r.address} r={r} tier={tier} />
			))}
		</section>
	);
}

function Card({ r, tier }: { r: Trader; tier: Tier }) {
	return (
		<article className="flex flex-col rounded-8 bg-surface p-5">
			<div className="flex items-center gap-3">
				<span
					className={cn(
						"w-5 text-xl leading-none font-semibold tabular-nums",
						r.rank === 1 ? "text-fg" : "text-fg-muted",
					)}
				>
					{r.rank}
				</span>
				<Identicon id={r.address} className="size-7 rounded-4" />
				<span className="truncate text-sm">{traderName(r)}</span>
				<span className="ml-auto text-xs whitespace-nowrap text-fg-muted">
					Prize <span className="text-fg tabular-nums">{usd(prizeFor(tier, r.rank))}</span>
				</span>
			</div>
			<div className="mt-6 flex items-end gap-6">
				<div className="flex flex-col gap-1">
					<span className={cn("text-2xl leading-none font-semibold tabular-nums", pnlClass(r.pnl))}>
						{signedUsd(r.pnl)}
					</span>
					<span className="text-xs text-fg-muted">Round PNL</span>
				</div>
				<div className="flex flex-col gap-1">
					<span className="text-base leading-none font-medium text-fg-secondary tabular-nums">
						{usdCompact(r.accountValue)}
					</span>
					<span className="text-xs text-fg-muted">Account</span>
				</div>
				<div className="flex flex-col gap-1">
					<span className={cn("text-base leading-none font-medium tabular-nums", pnlClass(r.dayPnl))}>
						{signedUsd(r.dayPnl, true)}
					</span>
					<span className="text-xs text-fg-muted">24h</span>
				</div>
			</div>
			<div className="mt-5">
				<PnlChart values={path(r)} height={112} labels />
			</div>
		</article>
	);
}
