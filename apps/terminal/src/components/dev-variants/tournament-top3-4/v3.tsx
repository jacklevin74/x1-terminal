import {
	path,
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

const PLACE = ["1st place", "2nd place", "3rd place"];

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
	const up = r.pnl >= 0;
	const tone = up ? "var(--color-market-up)" : "var(--color-market-down)";
	return (
		<article className="flex flex-col rounded-24 bg-control p-7">
			<div className="flex items-center gap-3">
				<Identicon id={r.address} className="size-12 rounded-full" />
				<div className="flex min-w-0 flex-col gap-0.5">
					<span className="truncate text-base font-medium">{traderName(r)}</span>
					<span className="text-sm text-fg-muted">{PLACE[r.rank - 1]}</span>
				</div>
			</div>
			<span className="mt-8 text-sm text-fg-muted">This round</span>
			<span className="mt-1 text-4xl leading-none font-medium tracking-tight tabular-nums">{signedUsd(r.pnl)}</span>
			<div className="mt-6 rounded-16 bg-surface px-5 pt-5 pb-4">
				<Line
					values={path(r)}
					height={72}
					stroke={tone}
					fill={`color-mix(in oklch, ${tone} 12%, var(--color-surface))`}
				/>
				<div className="mt-3 flex justify-between text-xs text-fg-muted">
					<span>30 days ago</span>
					<span>Today</span>
				</div>
			</div>
			<div className="mt-5 flex flex-wrap gap-2">
				<Chip label="Wins" value={usd(prizeFor(tier, r.rank))} />
				<Chip label="Account" value={usdCompact(r.accountValue)} />
				<Chip label="Today" value={signedUsd(r.dayPnl, true)} />
			</div>
		</article>
	);
}

function Chip({ label, value }: { label: string; value: string }) {
	return (
		<span className="flex h-8 items-center gap-1.5 rounded-full bg-surface px-3 text-xs tabular-nums">
			<span className="text-fg-muted">{label}</span>
			<span className="font-medium">{value}</span>
		</span>
	);
}
