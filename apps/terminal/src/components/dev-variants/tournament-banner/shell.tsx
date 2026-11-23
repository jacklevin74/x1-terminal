import type { ReactNode } from "react";
import { prizeFor, type Tier, usd } from "@/components/tournament/data";
import { TraderRow } from "@/components/tournament/trader-row";

interface Props {
	tier: Tier;
	children: ReactNode;
}

const PLACE = ["1st place", "2nd place", "3rd place"];

export const INK = "color-mix(in oklch, var(--color-fg-inverse) 9%, var(--color-inverse-surface))";
export const INK_STRONG = "color-mix(in oklch, var(--color-fg-inverse) 16%, var(--color-inverse-surface))";

export function Shell({ tier, children }: Props) {
	return (
		<section className="flex flex-col overflow-hidden rounded-16 bg-surface">
			<div className="relative isolate flex items-center justify-between overflow-hidden bg-inverse-surface px-8 py-7 text-fg-inverse">
				<div
					aria-hidden="true"
					className="pointer-events-none absolute inset-y-0 right-0 -z-10 w-[58%]"
					style={{
						maskImage: "linear-gradient(90deg, transparent, black 45%)",
						WebkitMaskImage: "linear-gradient(90deg, transparent, black 45%)",
					}}
				>
					{children}
				</div>
				<div className="flex flex-col gap-2">
					<span className="text-sm text-fg-inverse-muted">Round 1 prize pool</span>
					<span className="text-5xl leading-none font-semibold tracking-tight tabular-nums">{usd(tier.pot)}</span>
				</div>
			</div>
			<div className="grid grid-cols-3 gap-px bg-background">
				{tier.traders.slice(0, 3).map((r) => (
					<div key={r.address} className="flex flex-col gap-5 bg-surface p-6">
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
