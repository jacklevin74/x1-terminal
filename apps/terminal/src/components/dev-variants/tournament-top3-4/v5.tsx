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
import { hueOf, Identicon } from "@/components/tournament/parts";
import { cn } from "@/lib/cn";
import { Line } from "./line";

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
	const hue = hueOf(r.address);
	return (
		<article
			className="relative isolate flex h-[300px] flex-col overflow-hidden rounded-16 p-6"
			style={{ backgroundColor: `oklch(0.21 0.035 ${hue})` }}
		>
			<Identicon id={r.address} className="absolute -top-10 -right-10 -z-10 size-[260px] rounded-none opacity-40" />
			<div className="flex items-center gap-2">
				<span className="rounded-full bg-fill px-2.5 py-1 text-2xs font-semibold tracking-micro text-fg-inverse uppercase">
					{PLACE[r.rank - 1]}
				</span>
				<span className="text-sm">{traderName(r)}</span>
			</div>
			<span className={cn("mt-auto text-4xl leading-none font-semibold tracking-tight tabular-nums", pnlClass(r.pnl))}>
				{signedUsd(r.pnl)}
			</span>
			<div className="mt-3 flex gap-4 text-xs text-fg-secondary tabular-nums">
				<span>Wins {usd(prizeFor(tier, r.rank))}</span>
				<span>Account {usdCompact(r.accountValue)}</span>
				<span className={pnlClass(r.dayPnl)}>{signedUsd(r.dayPnl, true)} 24h</span>
			</div>
			<div className="mt-5">
				<Line values={path(r)} height={48} stroke="var(--color-fg)" before="var(--color-fg-muted)" />
			</div>
		</article>
	);
}
