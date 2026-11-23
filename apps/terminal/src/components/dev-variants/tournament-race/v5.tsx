import { pad, prizeFor, roundDates, type Tier, usd, useTimeLeft } from "@/components/tournament/data";
import { cn } from "@/lib/cn";
import { TraderRow } from "./trader-row";

interface Props {
	tier: Tier;
	className?: string;
}

const ROUND_MS = 7 * 24 * 3600 * 1000;
const PLACE = ["1st", "2nd", "3rd"];

export function TopThree({ tier, className }: Props) {
	const t = useTimeLeft();
	const dates = roundDates(t.ms);
	const done = 1 - t.ms / ROUND_MS;
	return (
		<section className={cn("flex flex-col gap-2", className)}>
			<div className="flex flex-col gap-5 rounded-12 bg-surface p-6">
				<div className="flex items-end justify-between">
					<div className="flex flex-col gap-1">
						<span className="text-sm text-fg-muted">
							Round 1, {dates.start} to {dates.end}
						</span>
						<span className="text-3xl leading-none font-semibold tabular-nums">{usd(tier.pot)} pot</span>
					</div>
					<span className="text-sm text-fg-muted tabular-nums">
						<span className="text-fg">
							{t.d}d {pad(t.h)}h {pad(t.m)}m {pad(t.s)}s
						</span>{" "}
						left
					</span>
				</div>
				<div className="flex flex-col gap-2">
					<span className="h-2 w-full overflow-hidden rounded-full bg-control">
						<span className="block h-2 rounded-full bg-fill" style={{ width: `${done * 100}%` }} />
					</span>
					<div className="flex justify-between text-2xs tracking-micro text-fg-muted uppercase">
						<span>Start</span>
						<span>{Math.round(done * 100)}% of the round done</span>
						<span>End</span>
					</div>
				</div>
			</div>
			<div className="grid grid-cols-3 gap-2">
				{tier.traders.slice(0, 3).map((r) => (
					<div key={r.address} className="flex flex-col gap-4 rounded-12 bg-surface p-5">
						<div className="flex items-baseline justify-between">
							<span className="text-sm text-fg-muted">{PLACE[r.rank - 1]}</span>
							<span className="text-xl font-semibold tabular-nums">{usd(prizeFor(tier, r.rank))}</span>
						</div>
						<TraderRow r={r} />
					</div>
				))}
			</div>
		</section>
	);
}
