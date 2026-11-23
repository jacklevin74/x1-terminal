import { useState } from "react";
import { cn } from "@/lib/cn";
import {
	FEE_BPS,
	MY_TIER,
	me,
	PAYOUT_SHARE,
	pad,
	pct,
	placeLabel,
	pnlClass,
	ROUND,
	signedUsd,
	type TierId,
	type Trader,
	tierIds,
	tiers,
	usd,
	useTimeLeft,
} from "./data";

const COLS = "grid-cols-[48px_340px_1fr_1fr_88px_1fr_1fr_1fr]";

export default function V2() {
	const [tierId, setTierId] = useState<TierId>(MY_TIER);
	const tier = tiers[tierId];
	const t = useTimeLeft();
	const mine = tierId === MY_TIER;
	return (
		<>
			<div className="absolute rounded-xs bg-background px-2 py-1 text-sm text-fg" style={{ left: 662, top: 11 }}>
				Tournament
			</div>
			<div className="absolute inset-x-0 bottom-0 flex flex-col gap-1 bg-background p-1" style={{ top: 48 }}>
				<div className="flex flex-none rounded-8 bg-surface px-4 py-3 text-xs tabular-nums">
					<Stat
						label="Round"
						value={`${ROUND.number}, day ${Math.min(ROUND.days, Math.floor(t.progress * ROUND.days) + 1)} of ${ROUND.days}`}
					/>
					<Stat label="Time left" value={`${t.d}d ${pad(t.h)}:${pad(t.m)}:${pad(t.s)}`} />
					<Stat label="Pot (fees so far)" value={usd(tier.pot)} strong />
					<Stat label="Fee into pot" value={`${FEE_BPS} bps per trade`} />
					<Stat label={`Top 3 split (${PAYOUT_SHARE * 100}%)`} value={tier.payouts.map((p) => usd(p)).join(" / ")} />
					<Stat label="Traders" value={tier.count.toLocaleString()} />
					<Stat
						label="Your rank"
						value={mine ? `${me.rank.toLocaleString()} of ${tier.count.toLocaleString()}` : "Not at this table"}
					/>
				</div>
				<div className="flex min-h-0 flex-1 flex-col rounded-8 bg-surface">
					<div className="flex h-10 flex-none items-center gap-1 border-b border-stroke-weak px-2 text-xs">
						{tierIds.map((id) => (
							<button
								key={id}
								type="button"
								onClick={() => setTierId(id)}
								className={cn(
									"flex h-10 items-center gap-2 border-b-2 px-3",
									id === tierId ? "border-fg text-fg" : "border-transparent text-fg-muted hover:text-fg",
								)}
							>
								{tiers[id].label}
								<span className="text-fg-muted">{tiers[id].rule}</span>
							</button>
						))}
						<span className="ml-auto pr-2 text-fg-muted">
							Hyperliquid week window as round stand-in. Ranked by dollar PNL.
						</span>
					</div>
					<div
						className={cn(
							"grid h-7 flex-none items-center gap-3 bg-band px-4 text-2xs tracking-micro text-fg-muted uppercase",
							COLS,
						)}
					>
						<span>#</span>
						<span>Trader</span>
						<span className="text-right">Account value</span>
						<span className="text-right">Round PNL</span>
						<span className="text-right">ROI</span>
						<span className="text-right">Volume</span>
						<span className="text-right">Fees ({FEE_BPS} bps)</span>
						<span className="text-right">Payout</span>
					</div>
					{mine && <Line r={me} payout={null} you />}
					<div className="min-h-0 flex-1 overflow-y-auto">
						{tier.traders.map((r, i) => (
							<Line key={r.address} r={r} payout={i < 3 ? tier.payouts[i] : null} />
						))}
					</div>
				</div>
			</div>
		</>
	);
}

function Stat({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
	return (
		<div className="flex flex-1 flex-col gap-0.5">
			<span className="text-2xs tracking-micro text-fg-muted uppercase">{label}</span>
			<span className={cn(strong ? "text-sm font-semibold text-fg" : "text-fg-secondary")}>{value}</span>
		</div>
	);
}

function Line({ r, payout, you }: { r: Trader; payout: number | null; you?: boolean }) {
	return (
		<div
			className={cn(
				"grid h-6 items-center gap-3 px-4 font-mono text-xs tabular-nums",
				COLS,
				you ? "flex-none bg-control" : "hover:bg-fill-hover",
			)}
		>
			<span className="text-fg-muted">{r.rank}</span>
			<span className="flex items-center gap-2 text-fg-secondary">
				{r.address}
				{you && <span className="font-sans text-fg">You</span>}
			</span>
			<span className="text-right text-fg-secondary">{usd(r.accountValue)}</span>
			<span className={cn("text-right", pnlClass(r.pnl))}>{signedUsd(r.pnl)}</span>
			<span className={cn("text-right", pnlClass(r.roi))}>{pct(r.roi)}</span>
			<span className="text-right text-fg-secondary">{usd(r.vlm)}</span>
			<span className="text-right text-fg-secondary">{usd(r.vlm * (FEE_BPS / 10_000))}</span>
			<span className="text-right">
				{payout === null ? (
					<span className="text-fg-disabled">-</span>
				) : (
					<span className="text-fg">
						{usd(payout)} <span className="text-fg-muted">{placeLabel[r.rank - 1]}</span>
					</span>
				)}
			</span>
		</div>
	);
}
