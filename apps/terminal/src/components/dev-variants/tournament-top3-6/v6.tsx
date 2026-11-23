import {
	move,
	path,
	pct,
	pnlClass,
	prizeFor,
	signedUsd,
	type Tier,
	type Trader,
	traderName,
	usd,
	usdCompact,
} from "@/components/tournament/data";
import { Identicon, RankMove, Spark } from "@/components/tournament/parts";
import { PnlChart } from "@/components/tournament/pnl-chart";
import { cn } from "@/lib/cn";

interface Props {
	tier: Tier;
	className?: string;
}

export function TopThree({ tier, className }: Props) {
	const [first, ...rest] = tier.traders.slice(0, 3);
	return (
		<section className={cn("flex flex-col gap-2", className)}>
			<article className="flex flex-col rounded-6 bg-surface">
				<div className="flex h-14 items-center gap-3 px-5">
					<span className="text-sm font-semibold text-fg-muted">#1</span>
					<Identicon id={first.address} className="size-8 rounded-4" />
					<span className="text-base font-medium">{traderName(first)}</span>
					<span className="text-sm text-fg-muted tabular-nums">({signedUsd(first.pnl)} round PNL)</span>
					<Move r={first} />
				</div>
				<div className="grid grid-cols-5 gap-px bg-background">
					<Tile label="Prize" value={usd(prizeFor(tier, 1))} />
					<Tile label="Account" value={usdCompact(first.accountValue)} />
					<Tile label="24h PNL" value={signedUsd(first.dayPnl, true)} className={pnlClass(first.dayPnl)} />
					<Tile label="ROI" value={pct(first.roi)} />
					<Tile label="Volume" value={usdCompact(first.vlm)} />
				</div>
				<div className="px-5 pt-4 pb-4">
					<PnlChart values={path(first)} height={96} labels />
				</div>
			</article>
			{rest.map((r) => (
				<article key={r.address} className="flex h-14 items-center gap-3 rounded-6 bg-surface px-5 text-sm">
					<span className="font-semibold text-fg-muted">#{r.rank}</span>
					<Identicon id={r.address} className="size-7 rounded-4" />
					<span className="font-medium">{traderName(r)}</span>
					<span className={cn("tabular-nums", pnlClass(r.pnl))}>({signedUsd(r.pnl)} round PNL)</span>
					<span className="ml-4 text-xs text-fg-muted tabular-nums">
						Prize {usd(prizeFor(tier, r.rank))}
						<span className="mx-2">Account {usdCompact(r.accountValue)}</span>
						24h <span className={pnlClass(r.dayPnl)}>{signedUsd(r.dayPnl, true)}</span>
					</span>
					<span className="ml-auto flex items-center gap-4">
						<Spark values={path(r)} width={64} height={18} />
						<Move r={r} />
					</span>
				</article>
			))}
		</section>
	);
}

function Move({ r }: { r: Trader }) {
	const m = move(r);
	return (
		<span className="ml-auto w-8 text-right text-sm">
			{m === 0 ? <span className="text-fg-muted">-</span> : <RankMove value={m} />}
		</span>
	);
}

function Tile({ label, value, className }: { label: string; value: string; className?: string }) {
	return (
		<div className="flex flex-col gap-1 bg-surface px-5 py-3 tabular-nums">
			<span className="text-xs text-fg-muted">{label}</span>
			<span className={cn("text-sm font-medium", className)}>{value}</span>
		</div>
	);
}
