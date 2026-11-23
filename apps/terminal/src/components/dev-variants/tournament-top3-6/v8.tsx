import {
	pad,
	path,
	pnlClass,
	prizeFor,
	signedUsd,
	type Tier,
	type Trader,
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
		<section className={cn("flex flex-col overflow-hidden rounded-12 bg-surface", className)}>
			<div className="flex items-center justify-between bg-control-hover px-8 py-6">
				<div className="flex flex-col gap-1">
					<span className="text-2xs tracking-micro text-fg-muted uppercase">Round 1 race</span>
					<span className="text-4xl leading-none font-black tracking-tight tabular-nums">{usd(tier.pot)} pot</span>
				</div>
				<div className="flex items-center gap-2 tabular-nums">
					{[
						[t.d, "days"],
						[pad(t.h), "hrs"],
						[pad(t.m), "min"],
						[pad(t.s), "sec"],
					].map(([v, l]) => (
						<span key={l} className="flex w-16 flex-col items-center rounded-8 bg-surface py-2">
							<span className="text-2xl leading-none font-bold">{v}</span>
							<span className="mt-1 text-2xs tracking-micro text-fg-muted uppercase">{l}</span>
						</span>
					))}
				</div>
			</div>
			<div className="grid grid-cols-3 gap-px bg-background">
				{tier.traders.slice(0, 3).map((r) => (
					<Position key={r.address} r={r} tier={tier} />
				))}
			</div>
		</section>
	);
}

function Position({ r, tier }: { r: Trader; tier: Tier }) {
	const lead = r.rank === 1;
	return (
		<div className="flex flex-col gap-4 bg-surface p-6">
			<div className="flex items-baseline justify-between">
				<span className={cn("text-sm font-bold", lead ? "text-fg" : "text-fg-muted")}>{PLACE[r.rank - 1]}</span>
				<span className="text-2xl font-black tracking-tight tabular-nums">{usd(prizeFor(tier, r.rank))}</span>
			</div>
			<div className="flex items-center gap-3 rounded-8 bg-control p-3">
				<Identicon id={r.address} className="size-9 rounded-full" />
				<div className="flex min-w-0 flex-1 flex-col gap-0.5">
					<span className="truncate text-sm font-medium">{traderName(r)}</span>
					<span className="text-xs text-fg-muted tabular-nums">
						{usdCompact(r.accountValue)} account,{" "}
						<span className={pnlClass(r.dayPnl)}>{signedUsd(r.dayPnl, true)}</span> 24h
					</span>
				</div>
				<div className="flex flex-col items-end">
					<span className={cn("text-base font-semibold tabular-nums", pnlClass(r.pnl))}>{signedUsd(r.pnl)}</span>
					<Spark values={path(r)} width={56} height={14} />
				</div>
			</div>
		</div>
	);
}
