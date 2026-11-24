import { Link, useSearch } from "@tanstack/react-router";
import type { Tier } from "@/components/tournament/data";
import { traderName } from "@/components/tournament/data";
import { cn } from "@/lib/cn";
import { AssetStack, Avatar, Countdown, Laurel, PnlArea, Prize, signedUsd, usd, usdCompact } from "./winner-parts";

interface Props {
	tier: Tier;
	className?: string;
}

export function TopThree({ tier, className }: Props) {
	const { trader } = useSearch({ from: "/tournament" });
	return (
		<section
			className={cn(
				"grid grid-cols-[220px_repeat(3,minmax(0,1fr))] gap-2 rounded-16 bg-surface p-2 text-fg",
				className,
			)}
		>
			<div className="flex flex-col justify-between p-3">
				<div className="flex flex-col gap-1">
					<span className="text-xs text-fg-muted">Round 1 prize pool</span>
					<span className="flex items-baseline gap-1.5 text-2xl leading-none font-semibold tracking-tight tabular-nums">
						{usd(tier.pot)}
					</span>
				</div>
				<Countdown dark={false} className="text-base" />
			</div>
			{tier.traders.slice(0, 3).map((t) => (
				<article
					key={t.address}
					className={cn(
						"relative flex flex-col gap-3 rounded-12 bg-grey-solid-800 p-3 transition-[filter] duration-150 hover:brightness-110",
						trader === t.address && "brightness-110",
					)}
				>
					<Link
						to="/tournament"
						search={{ trader: t.address }}
						resetScroll={false}
						aria-label={traderName(t)}
						className="absolute inset-0 rounded-12"
					/>
					<header className="flex items-center gap-2.5">
						<Avatar t={t} className="size-9 rounded-8 bg-grey-solid-850" />
						<div className="flex min-w-0 flex-1 flex-col gap-1">
							<span className="truncate text-sm font-medium">{traderName(t)}</span>
							<span className="relative z-10 flex w-fit">
								<AssetStack t={t} size="size-4" ring="ring-grey-solid-800" />
							</span>
						</div>
						<Laurel rank={t.rank} size={40} />
					</header>
					<div className="flex items-end gap-3">
						<div className="flex flex-col gap-0.5">
							<span className="text-base font-semibold text-market-up tabular-nums">{signedUsd(t.pnl)}</span>
							<span className="text-xs whitespace-nowrap text-fg-muted tabular-nums">{usdCompact(t.vlm)} volume</span>
						</div>
						<PnlArea t={t} height={40} grid={false} className="min-w-0 flex-1" />
					</div>
					<div className="flex items-center justify-between text-xs text-fg-muted">
						<span>Prize</span>
						<Prize tier={tier} rank={t.rank} className="text-sm text-fg" />
					</div>
				</article>
			))}
		</section>
	);
}
