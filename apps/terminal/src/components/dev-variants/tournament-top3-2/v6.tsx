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

export function TopThree({ tier, className }: Props) {
	return (
		<section className={cn("grid grid-cols-3 gap-2", className)}>
			{tier.traders.slice(0, 3).map((r) => (
				<Card key={r.address} r={r} tier={tier} />
			))}
		</section>
	);
}

function Line({ label, value, className }: { label: string; value: string; className?: string }) {
	return (
		<div className="flex h-8 items-center justify-between rounded-4 px-3 text-xs tabular-nums odd:bg-band">
			<dt className="text-fg-muted">{label}</dt>
			<dd className={cn("font-medium", className)}>{value}</dd>
		</div>
	);
}

function Card({ r, tier }: { r: Trader; tier: Tier }) {
	return (
		<article className="flex flex-col rounded-8 bg-surface p-5">
			<div className="grid grid-cols-[112px_minmax(0,1fr)] gap-5">
				<div className="flex flex-col">
					<span
						className={cn(
							"text-5xl leading-none font-light tracking-tight tabular-nums",
							r.rank === 1 ? "text-fg" : "text-fg-muted",
						)}
					>
						{r.rank}
					</span>
					<Identicon id={r.address} className="mt-auto size-10 rounded-6" />
					<span className="mt-2 truncate text-xs">{traderName(r)}</span>
				</div>
				<dl className="flex flex-col">
					<Line label="Round PNL" value={signedUsd(r.pnl)} className={cn("text-sm font-semibold", pnlClass(r.pnl))} />
					<Line label="Prize" value={usd(prizeFor(tier, r.rank))} className="text-fg" />
					<Line label="Account" value={usdCompact(r.accountValue)} className="text-fg-secondary" />
					<Line label="24h" value={signedUsd(r.dayPnl, true)} className={pnlClass(r.dayPnl)} />
				</dl>
			</div>
			<div className="mt-5">
				<PnlChart values={path(r)} height={64} labels />
			</div>
		</article>
	);
}
