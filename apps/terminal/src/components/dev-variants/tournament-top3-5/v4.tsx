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
import { Identicon, Spark } from "@/components/tournament/parts";
import { cn } from "@/lib/cn";

interface Props {
	tier: Tier;
	className?: string;
}

const PLACE = ["1st", "2nd", "3rd"];
const SIZE = 112;
const R = 50;
const C = 2 * Math.PI * R;

export function TopThree({ tier, className }: Props) {
	const lead = tier.traders[0].pnl;
	return (
		<section className={cn("grid grid-cols-3 gap-2", className)}>
			{tier.traders.slice(0, 3).map((r) => (
				<Card key={r.address} r={r} tier={tier} share={Math.max(0, r.pnl / lead)} />
			))}
		</section>
	);
}

function Card({ r, tier, share }: { r: Trader; tier: Tier; share: number }) {
	return (
		<article className="flex flex-col rounded-8 bg-surface p-6">
			<div className="flex items-center gap-6">
				<span className="relative grid flex-none place-items-center" style={{ width: SIZE, height: SIZE }}>
					<svg
						width={SIZE}
						height={SIZE}
						viewBox={`0 0 ${SIZE} ${SIZE}`}
						className="absolute inset-0 -rotate-90"
						aria-hidden="true"
					>
						<circle cx={SIZE / 2} cy={SIZE / 2} r={R} fill="none" stroke="var(--color-control)" strokeWidth={6} />
						<circle
							cx={SIZE / 2}
							cy={SIZE / 2}
							r={R}
							fill="none"
							stroke="var(--color-market-up)"
							strokeWidth={6}
							strokeLinecap="round"
							strokeDasharray={C}
							strokeDashoffset={C * (1 - share)}
						/>
					</svg>
					<Identicon id={r.address} className="size-16 rounded-full" />
				</span>
				<div className="flex min-w-0 flex-col gap-1">
					<span className={cn("text-xs font-semibold", r.rank === 1 ? "text-fg" : "text-fg-muted")}>
						{PLACE[r.rank - 1]}
					</span>
					<span className="truncate text-sm">{traderName(r)}</span>
					<span className={cn("mt-1 text-2xl leading-none font-semibold tabular-nums", pnlClass(r.pnl))}>
						{signedUsd(r.pnl)}
					</span>
					<span className="text-xs text-fg-muted tabular-nums">
						{r.rank === 1 ? "Sets the pace" : `${Math.round(share * 100)}% of the leader`}
					</span>
				</div>
			</div>
			<dl className="mt-6 grid grid-cols-3 gap-4 tabular-nums">
				<Stat label="Prize" value={usd(prizeFor(tier, r.rank))} className="text-fg" />
				<Stat label="Account" value={usdCompact(r.accountValue)} className="text-fg-secondary" />
				<Stat label="24h" value={signedUsd(r.dayPnl, true)} className={pnlClass(r.dayPnl)} />
			</dl>
			<div className="mt-5 flex items-center justify-between">
				<span className="text-xs text-fg-muted">30 days</span>
				<Spark values={path(r)} width={120} height={24} />
			</div>
		</article>
	);
}

function Stat({ label, value, className }: { label: string; value: string; className?: string }) {
	return (
		<div className="flex flex-col gap-1">
			<dt className="text-xs text-fg-muted">{label}</dt>
			<dd className={cn("text-sm font-medium", className)}>{value}</dd>
		</div>
	);
}
