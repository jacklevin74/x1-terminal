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

const WORD = ["First", "Second", "Third"];

export function TopThree({ tier, className }: Props) {
	return (
		<section className={cn("flex flex-col gap-2", className)}>
			{tier.traders.slice(0, 3).map((r) => (
				<Band key={r.address} r={r} tier={tier} />
			))}
		</section>
	);
}

function Band({ r, tier }: { r: Trader; tier: Tier }) {
	return (
		<article className="grid grid-cols-[120px_minmax(0,1fr)_auto] items-center gap-8 rounded-8 bg-surface px-8 py-6">
			<span className="text-2xs tracking-micro text-fg-muted uppercase">{WORD[r.rank - 1]}</span>
			<span className={cn("truncate text-7xl leading-none font-black tracking-tighter tabular-nums", pnlClass(r.pnl))}>
				{signedUsd(r.pnl)}
			</span>
			<div className="flex items-center gap-10">
				<dl className="grid grid-cols-3 gap-8 text-right tabular-nums">
					<div className="flex flex-col gap-1">
						<dt className="text-2xs tracking-micro text-fg-muted uppercase">Prize</dt>
						<dd className="text-base font-semibold">{usd(prizeFor(tier, r.rank))}</dd>
					</div>
					<div className="flex flex-col gap-1">
						<dt className="text-2xs tracking-micro text-fg-muted uppercase">Account</dt>
						<dd className="text-base font-semibold text-fg-secondary">{usdCompact(r.accountValue)}</dd>
					</div>
					<div className="flex flex-col gap-1">
						<dt className="text-2xs tracking-micro text-fg-muted uppercase">24h</dt>
						<dd className={cn("text-base font-semibold", pnlClass(r.dayPnl))}>{signedUsd(r.dayPnl, true)}</dd>
					</div>
				</dl>
				<div className="flex w-[200px] items-center gap-3">
					<Identicon id={r.address} className="size-8 rounded-4" />
					<div className="flex min-w-0 flex-col">
						<span className="truncate text-sm">{traderName(r)}</span>
						<Spark values={path(r)} width={100} height={16} />
					</div>
				</div>
			</div>
		</article>
	);
}
