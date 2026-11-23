import { TimerIcon } from "@phosphor-icons/react";
import { useState } from "react";
import { cn } from "@/lib/cn";
import {
	clock,
	MY_TIER,
	me,
	PAYOUT_SHARE,
	pct,
	placeLabel,
	pnlClass,
	ROUND,
	short,
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

const css = `
.t1-in{animation:t1-in .24s cubic-bezier(.2,.8,.2,1)}
@keyframes t1-in{from{opacity:0;transform:scale(.97)}}
`;

const PODIUM_ORDER = [1, 0, 2];
const PODIUM_HEIGHT = [264, 204, 164];

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
			<div className="absolute inset-x-0 bottom-0 flex gap-1 bg-background p-1" style={{ top: 48 }}>
				<div key={tierId} className="t1-in flex w-[600px] flex-none flex-col rounded-8 bg-surface p-6">
					<div className="flex items-center justify-between">
						<div>
							<div className="text-base font-medium">Round {ROUND.number}</div>
							<div className="text-xs text-fg-muted">7-day trading tournament</div>
						</div>
						<div className="flex rounded-full bg-control p-1 text-xs">
							{tierIds.map((id) => (
								<button
									key={id}
									type="button"
									onClick={() => setTierId(id)}
									className={cn(
										"h-7 rounded-full px-3 transition-colors",
										id === tierId ? "bg-control-hover text-fg" : "text-fg-muted hover:text-fg",
									)}
								>
									{tiers[id].short}
								</button>
							))}
						</div>
					</div>
					<div className="mt-8 flex flex-col items-center text-center">
						<div className="text-2xs tracking-micro text-fg-muted uppercase">Pot so far</div>
						<div className="mt-1 text-2xl font-semibold tabular-nums">{usd(tier.pot)}</div>
						<div className="mt-2 text-xs text-fg-muted">
							Builder fees from {tier.rule.replace("Accounts", "accounts")} this round. Top 3 share {PAYOUT_SHARE * 100}
							%.
						</div>
						<div className="mt-4 flex items-center gap-2 rounded-full bg-control px-3 py-1.5 text-xs tabular-nums">
							<TimerIcon className="size-4 text-fg-muted" />
							<span className="text-fg-muted">Ends in</span>
							<span>{clock(t)}</span>
						</div>
					</div>
					<div className="mt-8 grid grid-cols-3 gap-2 rounded-8 bg-control p-4 text-xs tabular-nums">
						{tierId === MY_TIER ? (
							<>
								<Fact label="Your rank" value={`${me.rank.toLocaleString()} of ${tier.count.toLocaleString()}`} />
								<Fact label="Your round PNL" value={signedUsd(me.pnl)} className={pnlClass(me.pnl)} />
								<Fact label="Gap to 3rd" value={usd(tier.traders[2].pnl - me.pnl)} />
							</>
						) : (
							<span className="col-span-3 text-fg-muted">
								You play at the {tiers[MY_TIER].label.toLowerCase()} (account {usd(me.accountValue)}).
							</span>
						)}
					</div>
					<div className="mt-auto flex items-end justify-center gap-2">
						{PODIUM_ORDER.map((i) => (
							<Step key={i} place={i} trader={tier.traders[i]} payout={tier.payouts[i]} height={PODIUM_HEIGHT[i]} />
						))}
					</div>
				</div>
				<div className="flex min-w-0 flex-1 flex-col rounded-8 bg-surface">
					<div className="flex h-12 flex-none items-center justify-between px-4">
						<span className="text-sm font-medium">{tier.label} standings</span>
						<span className="text-xs text-fg-muted tabular-nums">
							{tier.count.toLocaleString()} traders. Ranked by dollar PNL this round.
						</span>
					</div>
					<div className="grid h-8 flex-none grid-cols-[56px_1fr_140px_140px_100px_140px] items-center gap-2 bg-band px-4 text-xs text-fg-muted">
						<span>Rank</span>
						<span>Trader</span>
						<span className="text-right">Account value</span>
						<span className="text-right">Round PNL</span>
						<span className="text-right">ROI</span>
						<span className="text-right">Volume</span>
					</div>
					<div className="min-h-0 flex-1 overflow-y-auto">
						{tier.traders.map((r) => (
							<Row key={r.address} r={r} />
						))}
					</div>
					<div className="flex-none p-2">
						{tierId === MY_TIER ? (
							<div className="rounded-8 bg-control px-2">
								<Row r={me} you />
							</div>
						) : (
							<div className="flex h-10 items-center rounded-8 bg-control px-4 text-xs text-fg-muted">
								You play at the {tiers[MY_TIER].label.toLowerCase()} (account {usd(me.accountValue)}).
							</div>
						)}
					</div>
				</div>
			</div>
		</>
	);
}

interface StepProps {
	place: number;
	trader: Trader;
	payout: number;
	height: number;
}

function Step({ place, trader, payout, height }: StepProps) {
	return (
		<div className="flex w-[172px] flex-col items-center gap-3">
			<div className="flex flex-col items-center gap-0.5 text-center">
				<span className="text-xs text-fg-secondary">{traderName(trader)}</span>
				<span className={cn("text-sm font-medium tabular-nums", pnlClass(trader.pnl))}>
					{signedUsd(trader.pnl, true)}
				</span>
			</div>
			<div
				className={cn(
					"flex w-full flex-col items-center gap-1 rounded-t-8 pt-4",
					place === 0 ? "bg-fill text-fg-inverse" : "bg-control text-fg",
				)}
				style={{ height }}
			>
				<span className="text-base font-semibold">{placeLabel[place]}</span>
				<span className={cn("text-xs tabular-nums", place === 0 ? "text-fg-inverse-muted" : "text-fg-muted")}>
					Wins {usdCompact(payout)}
				</span>
			</div>
		</div>
	);
}

function Row({ r, you }: { r: Trader; you?: boolean }) {
	return (
		<div
			className={cn(
				"grid h-9 grid-cols-[56px_1fr_140px_140px_100px_140px] items-center gap-2 border-b border-stroke-faint text-xs tabular-nums last:border-b-0",
				you ? "px-2" : "px-4",
			)}
		>
			<span className={cn(r.rank <= 3 ? "font-semibold text-fg" : "text-fg-secondary")}>{r.rank.toLocaleString()}</span>
			<span className="flex items-center gap-2">
				<span>{short(r.address)}</span>
				{you && <span className="rounded-full bg-fill px-2 py-0.5 text-2xs font-medium text-fg-inverse">You</span>}
			</span>
			<span className="text-right text-fg-secondary">{usd(r.accountValue)}</span>
			<span className={cn("text-right", pnlClass(r.pnl))}>{signedUsd(r.pnl)}</span>
			<span className={cn("text-right", pnlClass(r.roi))}>{pct(r.roi)}</span>
			<span className="text-right text-fg-secondary">{usdCompact(r.vlm)}</span>
		</div>
	);
}

function Fact({ label, value, className }: { label: string; value: string; className?: string }) {
	return (
		<div className="flex flex-col gap-0.5">
			<span className="text-fg-muted">{label}</span>
			<span className={cn("text-sm", className)}>{value}</span>
		</div>
	);
}
