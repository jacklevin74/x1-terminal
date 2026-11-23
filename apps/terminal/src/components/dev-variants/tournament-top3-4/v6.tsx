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
	const tone = r.pnl >= 0 ? "var(--color-market-up)" : "var(--color-market-down)";
	return (
		<article className="relative isolate flex h-[260px] flex-col overflow-hidden rounded-16 bg-surface">
			<div className="absolute inset-x-0 bottom-0 -z-10 h-[160px]">
				<Line
					values={path(r)}
					height={160}
					stroke={tone}
					before="transparent"
					fill={`color-mix(in oklch, ${tone} 22%, var(--color-surface))`}
				/>
			</div>
			<div className="flex items-center gap-3 p-6">
				<Identicon id={r.address} className="size-8 rounded-4" />
				<span className="text-sm">{traderName(r)}</span>
				<span className="ml-auto text-sm font-semibold tabular-nums">#{r.rank}</span>
			</div>
			<div className="mt-auto flex items-end justify-between p-6">
				<div className="flex flex-col gap-2">
					<span className={cn("text-4xl leading-none font-semibold tracking-tight tabular-nums", pnlClass(r.pnl))}>
						{signedUsd(r.pnl)}
					</span>
					<span className="text-xs text-fg-secondary tabular-nums">
						Wins <span className="text-fg">{usd(prizeFor(tier, r.rank))}</span>
					</span>
				</div>
				<div className="flex flex-col items-end gap-1 text-xs text-fg-secondary tabular-nums">
					<span>Account {usdCompact(r.accountValue)}</span>
					<span className={pnlClass(r.dayPnl)}>{signedUsd(r.dayPnl, true)} 24h</span>
				</div>
			</div>
		</article>
	);
}
