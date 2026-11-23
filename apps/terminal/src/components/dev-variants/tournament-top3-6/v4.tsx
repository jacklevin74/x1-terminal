import { ClockIcon, TrophyIcon, WalletIcon } from "@phosphor-icons/react";
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
import { Identicon, Spark } from "@/components/tournament/parts";
import { cn } from "@/lib/cn";

interface Props {
	tier: Tier;
	className?: string;
}

interface Board {
	title: string;
	Icon: ComponentType<{ className?: string; weight?: "fill" }>;
	sort: (a: Trader, b: Trader) => number;
	value: (r: Trader) => string;
	cls: (r: Trader) => string;
}

const BOARDS: Board[] = [
	{
		title: "Round PNL",
		Icon: TrophyIcon,
		sort: (a, b) => b.pnl - a.pnl,
		value: (r) => signedUsd(r.pnl),
		cls: (r) => pnlClass(r.pnl),
	},
	{
		title: "24h PNL",
		Icon: ClockIcon,
		sort: (a, b) => b.dayPnl - a.dayPnl,
		value: (r) => signedUsd(r.dayPnl, true),
		cls: (r) => pnlClass(r.dayPnl),
	},
	{
		title: "Account value",
		Icon: WalletIcon,
		sort: (a, b) => b.accountValue - a.accountValue,
		value: (r) => usdCompact(r.accountValue),
		cls: () => "text-fg",
	},
];

export function TopThree({ tier, className }: Props) {
	const top = tier.traders.slice(0, 3);
	return (
		<section className={cn("grid grid-cols-3 gap-2", className)}>
			{BOARDS.map((b) => (
				<article key={b.title} className="flex flex-col overflow-hidden rounded-8 bg-surface">
					<div className="flex h-11 items-center gap-2 bg-control-hover px-4 text-sm font-semibold">
						<b.Icon weight="fill" className="size-4" />
						{b.title}
					</div>
					{[...top].sort(b.sort).map((r) => (
						<div key={r.address} className="flex h-12 items-center gap-3 px-4 text-xs tabular-nums odd:bg-band">
							<span className="w-3 text-fg-muted">{r.rank}</span>
							<Identicon id={r.address} className="size-6 rounded-4" />
							<span className="min-w-0 flex-1 truncate text-sm">{traderName(r)}</span>
							<span className="text-fg-muted">{usd(prizeFor(tier, r.rank))}</span>
							<Spark values={path(r)} width={40} height={14} />
							<span className={cn("w-[92px] text-right text-sm font-medium", b.cls(r))}>{b.value(r)}</span>
						</div>
					))}
				</article>
			))}
		</section>
	);
}
