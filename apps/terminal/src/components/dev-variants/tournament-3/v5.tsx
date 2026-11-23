import { SegmentedControlItem, SegmentedControls } from "@hypeterminal/ui";
import { useState } from "react";
import { cn } from "@/lib/cn";
import {
	MY_TIER,
	me,
	move,
	ordinal,
	pad,
	path,
	pct,
	pnlClass,
	prizeFor,
	SPLIT,
	signedUsd,
	type Tier,
	type TierId,
	type Trader,
	tierIds,
	tiers,
	traderName,
	usd,
	usdCompact,
	useTimeLeft,
} from "../tournament-2/data";
import { MobileShell } from "../tournament-2/mobile-shell";
import { Identicon, RankMove, Spark } from "../tournament-2/parts";

const css = `
.t3v5-in{animation:t3v5-in .24s cubic-bezier(.2,.8,.2,1)}
@keyframes t3v5-in{from{opacity:0;transform:scale(.97)}}
.t3v5-bar{animation:t3v5-bar .5s cubic-bezier(.2,.8,.2,1);transform-origin:left}
@keyframes t3v5-bar{from{transform:scaleX(.97);opacity:0}}
`;

const COLS = "grid-cols-[52px_56px_1fr_120px_260px_88px_104px_104px_96px]";

function share(r: Trader, tier: Tier) {
	return Math.max(0, r.pnl / tier.traders[0].pnl);
}

function barWidth(r: Trader, tier: Tier) {
	return `max(3px, ${share(r, tier) * 100}%)`;
}

export default function V5() {
	const [tierId, setTierId] = useState<TierId>(MY_TIER);
	const tier = tiers[tierId];
	const t = useTimeLeft();
	return (
		<>
			<style>{css}</style>
			<div className="absolute rounded-xs bg-background px-2 py-1 text-sm text-fg" style={{ left: 662, top: 11 }}>
				Tournament
			</div>
			<div className="absolute inset-x-0 bottom-0 bg-background p-1" style={{ top: 48 }}>
				<div className="flex h-full flex-col rounded-8 bg-surface">
					<div className="flex flex-none items-start gap-6 px-6 pt-5">
						<div>
							<div className="text-lg font-semibold">Tournament leaderboard</div>
							<div className="text-xs text-fg-muted">
								Round 1. Ranked by dollar PNL. Bars show round PNL against 1st place.
							</div>
						</div>
						<div className="ml-auto text-right tabular-nums">
							<div className="text-xs text-fg-muted">Ends in</div>
							<div className="text-lg font-semibold">
								{t.d}d {pad(t.h)}h {pad(t.m)}m {pad(t.s)}s
							</div>
						</div>
					</div>
					<div className="flex-none px-6 pt-3">
						<PotBar tier={tier} />
					</div>
					<div className="flex flex-none items-center px-6 pt-3">
						<SegmentedControls value={tierId} onValueChange={(v) => setTierId(v as TierId)} size="md">
							{tierIds.map((id) => (
								<SegmentedControlItem key={id} value={id}>
									{tiers[id].label} <span className="text-fg-muted">({tiers[id].short})</span>
								</SegmentedControlItem>
							))}
						</SegmentedControls>
						<span className="ml-auto text-xs text-fg-muted tabular-nums">
							{tier.count.toLocaleString()} traders. Arrows show rank change in the last 24h.
						</span>
					</div>
					<div key={tierId} className="t3v5-in flex min-h-0 flex-1 flex-col">
						<div className="flex flex-none flex-col gap-1.5 px-6 pt-3">
							{tier.traders.slice(0, 3).map((r) => (
								<TopBar key={r.address} r={r} tier={tier} />
							))}
						</div>
						<div className="mx-6 mt-3 flex min-h-0 flex-1 flex-col">
							<div className={cn("grid h-8 flex-none items-center gap-2 px-3 text-xs text-fg-muted", COLS)}>
								<span>Rank</span>
								<span>24h</span>
								<span>Trader</span>
								<span className="text-right">Account value</span>
								<span>Round PNL (bar vs 1st)</span>
								<span className="text-right">ROI</span>
								<span className="text-right">Volume</span>
								<span className="pl-4">30d PNL</span>
								<span className="text-right">24h PNL</span>
							</div>
							<div className="min-h-0 flex-1 overflow-y-auto">
								{tier.traders.slice(3).map((r) => (
									<Row key={r.address} r={r} tier={tier} />
								))}
							</div>
						</div>
						<div className="flex-none px-4 pt-2 pb-3">
							{tierId === MY_TIER ? (
								<div className="rounded-8 bg-control px-2">
									<Row r={me} tier={tier} you />
								</div>
							) : (
								<div className="flex h-11 items-center rounded-8 bg-control px-4 text-xs text-fg-muted">
									You play at the {tiers[MY_TIER].label.toLowerCase()} (account {usd(me.accountValue)}).
								</div>
							)}
						</div>
					</div>
				</div>
			</div>
		</>
	);
}

