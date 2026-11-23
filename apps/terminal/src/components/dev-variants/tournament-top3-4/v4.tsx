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

export function TopThree({ tier, className }: Props) {
	const lead = tier.traders[0].pnl;
	return (
		<section className={cn("grid grid-cols-3 gap-px overflow-hidden rounded-6 bg-background", className)}>
			{tier.traders.slice(0, 3).map((r) => (
				<Cell key={r.address} r={r} tier={tier} share={r.pnl / lead} />
			))}
		</section>
	);
}

function Cell({ r, tier, share }: { r: Trader; tier: Tier; share: number }) {
	return (
		<article className="flex flex-col gap-px bg-background">
			<div className="flex items-center justify-between bg-surface px-4 py-3">
				<span className="text-2xs tracking-micro text-fg-muted uppercase">Rank {r.rank}</span>
				<span className="flex items-center gap-2 text-2xs tracking-micro uppercase">
					<Identicon id={r.address} className="size-4 rounded-xs" />
					{traderName(r)}
				</span>
			</div>
			<div className="flex flex-col gap-3 bg-surface px-4 py-4">
				<span className="text-2xs tracking-micro text-fg-muted uppercase">Round PNL</span>
				<span className="text-3xl leading-none font-semibold tabular-nums">{signedUsd(r.pnl)}</span>
				<span className="h-2 w-full bg-control">
					<span className="block h-2 bg-fill" style={{ width: `${share * 100}%` }} />
				</span>
			</div>
			<div className="grid grid-cols-3 gap-px">
				<Stat label="Prize" value={usd(prizeFor(tier, r.rank))} />
				<Stat label="Account" value={usdCompact(r.accountValue)} />
				<Stat label="24h" value={signedUsd(r.dayPnl, true)} />
			</div>
			<div className="bg-surface px-4 pt-3 pb-3">
				<Line values={path(r)} height={48} stroke="var(--color-fg)" />
			</div>
		</article>
	);
}

function Stat({ label, value }: { label: string; value: string }) {
	return (
		<div className="flex flex-col gap-1.5 bg-surface px-4 py-3">
			<span className="text-2xs tracking-micro text-fg-muted uppercase">{label}</span>
			<span className="text-sm font-medium tabular-nums">{value}</span>
		</div>
	);
}
