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

const ORDER = ["order-2", "order-1", "order-3"];
const PLACE = ["1st", "2nd", "3rd"];

export function TopThree({ tier, className }: Props) {
	return (
		<section className={cn("grid grid-cols-3 items-end gap-2", className)}>
			{tier.traders.slice(0, 3).map((r) => (
				<Card key={r.address} r={r} tier={tier} />
			))}
		</section>
	);
}

function Card({ r, tier }: { r: Trader; tier: Tier }) {
	const lead = r.rank === 1;
	return (
		<article
			className={cn(
				"flex flex-col items-center rounded-8 bg-surface px-5 pb-5 text-center",
				ORDER[r.rank - 1],
				lead ? "pt-8" : "pt-6",
			)}
		>
			<span
				className={cn(
					"rounded-full px-2.5 py-1 text-2xs font-semibold tracking-micro uppercase",
					lead ? "bg-fill text-fg-inverse" : "bg-control text-fg-secondary",
				)}
			>
				{PLACE[r.rank - 1]}
			</span>
			<Identicon id={r.address} className={cn("mt-4 rounded-full", lead ? "size-14" : "size-11")} />
			<span className="mt-3 max-w-full truncate text-sm">{traderName(r)}</span>
			<span
				className={cn("mt-4 leading-none font-semibold tabular-nums", pnlClass(r.pnl), lead ? "text-3xl" : "text-2xl")}
			>
				{signedUsd(r.pnl)}
			</span>
			<span className="mt-2 text-xs text-fg-muted">
				Wins <span className="text-fg tabular-nums">{usd(prizeFor(tier, r.rank))}</span>
			</span>
			<div className="mt-6 flex w-full justify-center gap-6 text-xs text-fg-muted tabular-nums">
				<span>
					Account <span className="text-fg-secondary">{usdCompact(r.accountValue)}</span>
				</span>
				<span>
					24h <span className={pnlClass(r.dayPnl)}>{signedUsd(r.dayPnl, true)}</span>
				</span>
			</div>
			<div className="mt-4 w-full">
				<PnlChart values={path(r)} height={lead ? 120 : 80} labels={lead} />
			</div>
		</article>
	);
}