function PotBar({ tier, compact }: { tier: Tier; compact?: boolean }) {
	return (
		<div className="rounded-8 bg-control p-1">
			<div className="flex items-center gap-1">
				<div
					className={cn(
						"flex flex-none flex-col justify-center rounded-6 bg-fill px-3 text-fg-inverse tabular-nums",
						compact ? "h-11" : "h-10 w-[220px]",
					)}
				>
					<span className="text-2xs">Pot (example)</span>
					<span className="text-sm leading-tight font-semibold">{usd(tier.pot)}</span>
				</div>
				<div className="flex min-w-0 flex-1 gap-1">
					{SPLIT.map((s, i) => (
						<div
							key={ordinal[i]}
							className={cn(
								"flex min-w-0 flex-col justify-center rounded-6 bg-control-hover px-2 tabular-nums",
								compact ? "h-11" : "h-10 px-3",
							)}
							style={{ flexGrow: s }}
						>
							<span className="truncate text-2xs text-fg-muted">
								{ordinal[i]} {compact ? "" : `(${Math.round(s * 80)}%)`}
							</span>
							<span className="truncate text-xs font-semibold">{usd(tier.payouts[i])}</span>
						</div>
					))}
				</div>
				{!compact && <span className="flex-none px-3 text-xs text-fg-muted">80% of the pot goes to the top 3</span>}
			</div>
		</div>
	);
}

function RankBadge({ rank, className }: { rank: number; className?: string }) {
	return (
		<span
			className={cn(
				"grid size-9 flex-none place-items-center rounded-6 text-base font-semibold tabular-nums",
				rank === 1 ? "bg-fill text-fg-inverse" : "bg-surface text-fg",
				className,
			)}
		>
			{rank}
		</span>
	);
}

interface CardProps {
	r: Trader;
	tier: Tier;
}

function TopBar({ r, tier }: CardProps) {
	return (
		<div className="relative flex h-[72px] items-center gap-3 overflow-hidden rounded-8 bg-control pr-4 pl-3">
			<div className="t3v5-bar absolute inset-y-0 left-0 bg-control-hover" style={{ width: barWidth(r, tier) }} />
			<RankBadge rank={r.rank} className="relative" />
			<Identicon id={r.address} className="relative size-8" />
			<div className="relative w-[180px] min-w-0">
				<div className="truncate text-sm">{traderName(r)}</div>
				<div className="text-xs text-fg-muted tabular-nums">
					<span className={pnlClass(r.dayPnl)}>{signedUsd(r.dayPnl, true)}</span> in 24h
				</div>
			</div>
			<div className="relative">
				<div className={cn("text-lg font-semibold tabular-nums", pnlClass(r.pnl))}>{signedUsd(r.pnl)}</div>
				<div className="text-xs text-fg-muted tabular-nums">
					{r.rank === 1 ? "Leader" : `${Math.round(share(r, tier) * 100)}% of 1st`}
				</div>
			</div>
			<div className="relative ml-auto flex items-center gap-6 text-xs tabular-nums">
				<div className="text-right">
					<div className="text-fg-muted">Account</div>
					<div>{usdCompact(r.accountValue)}</div>
				</div>
				<div className="text-right">
					<div className="text-fg-muted">Wins</div>
					<div className="font-semibold">{usd(prizeFor(tier, r.rank))}</div>
				</div>
				<Spark values={path(r)} width={200} height={44} area />
			</div>
		</div>
	);
}

interface RowProps {
	r: Trader;
	tier: Tier;
	you?: boolean;
}

function Row({ r, tier, you }: RowProps) {
	return (
		<div
			className={cn(
				"grid h-10 items-center gap-2 border-b border-stroke-faint px-3 text-xs tabular-nums last:border-b-0",
				COLS,
			)}
		>
			<span className="text-fg-secondary">{r.rank.toLocaleString()}</span>
			<RankMove value={move(r)} />
			<span className="flex min-w-0 items-center gap-2">
				<Identicon id={r.address} className="size-6 rounded-4" />
				<span className="truncate">{traderName(r)}</span>
				{you && <span className="rounded-full bg-fill px-2 py-0.5 text-2xs font-medium text-fg-inverse">You</span>}
			</span>
			<span className="text-right text-fg-secondary">{usd(r.accountValue)}</span>
			<span className="relative flex h-7 items-center overflow-hidden rounded-4 bg-control">
				<span className="t3v5-bar absolute inset-y-0 left-0 bg-control-hover" style={{ width: barWidth(r, tier) }} />
				<span className={cn("relative px-2 font-medium", pnlClass(r.pnl))}>{signedUsd(r.pnl)}</span>
			</span>
			<span className={cn("text-right", pnlClass(r.roi))}>{pct(r.roi)}</span>
			<span className="text-right text-fg-secondary">{usdCompact(r.vlm)}</span>
			<span className="pl-4">
				<Spark values={path(r)} width={72} height={20} />
			</span>
			<span className={cn("text-right", pnlClass(r.dayPnl))}>{signedUsd(r.dayPnl, true)}</span>
		</div>
	);
}

