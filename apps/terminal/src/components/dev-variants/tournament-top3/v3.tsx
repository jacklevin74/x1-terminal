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
	const [first, second, third] = tier.traders;
	return (
		<section className={cn("flex flex-col gap-2", className)}>
			<article className="flex items-center gap-10 rounded-8 bg-surface p-6">
				<div className="flex w-[320px] flex-none flex-col">
					<div className="flex items-center gap-3">
						<Identicon id={first.address} className="size-12 rounded-6" />
						<div className="flex min-w-0 flex-col gap-0.5">
							<span className="truncate text-base">{traderName(first)}</span>
							<span className="text-xs text-fg-muted">Leader, 1st of {tier.count.toLocaleString()}</span>
						</div>
					</div>
					<span className={cn("mt-8 text-3xl leading-none font-semibold tabular-nums", pnlClass(first.pnl))}>
						{signedUsd(first.pnl)}
					</span>
					<dl className="mt-5 grid grid-cols-3 gap-4 text-xs tabular-nums">
						<Stat label="Prize" value={usd(prizeFor(tier, 1))} />
						<Stat label="Account" value={usdCompact(first.accountValue)} muted />
						<Stat label="24h" value={signedUsd(first.dayPnl, true)} className={pnlClass(first.dayPnl)} />
					</dl>
				</div>
				<div className="min-w-0 flex-1 self-stretch">
					<PnlChart values={path(first)} height={150} labels />
				</div>
			</article>
			<div className="grid grid-cols-2 gap-2">
				<Compact r={second} tier={tier} />
				<Compact r={third} tier={tier} />
			</div>
		</section>
	);
}

function Stat({
	label,
	value,
	muted,
	className,
}: {
	label: string;
	value: string;
	muted?: boolean;
	className?: string;
}) {
	return (
		<div className="flex flex-col gap-1">
			<dt className="text-fg-muted">{label}</dt>
			<dd className={cn("text-sm font-medium", muted ? "text-fg-secondary" : "text-fg", className)}>{value}</dd>
		</div>
	);
}

function Compact({ r, tier }: { r: Trader; tier: Tier }) {
	return (
		<article className="flex items-center gap-4 rounded-8 bg-surface px-5 py-4">
			<span className="w-5 text-lg leading-none font-semibold text-fg-muted tabular-nums">{r.rank}</span>
			<Identicon id={r.address} className="size-8 rounded-4" />
			<div className="flex min-w-0 flex-1 flex-col gap-1">
				<span className="truncate text-sm">{traderName(r)}</span>
				<span className="text-xs whitespace-nowrap text-fg-muted tabular-nums">
					Prize <span className="text-fg">{usd(prizeFor(tier, r.rank))}</span>
					<span className="mx-2">Account</span>
					<span className="text-fg-secondary">{usdCompact(r.accountValue)}</span>
					<span className="mx-2">24h</span>
					<span className={pnlClass(r.dayPnl)}>{signedUsd(r.dayPnl, true)}</span>
				</span>
			</div>
			<span className={cn("text-lg leading-none font-semibold tabular-nums", pnlClass(r.pnl))}>{signedUsd(r.pnl)}</span>
			<div className="w-[120px] flex-none">
				<PnlChart values={path(r)} height={40} />
			</div>
		</article>
	);
}
