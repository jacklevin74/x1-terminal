import { pad, prizeFor, type Tier, usd, useTimeLeft } from "@/components/tournament/data";
import { cn } from "@/lib/cn";
import { TraderRow } from "./trader-row";

interface Props {
	tier: Tier;
	className?: string;
}

const PLACE = ["1st place", "2nd place", "3rd place"];

export function TopThree({ tier, className }: Props) {
	const t = useTimeLeft();
	return (
		<section className={cn("flex flex-col gap-2", className)}>
			<div className="flex items-center justify-between rounded-16 bg-inverse-surface px-8 py-7 text-fg-inverse">
				<div className="flex flex-col gap-2">
					<span className="text-sm text-fg-inverse-muted">Round 1 prize pool</span>
					<span className="text-5xl leading-none font-semibold tracking-tight tabular-nums">{usd(tier.pot)}</span>
				</div>
				<div className="flex flex-col items-end gap-2">
					<span className="text-sm text-fg-inverse-muted">Ends in</span>
					<span className="flex items-baseline gap-1 text-4xl leading-none font-semibold tracking-tight tabular-nums">
						{t.d}
						<span className="text-base text-fg-inverse-muted">d</span>
						<span className="ml-2">{pad(t.h)}</span>
						<span className="text-base text-fg-inverse-muted">h</span>
						<span className="ml-2">{pad(t.m)}</span>
						<span className="text-base text-fg-inverse-muted">m</span>
						<span className="ml-2">{pad(t.s)}</span>
						<span className="text-base text-fg-inverse-muted">s</span>
					</span>
				</div>
			</div>
			<div className="grid grid-cols-3 gap-2">
				{tier.traders.slice(0, 3).map((r) => (
					<div key={r.address} className="flex flex-col gap-5 rounded-16 bg-surface p-6">
						<div className="flex flex-col gap-1">
							<span className="text-sm text-fg-muted">{PLACE[r.rank - 1]}</span>
							<span className="text-3xl leading-none font-semibold tracking-tight tabular-nums">
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
