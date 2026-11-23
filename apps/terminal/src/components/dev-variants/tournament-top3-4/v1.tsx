import {
	path,
	prizeFor,
	signedUsd,
	type Tier,
	type Trader,
	traderName,
	usd,
	usdCompact,
} from "@/components/tournament/data";
import { Identicon } from "@/components/tournament/parts";
import { cn } from "@/lib/cn";
import { Line } from "./line";

interface Props {
	tier: Tier;
	className?: string;
}

export function TopThree({ tier, className }: Props) {
	const [first, ...rest] = tier.traders.slice(0, 3);
	return (
		<section className={cn("grid grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)] gap-2", className)}>
			<article className="flex flex-col rounded-16 bg-inverse-surface p-7 text-fg-inverse">
				<div className="flex items-center gap-3">
					<Identicon id={first.address} className="size-9 rounded-full" />
					<span className="text-base font-medium">{traderName(first)}</span>
					<span className="ml-auto rounded-full bg-fill-inverse px-3 py-1 text-xs font-medium text-fg">Leader</span>
				</div>
				<span className="mt-10 text-5xl leading-none font-semibold tracking-tight tabular-nums">
					{signedUsd(first.pnl)}
				</span>
				<div className="mt-3 flex gap-5 text-sm text-fg-inverse-muted tabular-nums">
					<span>Wins {usd(prizeFor(tier, 1))}</span>
					<span>Account {usdCompact(first.accountValue)}</span>
					<span>24h {signedUsd(first.dayPnl, true)}</span>
				</div>
				<div className="mt-8">
					<Line
						values={path(first)}
						height={120}
						stroke="var(--color-fg-inverse)"
						before="var(--color-fg-inverse-disabled)"
					/>
				</div>
			</article>
			<div className="flex flex-col gap-2">
				{rest.map((r) => (
					<Side key={r.address} r={r} tier={tier} />
				))}
			</div>
		</section>
	);
}

function Side({ r, tier }: { r: Trader; tier: Tier }) {
	return (
		<article className="flex flex-1 flex-col justify-between rounded-16 bg-surface p-6">
			<div className="flex items-center gap-3">
				<Identicon id={r.address} className="size-8 rounded-full" />
				<span className="text-sm">{traderName(r)}</span>
				<span className="ml-auto text-sm text-fg-muted tabular-nums">{r.rank === 2 ? "2nd" : "3rd"}</span>
			</div>
			<div className="flex items-end justify-between gap-4">
				<div className="flex flex-col gap-2">
					<span className="text-3xl leading-none font-semibold tracking-tight tabular-nums">{signedUsd(r.pnl)}</span>
					<span className="text-xs text-fg-muted tabular-nums">
						Wins {usd(prizeFor(tier, r.rank))}, account {usdCompact(r.accountValue)}, 24h {signedUsd(r.dayPnl, true)}
					</span>
				</div>
				<Line values={path(r)} height={44} width={140} stroke="var(--color-fg)" />
			</div>
		</article>
	);
}
