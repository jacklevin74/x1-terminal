import { pad, prizeFor, type Tier, usd, useTimeLeft } from "@/components/tournament/data";
import { cn } from "@/lib/cn";
import { TraderRow } from "./trader-row";

interface Props {
	tier: Tier;
	className?: string;
}

const PLACE = ["1st", "2nd", "3rd"];

export function TopThree({ tier, className }: Props) {
	const t = useTimeLeft();
	const units = [
		[String(t.d), "days"],
		[pad(t.h), "hrs"],
		[pad(t.m), "min"],
		[pad(t.s), "sec"],
	];
	return (
		<section className={cn("flex flex-col overflow-hidden rounded-12 bg-surface", className)}>
			<div className="flex items-center justify-between bg-control-hover px-8 py-6">
				<div className="flex flex-col gap-1">
					<span className="text-2xs tracking-micro text-fg-muted uppercase">Round 1 race</span>
					<span className="text-4xl leading-none font-black tracking-tight tabular-nums">{usd(tier.pot)} pot</span>
				</div>
				<div className="flex items-center gap-2 tabular-nums">
					{units.map(([v, l]) => (
						<span key={l} className="flex w-16 flex-col items-center rounded-8 bg-surface py-2">
							<span className="text-2xl leading-none font-bold">{v}</span>
							<span className="mt-1 text-2xs tracking-micro text-fg-muted uppercase">{l}</span>
						</span>
					))}
				</div>
			</div>
			<div className="grid grid-cols-3 gap-px bg-background">
				{tier.traders.slice(0, 3).map((r) => (
					<div key={r.address} className="flex flex-col gap-4 bg-surface p-6">
						<div className="flex items-baseline justify-between">
							<span className={cn("text-sm font-bold", r.rank === 1 ? "text-fg" : "text-fg-muted")}>
								{PLACE[r.rank - 1]}
							</span>
							<span className="text-2xl font-black tracking-tight tabular-nums">{usd(prizeFor(tier, r.rank))}</span>
						</div>
						<TraderRow r={r} />
					</div>
				))}
			</div>
		</section>
	);
}
