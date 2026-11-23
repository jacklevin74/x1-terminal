import { Tabs, TabsList, TabsTrigger } from "@hypeterminal/ui";
import { useState } from "react";
import { cn } from "@/lib/cn";
import {
	MY_TIER,
	me,
	move,
	path,
	pct,
	pnlClass,
	roundDates,
	signedUsd,
	type TierId,
	type Trader,
	tierIds,
	tiers,
	traderName,
	usd,
	usdCompact,
	useTimeLeft,
} from "./data";
import { Identicon, RankMove, Spark } from "./parts";
import { RoundStatus } from "./round-status";
import { RulesPopover } from "./rules-popover";
import { TopThree } from "./top-three";

const COLS = "grid-cols-[48px_56px_minmax(0,1fr)_128px_136px_96px_104px_104px_96px]";

export function TournamentBoard() {
	const [tierId, setTierId] = useState<TierId>(MY_TIER);
	const tier = tiers[tierId];
	const t = useTimeLeft();
	const dates = roundDates(t.ms);

	return (
		<div className="mx-auto flex w-full max-w-[1440px] flex-col px-8 pt-8">
			<header className="flex items-end justify-between gap-8">
				<div className="flex flex-col gap-2">
					<h1 className="text-lg font-semibold">Tournament</h1>
					<RoundStatus dates={dates} />
				</div>
			</header>

			<div className="mt-6 flex h-10 items-stretch justify-between border-b border-stroke-weak">
				<Tabs value={tierId} onValueChange={(v) => setTierId(v as TierId)} variant="underline" className="h-full">
					<TabsList className="h-full border-b-0">
						{tierIds.map((id) => (
							<TabsTrigger key={id} value={id} className="h-full py-0">
								{tiers[id].label}
							</TabsTrigger>
						))}
					</TabsList>
				</Tabs>
				<div className="flex items-center">
					<RulesPopover tier={tier} />
				</div>
			</div>

			<div
				key={tierId}
				className="mt-6 flex flex-col gap-4 duration-200 motion-safe:animate-in motion-safe:fade-in motion-safe:zoom-in-97"
			>
				<p className="text-sm text-fg-muted">{tier.description}</p>
				<TopThree tier={tier} />
			</div>

			<section className="mt-10 flex flex-col">
				<div className="flex items-baseline gap-3 px-3">
					<h2 className="text-sm font-medium">Standings</h2>
					<span className="text-xs text-fg-muted tabular-nums">{tier.count.toLocaleString()} traders</span>
				</div>
				<div className={cn("mt-3 grid h-8 items-center gap-2 px-3 text-xs text-fg-muted", COLS)}>
					<span>Rank</span>
					<span>24h</span>
					<span>Trader</span>
					<span className="text-right">Account value</span>
					<span className="text-right">Round PNL</span>
					<span className="text-right">ROI</span>
					<span className="text-right">Volume</span>
					<span className="pl-4">30d PNL</span>
					<span className="text-right">24h PNL</span>
				</div>
				{tier.traders.map((r) => (
					<Row key={r.address} r={r} />
				))}
			</section>

			<div className="sticky bottom-0 -mx-4 mt-2 bg-background px-2 pt-2 pb-4">
				{tierId === MY_TIER ? (
					<div className="rounded-8 bg-control px-2">
						<Row r={me} you />
					</div>
				) : (
					<div className="flex h-11 items-center rounded-8 bg-control px-4 text-xs text-fg-muted">
						You play at the {tiers[MY_TIER].label.toLowerCase()} (account {usd(me.accountValue)}).
					</div>
				)}
			</div>
		</div>
	);
}

interface RowProps {
	r: Trader;
	you?: boolean;
}

function Row({ r, you }: RowProps) {
	return (
		<div
			className={cn(
				"grid h-10 items-center gap-2 rounded-6 px-3 text-xs tabular-nums transition-colors hover:bg-band",
				COLS,
			)}
		>
			<span className="text-fg-muted">{r.rank}</span>
			<RankMove value={move(r)} />
			<span className="flex min-w-0 items-center gap-2">
				<Identicon id={r.address} className="size-5 rounded-4" />
				<span className="truncate text-sm">{traderName(r)}</span>
				{you && <span className="rounded-full bg-fill px-2 py-0.5 text-2xs font-medium text-fg-inverse">You</span>}
			</span>
			<span className="text-right text-fg-secondary">{usd(r.accountValue)}</span>
			<span className={cn("text-right text-sm font-medium", pnlClass(r.pnl))}>{signedUsd(r.pnl)}</span>
			<span className="text-right text-fg-secondary">{pct(r.roi)}</span>
			<span className="text-right text-fg-secondary">{usdCompact(r.vlm)}</span>
			<span className="pl-4">
				<Spark values={path(r)} width={72} height={18} />
			</span>
			<span className={cn("text-right", pnlClass(r.dayPnl))}>{signedUsd(r.dayPnl, true)}</span>
		</div>
	);
}
