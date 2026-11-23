import {
	pad,
	path,
	pnlClass,
	prizeFor,
	signedUsd,
	type Tier,
	traderName,
	usd,
	usdCompact,
	useTimeLeft,
} from "@/components/tournament/data";
import { Identicon, Spark } from "@/components/tournament/parts";
import { cn } from "@/lib/cn";

interface Props {
	tier: Tier;
	className?: string;
}

const PLACE = ["1st", "2nd", "3rd"];

export function TopThree({ tier, className }: Props) {
	const t = useTimeLeft();
	return (
		<section className={cn("flex flex-col items-center rounded-16 bg-surface px-8 pt-10 pb-8", className)}>
			<span className="text-2xs tracking-micro text-fg-muted uppercase">Round 1 prize pool</span>
			<span className="mt-3 text-7xl leading-none font-black tracking-tighter tabular-nums">{usd(tier.pot)}</span>
			<span className="mt-4 text-sm text-fg-muted tabular-nums">
				Ends in {t.d}d {pad(t.h)}h {pad(t.m)}m {pad(t.s)}s
			</span>
			<div className="mt-10 grid w-full grid-cols-3 gap-2">
				{tier.traders.slice(0, 3).map((r) => (
					<div key={r.address} className="flex flex-col items-center rounded-12 bg-control p-6 text-center">
						<Identicon id={r.address} className="size-14 rounded-full" />
						<span className="mt-3 text-sm">{traderName(r)}</span>
						<span className={cn("mt-1 text-lg font-semibold tabular-nums", pnlClass(r.pnl))}>{signedUsd(r.pnl)}</span>
						<span className="mt-4 text-2xs tracking-micro text-fg-muted uppercase">{PLACE[r.rank - 1]} prize</span>
						<span className="mt-1 text-2xl font-black tracking-tight tabular-nums">{usd(prizeFor(tier, r.rank))}</span>
						<span className="mt-3 text-xs text-fg-muted tabular-nums">
							{usdCompact(r.accountValue)} account,{" "}
							<span className={pnlClass(r.dayPnl)}>{signedUsd(r.dayPnl, true)}</span> 24h
						</span>
						<div className="mt-2">
							<Spark values={path(r)} width={80} height={18} />
						</div>
					</div>
				))}
			</div>
		</section>
	);
}
