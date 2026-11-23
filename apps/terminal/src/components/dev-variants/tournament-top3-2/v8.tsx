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

const PLACE = ["1st", "2nd", "3rd"];

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
	const lead = r.rank === 1;
	return (
		<article className="flex flex-col overflow-hidden rounded-8 bg-surface">
			<div className={cn("flex items-center gap-3 px-5 py-3", lead ? "bg-fill text-fg-inverse" : "bg-control")}>
				<span className="text-xs font-semibold tabular-nums">{PLACE[r.rank - 1]}</span>
				<span className={cn("ml-auto text-xs tabular-nums", lead ? "text-fg-inverse-muted" : "text-fg-muted")}>
					Prize{" "}
					<span className={cn("font-medium", lead ? "text-fg-inverse" : "text-fg")}>{usd(prizeFor(tier, r.rank))}</span>
				</span>
			</div>
			<div className="flex flex-col p-5">
				<div className="flex items-center gap-3">
					<Identicon id={r.address} className="size-9 rounded-4" />
					<div className="flex min-w-0 flex-col gap-0.5">
						<span className="truncate text-sm">{traderName(r)}</span>
						<span className="text-xs text-fg-muted tabular-nums">Account {usdCompact(r.accountValue)}</span>
					</div>
				</div>
				<div className="mt-5 flex items-baseline justify-between tabular-nums">
					<span className={cn("text-2xl leading-none font-semibold", pnlClass(r.pnl))}>{signedUsd(r.pnl)}</span>
					<span className={cn("text-xs", pnlClass(r.dayPnl))}>{signedUsd(r.dayPnl, true)} 24h</span>
				</div>
				<div className="mt-5">
					<PnlChart values={path(r)} height={80} labels />
				</div>
			</div>
		</article>
	);
}
