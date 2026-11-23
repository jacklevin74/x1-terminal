import { useState } from "react";
import { cn } from "@/lib/cn";
import {
	MY_TIER,
	me,
	move,
	pad,
	path,
	pct,
	pnlClass,
	prizeFor,
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
} from "./data";
import { MobileShell } from "./mobile-shell";
import { Identicon, Laurel, RankMove, Spark } from "./parts";

const css = `
.t2v1-in{animation:t2v1-in .24s cubic-bezier(.2,.8,.2,1)}
@keyframes t2v1-in{from{opacity:0;transform:scale(.97)}}
`;

const COLS = "grid-cols-[64px_56px_1fr_132px_140px_96px_112px_120px_104px]";

export default function V1() {
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
					<div className="flex flex-none items-end justify-between px-6 pt-5">
						<div>
							<div className="text-2xl font-semibold">Tournament leaderboard</div>
							<div className="mt-1 text-sm text-fg-muted">
								Round 1. Ranked by dollar PNL. The top 3 at each table split 80% of the pot.
							</div>
						</div>
						<div className="flex items-center gap-6 text-xs">
							<div className="text-right">
								<div className="text-fg-muted">Pot (example)</div>
								<div className="text-base font-semibold tabular-nums">{usd(tier.pot)}</div>
							</div>
							<div className="text-right">
								<div className="text-fg-muted">Ends in</div>
								<div className="text-base font-semibold tabular-nums">
									{t.d}d {pad(t.h)}h {pad(t.m)}m {pad(t.s)}s
								</div>
							</div>
						</div>
					</div>
					<div className="flex flex-none items-center gap-1 px-6 pt-4 text-sm">
						{tierIds.map((id) => (
							<button
								key={id}
								type="button"
								onClick={() => setTierId(id)}
								className={cn(
									"h-8 rounded-6 px-3 transition-colors",
									id === tierId ? "bg-control text-fg" : "text-fg-muted hover:text-fg",
								)}
							>
								{tiers[id].label} <span className="text-fg-muted">({tiers[id].short})</span>
							</button>
						))}
						<span className="ml-auto text-xs text-fg-muted tabular-nums">
							{tier.count.toLocaleString()} traders. Arrows show rank change in the last 24h.
						</span>
					</div>
					<div key={tierId} className="t2v1-in flex min-h-0 flex-1 flex-col">
						<div className="grid flex-none grid-cols-3 gap-2 px-6 pt-4">
							{tier.traders.slice(0, 3).map((r) => (
								<TopCard key={r.address} r={r} tier={tier} />
							))}
						</div>
						<div className="mx-6 mt-4 flex min-h-0 flex-1 flex-col overflow-hidden rounded-8">
							<div className={cn("grid h-8 flex-none items-center gap-2 bg-band px-3 text-xs text-fg-muted", COLS)}>
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
							<div className="min-h-0 flex-1 overflow-y-auto">
								{tier.traders.slice(3).map((r) => (
									<Row key={r.address} r={r} />
								))}
							</div>
						</div>
						<div className="flex-none px-4 pt-2 pb-3">
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
				</div>
			</div>
		</>
	);
}

interface CardProps {
	r: Trader;
	tier: Tier;
}

function TopCard({ r, tier }: CardProps) {
	return (
		<div className="relative flex h-[188px] overflow-hidden rounded-8 bg-control p-4">
			<div className="flex min-w-0 flex-col">
				<div className="flex items-center gap-2">
					<Identicon id={r.address} className="size-8" />
					<div className="min-w-0">
						<div className="truncate text-sm">{traderName(r)}</div>
						<div className="text-xs text-fg-muted tabular-nums">
							<span className={pnlClass(r.dayPnl)}>{signedUsd(r.dayPnl, true)}</span> in 24h
						</div>
					</div>
				</div>
				<div className="mt-auto">
					<div className={cn("text-lg font-semibold tabular-nums", pnlClass(r.pnl))}>{signedUsd(r.pnl)}</div>
					<div className="text-xs text-fg-muted">Round PNL</div>
					<div className="mt-2 flex gap-4 text-xs tabular-nums">
						<span>
							<span className="text-fg-muted">Account </span>
							{usdCompact(r.accountValue)}
						</span>
						<span>
							<span className="text-fg-muted">Wins </span>
							{usd(prizeFor(tier, r.rank))}
						</span>
					</div>
				</div>
			</div>
			<Laurel place={r.rank} className="absolute top-3 right-3" />
			<Spark values={path(r)} width={210} height={96} area roundFrom={1} className="absolute right-5 bottom-5" />
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
				"grid h-11 items-center gap-2 border-b border-stroke-faint px-3 text-xs tabular-nums last:border-b-0",
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
			<span className={cn("text-right", pnlClass(r.pnl))}>{signedUsd(r.pnl)}</span>
			<span className={cn("text-right", pnlClass(r.roi))}>{pct(r.roi)}</span>
			<span className="text-right text-fg-secondary">{usdCompact(r.vlm)}</span>
			<span className="pl-4">
				<Spark values={path(r)} width={72} height={20} />
			</span>
			<span className={cn("text-right", pnlClass(r.dayPnl))}>{signedUsd(r.dayPnl, true)}</span>
		</div>
	);
}