export function V5Mobile() {
	const [tierId, setTierId] = useState<TierId>(MY_TIER);
	const tier = tiers[tierId];
	const t = useTimeLeft();
	return (
		<MobileShell>
			<style>{css}</style>
			<div className="flex h-full flex-col">
				<div className="min-h-0 flex-1 overflow-y-auto">
					<div className="px-4 pt-4">
						<div className="flex items-start justify-between gap-3">
							<div>
								<div className="text-lg font-semibold">Tournament</div>
								<div className="text-xs text-fg-muted">Round 1. Ranked by dollar PNL.</div>
							</div>
							<div className="text-right tabular-nums">
								<div className="text-xs text-fg-muted">Ends in</div>
								<div className="text-sm font-semibold">
									{t.d}d {pad(t.h)}h {pad(t.m)}m {pad(t.s)}s
								</div>
							</div>
						</div>
						<div className="mt-3">
							<PotBar tier={tier} compact />
						</div>
						<div className="mt-1 text-xs text-fg-muted">80% of the pot goes to the top 3.</div>
						<SegmentedControls value={tierId} onValueChange={(v) => setTierId(v as TierId)} fullWidth className="mt-3">
							{tierIds.map((id) => (
								<SegmentedControlItem key={id} value={id}>
									{tiers[id].short}
								</SegmentedControlItem>
							))}
						</SegmentedControls>
					</div>
					<div key={tierId} className="t3v5-in px-4 pt-3">
						<div className="flex flex-col gap-1.5">
							{tier.traders.slice(0, 3).map((r) => (
								<div key={r.address} className="relative overflow-hidden rounded-8 bg-surface p-3">
									<div className="t3v5-bar absolute inset-y-0 left-0 bg-control" style={{ width: barWidth(r, tier) }} />
									<div className="relative flex items-center gap-2">
										<RankBadge rank={r.rank} className={cn("size-7 text-sm", r.rank > 1 && "bg-control-hover")} />
										<Identicon id={r.address} className="size-6" />
										<span className="min-w-0 flex-1">
											<span className="block truncate text-xs">{traderName(r)}</span>
											<span className="block text-2xs text-fg-muted tabular-nums">
												Wins {usd(prizeFor(tier, r.rank))}
											</span>
										</span>
										<span className="text-right tabular-nums">
											<span className={cn("block text-sm font-semibold", pnlClass(r.pnl))}>
												{signedUsd(r.pnl, true)}
											</span>
											<span className="block text-2xs text-fg-muted">
												{r.rank === 1 ? "Leader" : `${Math.round(share(r, tier) * 100)}% of 1st`}
											</span>
										</span>
									</div>
									<div className="relative mt-2 flex items-end justify-between">
										<span className="text-2xs text-fg-muted tabular-nums">
											Account {usdCompact(r.accountValue)}
											<br />
											<span className={pnlClass(r.dayPnl)}>{signedUsd(r.dayPnl, true)}</span> in 24h
										</span>
										<Spark values={path(r)} width={150} height={36} area />
									</div>
								</div>
							))}
						</div>
						<div className="mt-3 mb-1 flex justify-between text-xs text-fg-muted tabular-nums">
							<span>Bars show round PNL against 1st</span>
							<span>{tier.count.toLocaleString()} traders</span>
						</div>
						<div className="mb-3 rounded-8 bg-surface">
							{tier.traders.slice(3, 20).map((r) => (
								<MobileRow key={r.address} r={r} tier={tier} />
							))}
						</div>
					</div>
				</div>
				<div className="flex-none bg-surface px-3 pt-2 pb-4">
					{tierId === MY_TIER ? (
						<div className="rounded-8 bg-control">
							<MobileRow r={me} tier={tier} you />
						</div>
					) : (
						<div className="rounded-8 bg-control px-3 py-3 text-xs text-fg-muted">
							You play at the {tiers[MY_TIER].label.toLowerCase()}.
						</div>
					)}
				</div>
			</div>
		</MobileShell>
	);
}

function MobileRow({ r, tier, you }: RowProps) {
	return (
		<div className="flex h-12 items-center gap-2 border-b border-stroke-faint px-3 text-xs tabular-nums last:border-b-0">
			<span className="w-8 text-fg-secondary">{r.rank.toLocaleString()}</span>
			<Identicon id={r.address} className="size-6 rounded-4" />
			<span className="min-w-0 flex-1">
				<span className="flex items-center gap-1.5">
					<span className="truncate">{traderName(r)}</span>
					{you && <span className="rounded-full bg-fill px-1.5 text-2xs font-medium text-fg-inverse">You</span>}
				</span>
				<RankMove value={move(r)} zero="Same rank in 24h" className="text-2xs" />
			</span>
			<Spark values={path(r)} width={40} height={16} />
			<span className="relative flex h-7 w-[96px] flex-none items-center justify-end overflow-hidden rounded-4 bg-control">
				<span className="t3v5-bar absolute inset-y-0 left-0 bg-control-hover" style={{ width: barWidth(r, tier) }} />
				<span className={cn("relative px-2 font-medium", pnlClass(r.pnl))}>{signedUsd(r.pnl, true)}</span>
			</span>
		</div>
	);
}
