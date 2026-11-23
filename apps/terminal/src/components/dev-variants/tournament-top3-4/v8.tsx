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
	return (
		<section className={cn("grid grid-cols-3 gap-1", className)}>
			{tier.traders.slice(0, 3).map((r) => (
				<Card key={r.address} r={r} tier={tier} />
			))}
		</section>
	);
}

function Card({ r, tier }: { r: Trader; tier: Tier }) {
	const lead = r.rank === 1;
	return (
		<article
			className={cn("flex flex-col rounded-none p-6", lead ? "bg-inverse-surface text-fg-inverse" : "bg-surface")}
		>
			<div className="flex items-start justify-between">
				<span className="font-wordmark text-6xl leading-none font-semibold tracking-tighter tabular-nums">
					{String(r.rank).padStart(2, "0")}
				</span>
				<Identicon id={r.address} className="size-10 rounded-none" />
			</div>
			<span className={cn("mt-10 text-2xs tracking-micro uppercase", lead ? "text-fg-inverse-muted" : "text-fg-muted")}>
				{traderName(r)}
			</span>
			<span className="font-wordmark mt-2 text-4xl leading-none font-semibold tracking-tight tabular-nums">
				{signedUsd(r.pnl)}
			</span>
			<div className="mt-6">
				<Line
					values={path(r)}
					height={56}
					stroke={lead ? "var(--color-fg-inverse)" : "var(--color-fg)"}
					before={lead ? "var(--color-fg-inverse-disabled)" : "var(--color-fg-disabled)"}
				/>
			</div>
			<dl
				className={cn(
					"mt-6 grid grid-cols-3 gap-4 text-2xs tracking-micro uppercase tabular-nums",
					lead ? "text-fg-inverse-muted" : "text-fg-muted",
				)}
			>
				<div className="flex flex-col gap-1">
					<dt>Prize</dt>
					<dd className={cn("text-sm tracking-normal", lead ? "text-fg-inverse" : "text-fg")}>
						{usd(prizeFor(tier, r.rank))}
					</dd>
				</div>
				<div className="flex flex-col gap-1">
					<dt>Account</dt>
					<dd className={cn("text-sm tracking-normal", lead ? "text-fg-inverse" : "text-fg")}>
						{usdCompact(r.accountValue)}
					</dd>
				</div>
				<div className="flex flex-col gap-1">
					<dt>24h</dt>
					<dd className={cn("text-sm tracking-normal", lead ? "text-fg-inverse" : "text-fg")}>
						{signedUsd(r.dayPnl, true)}
					</dd>
				</div>
			</dl>
		</article>
	);
}