export function V1Mobile() {
	const [tierId, setTierId] = useState<TierId>(MY_TIER);
	const tier = tiers[tierId];
	const t = useTimeLeft();
	return (
		<MobileShell>
			<style>{css}</style>
			<div className="flex h-full flex-col">
				<div className="min-h-0 flex-1 overflow-y-auto">
					<div className="px-4 pt-4">
						<div className="text-lg font-semibold">Tournament leaderboard</div>
						<div className="mt-1 text-xs text-fg-muted">Round 1. Top 3 split 80% of the pot.</div>
						<div className="mt-3 flex gap-2 text-xs tabular-nums">
							<div className="flex-1 rounded-8 bg-surface px-3 py-2">
								<div className="text-fg-muted">Pot (example)</div>
								<div className="text-base font-semibold">{usd(tier.pot)}</div>
							</div>
							<div className="flex-1 rounded-8 bg-surface px-3 py-2">
								<div className="text-fg-muted">Ends in</div>
								<div className="text-base font-semibold">
									{t.d}d {pad(t.h)}h {pad(t.m)}m
								</div>
							</div>
						</div>
						<div className="mt-3 flex rounded-8 bg-surface p-1 text-xs">
							{tierIds.map((id) => (
								<button
									key={id}
									type="button"
									onClick={() => setTierId(id)}
									className={cn("h-8 flex-1 rounded-6", id === tierId ? "bg-control-hover text-fg" : "text-fg-muted")}
								>
									{tiers[id].short}
								</button>
							))}
						</div>
					</div>
					<div key={tierId} className="t2v1-in">
						<div className="flex snap-x snap-mandatory gap-2 overflow-x-auto px-4 pt-3 pb-1">
							{tier.traders.slice(0, 3).map((r) => (
								<div
									key={r.address}
									className="relative h-[164px] w-[300px] flex-none snap-center rounded-8 bg-surface p-3"
								>
									<div className="flex items-center gap-2">
										<Identicon id={r.address} />
										<span className="truncate text-sm">{traderName(r)}</span>
									</div>
									<Laurel place={r.rank} className="absolute top-2 right-2" />
									<div className="absolute bottom-3 left-3">
										<div className={cn("text-base font-semibold tabular-nums", pnlClass(r.pnl))}>
											{signedUsd(r.pnl)}
										</div>
										<div className="text-xs text-fg-muted tabular-nums">Wins {usd(prizeFor(tier, r.rank))}</div>
									</div>
									<Spark values={path(r)} width={130} height={64} area className="absolute right-3 bottom-4" />
								</div>
							))}
						</div>
						<div className="mx-4 mt-3 mb-3 rounded-8 bg-surface">
							{tier.traders.slice(3, 20).map((r) => (
								<MobileRow key={r.address} r={r} />
							))}
						</div>
					</div>
				</div>
				<div className="flex-none bg-surface px-3 pt-2 pb-4">
					{tierId === MY_TIER ? (
						<div className="rounded-8 bg-control">
							<MobileRow r={me} you />
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

function MobileRow({ r, you }: { r: Trader; you?: boolean }) {
	return (
		<div className="flex h-12 items-center gap-2 border-b border-stroke-faint px-3 text-xs tabular-nums last:border-b-0">
			<span className="w-9 text-fg-secondary">{r.rank.toLocaleString()}</span>
			<Identicon id={r.address} className="size-6 rounded-4" />
			<span className="min-w-0 flex-1">
				<span className="flex items-center gap-1.5">
					<span className="truncate">{traderName(r)}</span>
					{you && <span className="rounded-full bg-fill px-1.5 text-2xs font-medium text-fg-inverse">You</span>}
				</span>
				<RankMove value={move(r)} zero="Same rank in 24h" className="text-2xs" />
			</span>
			<Spark values={path(r)} width={48} height={18} />
			<span className={cn("w-[84px] text-right", pnlClass(r.pnl))}>{signedUsd(r.pnl, true)}</span>
		</div>
	);
}
