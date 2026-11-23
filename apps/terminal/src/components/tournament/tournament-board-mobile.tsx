import { SegmentedControlItem, SegmentedControls } from "@hypeterminal/ui";
import { useState } from "react";
import { cn } from "@/lib/cn";
import {
	MY_TIER,
	me,
	move,
	pad,
	path,
	pnlClass,
	prizeFor,
	roundDates,
	signedUsd,
	type TierId,
	type Trader,
	tierIds,
	tiers,
	traderName,
	usdc,
	useTimeLeft,
} from "./data";
import { Halftone } from "./halftone";
import { Identicon, RankMove, Spark } from "./parts";
import { RoundStatus } from "./round-status";
import { RulesPopover } from "./rules-popover";
import { TraderRow } from "./trader-row";

const PLACE = ["1st place", "2nd place", "3rd place"];

export function TournamentBoardMobile() {
	const [tierId, setTierId] = useState<TierId>(MY_TIER);
	const tier = tiers[tierId];
	const t = useTimeLeft();

	return (
		<div className="flex flex-col">
			<div className="flex flex-col px-4 pt-6">
				<div className="flex items-center justify-between">
					<h1 className="text-lg font-semibold">Tournament</h1>
					<RulesPopover tier={tier} />
				</div>
				<RoundStatus dates={roundDates(t.ms)} className="mt-1" />
				<SegmentedControls value={tierId} onValueChange={(v) => setTierId(v as TierId)} fullWidth className="mt-4">
					{tierIds.map((id) => (
						<SegmentedControlItem key={id} value={id}>
							{tiers[id].label}
						</SegmentedControlItem>
					))}
				</SegmentedControls>
			</div>

			<div
				key={tierId}
				className="flex flex-col gap-2 px-4 pt-4 duration-200 motion-safe:animate-in motion-safe:fade-in motion-safe:zoom-in-97"
			>
				<p className="pb-1 text-xs text-fg-muted">{tier.description}</p>
				<div className="flex flex-col overflow-hidden rounded-16 bg-surface">
					<div
						className="relative isolate flex flex-col gap-3 overflow-hidden px-5 py-5 text-fg"
						style={{ backgroundColor: "color-mix(in oklch, var(--color-x1-blue) 32%, var(--color-background))" }}
					>
						<Halftone ink="color-mix(in oklch, var(--color-x1-cyan) 40%, var(--color-x1-blue))" />
						<div className="flex flex-col gap-1">
							<span className="text-xs text-fg-muted">Round 1 prize pool</span>
							<span className="flex items-baseline gap-1.5 text-2xl leading-none font-semibold tracking-tight tabular-nums">
								{usdc(tier.pot)}
								<span className="text-sm font-medium tracking-normal text-fg-muted">USDC</span>
							</span>
						</div>
						<span className="text-sm text-fg-secondary tabular-nums">
							{t.d}d {pad(t.h)}h {pad(t.m)}m {pad(t.s)}s left
						</span>
					</div>
					{tier.traders.slice(0, 3).map((r) => (
						<div key={r.address} className="flex flex-col gap-3 p-4 pt-5">
							<div className="flex items-baseline justify-between">
								<span className="text-xs text-fg-muted">{PLACE[r.rank - 1]}</span>
								<span className="flex items-baseline gap-1 text-lg leading-none font-semibold tracking-tight tabular-nums">
									{usdc(prizeFor(tier, r.rank))}
									<span className="text-xs font-medium tracking-normal text-fg-muted">USDC</span>
								</span>
							</div>
							<TraderRow r={r} />
						</div>
					))}
				</div>
			</div>

			<div className="flex flex-col px-2 pt-8 pb-2">
				<div className="flex items-baseline gap-3 px-2">
					<h2 className="text-sm font-medium">Standings</h2>
					<span className="text-xs text-fg-muted tabular-nums">{tier.count.toLocaleString()} traders</span>
				</div>
				<div className="mt-2">
					{tier.traders.slice(0, 30).map((r) => (
						<MobileRow key={r.address} r={r} />
					))}
				</div>
			</div>

			<div className="sticky bottom-0 bg-background px-2 pt-2 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
				{tierId === MY_TIER ? (
					<div className="rounded-8 bg-control">
						<MobileRow r={me} you />
					</div>
				) : (
					<div className="rounded-8 bg-control p-3 text-xs text-fg-muted">
						You play at the {tiers[MY_TIER].label.toLowerCase()}.
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

function MobileRow({ r, you }: RowProps) {
	return (
		<div className="flex h-12 items-center gap-3 px-2 text-xs tabular-nums">
			<span className="w-8 text-fg-muted">{r.rank}</span>
			<Identicon id={r.address} className="size-6 rounded-4" />
			<span className="flex min-w-0 flex-1 flex-col">
				<span className="flex items-center gap-2">
					<span className="truncate">{traderName(r)}</span>
					{you && <span className="rounded-full bg-fill px-2 text-2xs font-medium text-fg-inverse">You</span>}
				</span>
				<RankMove value={move(r)} className="text-2xs" />
			</span>
			<Spark values={path(r)} width={48} height={18} />
			<span className={cn("w-[84px] text-right font-medium", pnlClass(r.pnl))}>{signedUsd(r.pnl, true)}</span>
		</div>
	);
}
