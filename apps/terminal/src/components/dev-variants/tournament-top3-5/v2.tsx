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
import { cn } from "@/lib/cn";
import { Line } from "./line";

interface Props {
	tier: Tier;
	className?: string;
}

const PLACE = ["1st", "2nd", "3rd"];

export function TopThree({ tier, className }: Props) {
	return (
		<section className={cn("grid grid-cols-3 gap-3", className)}>
			{tier.traders.slice(0, 3).map((r) => (
				<Card key={r.address} r={r} tier={tier} />
			))}
		</section>
	);
}

function Card({ r, tier }: { r: Trader; tier: Tier }) {
	return (
		<article className="flex flex-col overflow-hidden rounded-16 bg-surface">
			<div className="relative h-[220px]">
				<Identicon id={r.address} className="absolute inset-0 size-full rounded-none" />
				<div
					className="absolute inset-0"
					style={{ background: "linear-gradient(180deg, transparent 35%, var(--color-surface) 100%)" }}
				/>
				<span
					className={cn(
						"absolute top-4 left-4 rounded-full px-2.5 py-1 text-2xs font-semibold tracking-micro uppercase",
						r.rank === 1 ? "bg-fill text-fg-inverse" : "bg-surface text-fg",
					)}
				>
					{PLACE[r.rank - 1]}
				</span>
				<div className="absolute inset-x-6 bottom-0 flex flex-col gap-1">
					<span className="text-lg font-medium">{traderName(r)}</span>
					<span className="text-xs text-fg-secondary tabular-nums">Account {usdCompact(r.accountValue)}</span>
				</div>
			</div>
			<div className="flex flex-col px-6 pt-5 pb-6">
				<span className={cn("text-3xl leading-none font-semibold tracking-tight tabular-nums", pnlClass(r.pnl))}>
					{signedUsd(r.pnl)}
				</span>
				<span className="mt-1.5 text-xs text-fg-muted tabular-nums">
					Round PNL, <span className={pnlClass(r.dayPnl)}>{signedUsd(r.dayPnl, true)}</span> in 24h
				</span>
				<div className="mt-5">
					<Line
						values={path(r)}
						height={56}
						stroke={r.pnl >= 0 ? "var(--color-market-up)" : "var(--color-market-down)"}
					/>
				</div>
				<div className="mt-5 flex h-10 items-center justify-between rounded-8 bg-control px-4 text-sm tabular-nums">
					<span className="text-fg-muted">Prize</span>
					<span className="font-semibold">{usd(prizeFor(tier, r.rank))}</span>
				</div>
			</div>
		</article>
	);
}
