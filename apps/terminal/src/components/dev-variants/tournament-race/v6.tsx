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
	return (
		<section className={cn("grid grid-cols-[400px_minmax(0,1fr)] gap-2", className)}>
			<div className="flex flex-col justify-between rounded-12 bg-control-hover p-7">
				<div className="flex flex-col gap-2">
					<span className="text-2xs tracking-micro text-fg-muted uppercase">Round 1 race</span>
					<span className="text-5xl leading-none font-black tracking-tight tabular-nums">{usd(tier.pot)}</span>
					<span className="text-sm text-fg-muted">Pot. 80% goes to the top 3.</span>
				</div>
				<div className="mt-10 flex flex-col gap-1">
					<span className="text-2xs tracking-micro text-fg-muted uppercase">Ends in</span>
					<span className="text-2xl leading-none font-bold whitespace-nowrap tabular-nums">
						{t.d}d {pad(t.h)}h {pad(t.m)}m {pad(t.s)}s
					</span>
				</div>
			</div>
			<div className="flex flex-col gap-2">
				{tier.traders.slice(0, 3).map((r) => (
					<div
						key={r.address}
						className="grid flex-1 grid-cols-[160px_minmax(0,1fr)] items-center gap-6 rounded-12 bg-surface px-6 py-4"
					>
						<div className="flex flex-col gap-1">
							<span className={cn("text-xs font-bold", r.rank === 1 ? "text-fg" : "text-fg-muted")}>
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
