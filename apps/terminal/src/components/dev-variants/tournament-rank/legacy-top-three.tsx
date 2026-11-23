import type { ComponentType } from "react";
import {
	path,
	pnlClass,
	prizeFor,
	signedUsd,
	type Tier,
	type Trader,
	traderName,
	usd,
	usdCompact,
} from "@/components/tournament/data";
import { Identicon } from "@/components/tournament/parts";
import { PnlChart } from "@/components/tournament/pnl-chart";
import { cn } from "@/lib/cn";
import { RankMark, type RankMarkProps } from "./rank-mark";

export interface RankAvatarProps {
	r: Trader;
	lead?: boolean;
}

interface TopThreeProps {
	tier: Tier;
	Mark?: ComponentType<RankMarkProps>;
	Avatar?: ComponentType<RankAvatarProps>;
	className?: string;
}

export function TopThree({ tier, Mark = RankMark, Avatar, className }: TopThreeProps) {
	const [first, second, third] = tier.traders;
	return (
		<section className={cn("grid grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)] gap-2", className)}>
			<LeadCard r={first} tier={tier} Mark={Mark} Avatar={Avatar} />
			<div className="grid grid-rows-2 gap-2">
				<SideCard r={second} tier={tier} Mark={Mark} Avatar={Avatar} />
				<SideCard r={third} tier={tier} Mark={Mark} Avatar={Avatar} />
			</div>
		</section>
	);
}

interface CardProps {
	r: Trader;
	tier: Tier;
	Mark?: ComponentType<RankMarkProps>;
	Avatar?: ComponentType<RankAvatarProps>;
}

function Who({ r, lead, Avatar }: { r: Trader; lead?: boolean; Avatar?: ComponentType<RankAvatarProps> }) {
	return (
		<div className="flex min-w-0 items-center gap-2">
			{Avatar ? <Avatar r={r} lead={lead} /> : <Identicon id={r.address} className="size-6 rounded-4" />}
			<span className="truncate text-sm">{traderName(r)}</span>
		</div>
	);
}

function Meta({ r, tier }: CardProps) {
	return (
		<div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-fg-muted tabular-nums [&>span]:whitespace-nowrap">
			<span>
				Prize <span className="text-fg">{usd(prizeFor(tier, r.rank))}</span>
			</span>
			<span>
				Account <span className="text-fg-secondary">{usdCompact(r.accountValue)}</span>
			</span>
			<span>
				24h <span className={pnlClass(r.dayPnl)}>{signedUsd(r.dayPnl, true)}</span>
			</span>
		</div>
	);
}

function LeadCard({ r, tier, Mark = RankMark, Avatar }: CardProps) {
	return (
		<div className="relative isolate flex gap-8 overflow-hidden rounded-8 bg-surface p-6">
			<div className="flex w-[280px] flex-none flex-col">
				<Mark rank={r.rank} r={r} tier={tier} lead />
				<div className="mt-4">
					<Who r={r} lead Avatar={Avatar} />
				</div>
				<div className="mt-auto flex flex-col gap-2 pt-8">
					<div className={cn("text-2xl leading-none font-semibold tabular-nums", pnlClass(r.pnl))}>
						{signedUsd(r.pnl)}
					</div>
					<Meta r={r} tier={tier} />
				</div>
			</div>
			<div className="min-w-0 flex-1 self-end">
				<PnlChart values={path(r)} height={184} labels />
			</div>
		</div>
	);
}

function SideCard({ r, tier, Mark = RankMark, Avatar }: CardProps) {
	return (
		<div className="relative isolate flex gap-6 overflow-hidden rounded-8 bg-surface p-6">
			<Mark rank={r.rank} r={r} tier={tier} />
			<div className="flex min-w-0 flex-1 flex-col justify-between gap-4">
				<Who r={r} Avatar={Avatar} />
				<div className="flex flex-col gap-2">
					<div className={cn("text-lg leading-none font-semibold tabular-nums", pnlClass(r.pnl))}>
						{signedUsd(r.pnl)}
					</div>
					<Meta r={r} tier={tier} />
				</div>
			</div>
			<div className="w-[180px] min-w-[96px] shrink self-end">
				<PnlChart values={path(r)} height={72} />
			</div>
		</div>
	);
}
