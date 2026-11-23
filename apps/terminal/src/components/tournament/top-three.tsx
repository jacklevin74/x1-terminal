import { pad, prizeFor, type Tier, usdc, useTimeLeft } from "@/components/tournament/data";
import { cn } from "@/lib/cn";
import { Halftone } from "./halftone";
import { TraderRow } from "./trader-row";

interface Props {
	tier: Tier;
	className?: string;
}

const PLACE = ["1st place", "2nd place", "3rd place"];

export function TopThree({ tier, className }: Props) {
	const t = useTimeLeft();
	return (
		<section className={cn("flex flex-col overflow-hidden rounded-16 bg-surface", className)}>
			<div
				className="relative isolate flex items-center justify-between overflow-hidden px-8 py-7 text-fg"
				style={{ backgroundColor: "color-mix(in oklch, var(--color-x1-blue) 32%, var(--color-background))" }}
			>
				<Halftone ink="color-mix(in oklch, var(--color-x1-cyan) 40%, var(--color-x1-blue))" />
				<div className="flex flex-col gap-2">
					<span className="text-sm text-fg-muted">Round 1 prize pool</span>
					<span className="flex items-baseline gap-2 text-3xl leading-none font-semibold tracking-tight tabular-nums">
						{usdc(tier.pot)}
						<span className="text-base font-medium tracking-normal text-fg-muted">USDC</span>
					</span>
				</div>
				<span className="flex items-baseline gap-1 self-end text-xl leading-none font-semibold tracking-tight tabular-nums">
					{t.d}
					<span className="text-sm font-medium text-fg-muted">d</span>
					<span className="ml-1.5">{pad(t.h)}</span>
					<span className="text-sm font-medium text-fg-muted">h</span>
					<span className="ml-1.5">{pad(t.m)}</span>
					<span className="text-sm font-medium text-fg-muted">m</span>
					<span className="ml-1.5">{pad(t.s)}</span>
					<span className="text-sm font-medium text-fg-muted">s</span>
				</span>
			</div>
			<div className="grid grid-cols-3 gap-px bg-background">
				{tier.traders.slice(0, 3).map((r) => (
					<div key={r.address} className="flex flex-col gap-5 bg-surface p-6">
						<div className="flex flex-col gap-1">
							<span className="text-sm text-fg-muted">{PLACE[r.rank - 1]}</span>
							<span className="flex items-baseline gap-1.5 text-2xl leading-none font-semibold tracking-tight tabular-nums">
								{usdc(prizeFor(tier, r.rank))}
								<span className="text-sm font-medium tracking-normal text-fg-muted">USDC</span>
							</span>
						</div>
						<TraderRow r={r} />
					</div>
				))}
			</div>
		</section>
	);
}
