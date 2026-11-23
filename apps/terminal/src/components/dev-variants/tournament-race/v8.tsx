import { pad, prizeFor, type Tier, usd, useTimeLeft } from "@/components/tournament/data";
import { cn } from "@/lib/cn";
import { TraderRow } from "./trader-row";

interface Props {
	tier: Tier;
	className?: string;
}

const PLACE = ["1st", "2nd", "3rd"];
const UP = "var(--color-market-up)";

export function TopThree({ tier, className }: Props) {
	const t = useTimeLeft();
	const units = [
		[String(t.d), "d"],
		[pad(t.h), "h"],
		[pad(t.m), "m"],
		[pad(t.s), "s"],
	];
	return (
		<section className={cn("flex flex-col overflow-hidden rounded-12 bg-surface", className)}>
			<div
				className="flex items-center justify-between px-8 py-6"
				style={{ backgroundColor: `color-mix(in oklch, ${UP} 14%, var(--color-surface))` }}
			>
				<div className="flex flex-col gap-1">
					<span className="text-2xs tracking-micro text-market-up uppercase">Live, round 1</span>
					<span className="text-4xl leading-none font-black tracking-tight tabular-nums">{usd(tier.pot)} pot</span>
				</div>
				<div className="flex items-baseline gap-3 text-market-up tabular-nums">
					{units.map(([v, l]) => (
						<span key={l} className="flex items-baseline gap-0.5">
							<span className="text-4xl leading-none font-black">{v}</span>
							<span className="text-sm">{l}</span>
						</span>
					))}
				</div>
			</div>
			<div className="grid grid-cols-3 gap-px bg-background">
				{tier.traders.slice(0, 3).map((r) => (
					<div key={r.address} className="flex flex-col gap-4 bg-surface p-6">
						<div className="flex items-baseline justify-between">
							<span className="text-sm font-bold text-fg-muted">{PLACE[r.rank - 1]}</span>
							<span className="text-2xl font-black tracking-tight text-market-up tabular-nums">
								{usd(prizeFor(tier, r.rank))}
							</span>
						</div>
						<TraderRow r={r} />
					</div>
				))}
			</div>
		</section>
	);
}
