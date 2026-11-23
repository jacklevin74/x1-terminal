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
import { PnlChart } from "@/components/tournament/pnl-chart";
import { cn } from "@/lib/cn";

interface Props {
	tier: Tier;
	className?: string;
}

const COLS = "grid-cols-[32px_minmax(0,1fr)_140px_120px_120px_100px_120px]";

export function TopThree({ tier, className }: Props) {
	const [first, ...rest] = tier.traders.slice(0, 3);
	return (
		<section className={cn("flex flex-col gap-2", className)}>
			<article className="grid grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)] gap-12 rounded-8 bg-surface p-8">
				<div className="flex flex-col">
					<div className="flex items-center gap-3">
						<Identicon id={first.address} className="size-8 rounded-4" />
						<span className="text-base">{traderName(first)}</span>
						<span className="text-xs text-fg-muted tabular-nums">1st of {tier.count.toLocaleString()}</span>
					</div>
					<span
						className={cn("mt-6 text-5xl leading-none font-semibold tracking-tight tabular-nums", pnlClass(first.pnl))}
					>
						{signedUsd(first.pnl)}
					</span>
					<span className="mt-3 text-sm text-fg-muted tabular-nums">
						Leads by <span className="text-fg">{usd(first.pnl - rest[0].pnl)}</span>, wins{" "}
						<span className="text-fg">{usd(prizeFor(tier, 1))}</span>
					</span>
					<div className="mt-auto flex gap-6 pt-8 text-xs text-fg-muted tabular-nums">
						<span>
							Account <span className="text-fg-secondary">{usdCompact(first.accountValue)}</span>
						</span>
						<span>
							24h <span className={pnlClass(first.dayPnl)}>{signedUsd(first.dayPnl, true)}</span>
						</span>
					</div>
				</div>
				<div className="self-end">
					<PnlChart values={path(first)} height={160} labels />
				</div>
			</article>
			<div className="rounded-8 bg-surface px-3 py-2">
				<div className={cn("grid h-8 items-center gap-4 px-3 text-xs text-fg-muted", COLS)}>
					<span />
					<span>Trader</span>
					<span className="text-right">Round PNL</span>
					<span className="text-right">Prize</span>
					<span className="text-right">Account</span>
					<span className="text-right">24h</span>
					<span className="pl-4">30d</span>
				</div>
				{rest.map((r) => (
					<Row key={r.address} r={r} tier={tier} />
				))}
			</div>
		</section>
	);
}

function Row({ r, tier }: { r: Trader; tier: Tier }) {
	return (
		<div className={cn("grid h-12 items-center gap-4 rounded-6 px-3 text-xs tabular-nums", COLS)}>
			<span className="text-base font-semibold text-fg-muted">{r.rank}</span>
			<span className="flex min-w-0 items-center gap-2">
				<Identicon id={r.address} className="size-6 rounded-4" />
				<span className="truncate text-sm">{traderName(r)}</span>
			</span>
			<span className={cn("text-right text-sm font-semibold", pnlClass(r.pnl))}>{signedUsd(r.pnl)}</span>
			<span className="text-right text-fg">{usd(prizeFor(tier, r.rank))}</span>
			<span className="text-right text-fg-secondary">{usdCompact(r.accountValue)}</span>
			<span className={cn("text-right", pnlClass(r.dayPnl))}>{signedUsd(r.dayPnl, true)}</span>
			<span className="pl-4">
				<Spark values={path(r)} width={72} height={18} />
			</span>
		</div>
	);
}
