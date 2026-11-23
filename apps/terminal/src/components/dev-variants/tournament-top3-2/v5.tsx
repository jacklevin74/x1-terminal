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
		<article className="flex flex-col rounded-8 bg-surface p-6">
			<div className="flex items-center justify-between text-2xs tracking-micro text-fg-muted uppercase">
				<span className={r.rank === 1 ? "text-fg" : undefined}>{PLACE[r.rank - 1]}</span>
				<span>
					Prize <span className="text-fg tabular-nums">{usd(prizeFor(tier, r.rank))}</span>
				</span>
			</div>
			<span className={cn("mt-5 text-4xl leading-none font-semibold tracking-tight tabular-nums", pnlClass(r.pnl))}>
				{signedUsd(r.pnl)}
			</span>
			<div className="mt-5 flex items-center gap-2">
				<Identicon id={r.address} className="size-6 rounded-4" />
				<span className="truncate text-sm">{traderName(r)}</span>
				<span className="ml-auto text-xs whitespace-nowrap text-fg-muted tabular-nums">
					{usdCompact(r.accountValue)} <span className="mx-1">account</span>
					<span className={pnlClass(r.dayPnl)}>{signedUsd(r.dayPnl, true)}</span> 24h
				</span>
			</div>
			<div className="mt-6">
				<PnlChart values={path(r)} height={72} labels />
			</div>
		</article>
	);
}
