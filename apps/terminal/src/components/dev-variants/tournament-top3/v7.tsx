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

const PLACE = ["1st place", "2nd place", "3rd place"];

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
			<span className="text-xs text-fg-muted">{PLACE[r.rank - 1]} prize</span>
			<span className="mt-2 text-3xl leading-none font-semibold text-fg tabular-nums">
				{usd(prizeFor(tier, r.rank))}
			</span>
			<div className="mt-6 flex items-center gap-3 rounded-6 bg-control p-3">
				<Identicon id={r.address} className="size-8 rounded-4" />
				<div className="flex min-w-0 flex-1 flex-col gap-0.5">
					<span className="truncate text-sm">{traderName(r)}</span>
					<span className="text-xs text-fg-muted tabular-nums">Account {usdCompact(r.accountValue)}</span>
				</div>
				<div className="flex flex-col items-end gap-0.5 tabular-nums">
					<span className={cn("text-base leading-none font-semibold", pnlClass(r.pnl))}>{signedUsd(r.pnl)}</span>
					<span className={cn("text-xs", pnlClass(r.dayPnl))}>{signedUsd(r.dayPnl, true)} 24h</span>
				</div>
			</div>
			<div className="mt-4">
				<PnlChart values={path(r)} height={88} labels />
			</div>
		</article>
	);
}
