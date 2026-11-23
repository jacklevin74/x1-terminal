import { CrownSimpleIcon, LockSimpleIcon } from "@phosphor-icons/react";
import { useState } from "react";
import { cn } from "@/lib/cn";
import {
	FEE_RATE,
	MY_TIER,
	me,
	move,
	ordinal,
	pad,
	pct,
	pnlClass,
	signedUsd,
	type Tier,
	type TierId,
	type Trader,
	tiers,
	traderName,
	usd,
	usdCompact,
	useTimeLeft,
} from "./data";
import { Blob, RankMove } from "./parts";

const css = `
.t2v2-in{animation:t2v2-in .24s cubic-bezier(.2,.8,.2,1)}
@keyframes t2v2-in{from{opacity:0;transform:scale(.97)}}
`;

const STEPS: Record<TierId, number[]> = {
	low: [5_000, 10_000, 15_000, 20_000, 30_000, 50_000],
	high: [25_000, 50_000, 75_000, 100_000, 150_000, 250_000],
};

const ORDER: TierId[] = ["low", "high"];

const COLS = "grid-cols-[72px_64px_1fr_140px_140px_100px_120px]";

export default function V2() {
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
				<div className="flex h-full flex-col overflow-y-auto rounded-8 bg-surface">
					<div className="flex flex-none flex-col items-center pt-6">
						<div className="text-2xs tracking-micro text-fg-muted uppercase">X1 Terminal trading tournament</div>
						<div className="mt-1 text-2xl font-semibold">Round 1</div>
						<div className="mt-1 text-sm text-fg-muted">
							Top 3 by dollar PNL at each table share 80% of that table's pot.
						</div>
						<div className="mt-4 flex items-center gap-1.5 text-sm text-fg-muted">
							<span className="mr-2">Ends in</span>
							<Digit v={pad(t.d)} unit="D" />
							<Digit v={pad(t.h)} unit="H" />
							<Digit v={pad(t.m)} unit="M" />
							<Digit v={pad(t.s)} unit="S" />
						</div>
					</div>
					<div className="mx-auto mt-5 grid w-[1160px] flex-none grid-cols-2 gap-2">
						{ORDER.map((id) => (
							<button
								key={id}
								type="button"
								onClick={() => setTierId(id)}
								className={cn(
									"flex h-14 flex-col items-center justify-center rounded-8 transition-colors",
									id === tierId ? "bg-control-hover text-fg" : "bg-control text-fg-muted hover:text-fg-secondary",
								)}
							>
								<span className="text-sm font-medium">{tiers[id].label}</span>
								<span className="text-xs text-fg-muted">
									{tiers[id].rule}. {tiers[id].count.toLocaleString()} traders.
								</span>
							</button>
						))}
					</div>
					<div key={tierId} className="t2v2-in mx-auto w-[1160px] flex-none">
						<PotTrack tier={tier} />
						<div className="mt-2 grid grid-cols-3 gap-2">
							{tier.traders.slice(0, 3).map((r, i) => (
								<PrizeCard key={r.address} r={r} place={i} payout={tier.payouts[i]} />
							))}
						</div>
						<div className="mt-2 overflow-hidden rounded-8 bg-control">
							<div className={cn("grid h-9 items-center gap-2 bg-band px-4 text-xs text-fg-muted", COLS)}>
								<span>Rank</span>
								<span>24h</span>
								<span>Trader</span>
								<span className="text-right">Round PNL</span>
								<span className="text-right">Account value</span>
								<span className="text-right">ROI</span>
								<span className="text-right">Volume</span>
							</div>
							{tier.traders.slice(3, 10).map((r) => (
								<Row key={r.address} r={r} />
							))}
							{tierId === MY_TIER ? (
								<div className="m-2 rounded-6 bg-control-hover">
									<Row r={me} you />
								</div>
							) : (
								<div className="m-2 flex h-10 items-center rounded-6 bg-control-hover px-4 text-xs text-fg-muted">
									You play at the {tiers[MY_TIER].label.toLowerCase()} (account {usd(me.accountValue)}).
								</div>
							)}
						</div>
						<div className="h-4" />
					</div>
				</div>
			</div>
		</>
	);
}

function Digit({ v, unit }: { v: string; unit: string }) {
	return (
		<span className="flex items-center gap-1">
			<span className="grid h-9 w-11 place-items-center rounded-6 bg-control text-lg font-semibold text-fg tabular-nums">
				{v}
			</span>
			<span className="text-xs">{unit}</span>
		</span>
	);
}

function roundUsd(n: number) {
	if (n >= 1e6) return `$${n / 1e6}M`;
	return `$${n / 1e3}K`;
}

function PotTrack({ tier }: { tier: Tier }) {
	const steps = STEPS[tier.id];
	const reached = steps.filter((s) => s <= tier.pot).length;
	const prev = reached ? steps[reached - 1] : 0;
	const next = steps[reached] ?? steps[steps.length - 1];
	const within = Math.min(1, (tier.pot - prev) / (next - prev));
	const fill = ((reached - 1 + within) / (steps.length - 1)) * 100;
	return (
		<div className="mt-2 rounded-8 bg-control px-6 pt-5 pb-6">
			<div className="flex items-start justify-between">
				<div>
					<div className="text-2xl font-semibold tabular-nums">{usd(tier.pot)}</div>
					<div className="text-xs text-fg-muted">Pot so far (example)</div>
				</div>
				<div className="text-right">
					<div className="text-2xl font-semibold tabular-nums">{usdCompact(tier.feeVolume)}</div>
					<div className="text-xs text-fg-muted">
						Fee volume this round (example). Every trade adds 5 bps to the pot.
					</div>
				</div>
			</div>
			<div className="relative mt-6 h-12">
				<div className="absolute inset-x-3 top-[22px] h-1 rounded-full bg-control-hover" />
				<div
					className="absolute top-[22px] left-3 h-1 rounded-full bg-fill"
					style={{ width: `calc((100% - 24px) * ${Math.max(0, fill) / 100})` }}
				/>
				<div className="absolute inset-x-0 top-0 flex justify-between">
					{steps.map((s, i) => (
						<div key={s} className="flex w-6 flex-col items-center gap-1 text-xs tabular-nums">
							<span className={cn("whitespace-nowrap", i < reached ? "text-fg" : "text-fg-muted")}>{roundUsd(s)}</span>
							<span
								className={cn(
									"grid size-4 place-items-center rounded-full",
									i < reached ? "bg-fill" : "bg-control-hover",
								)}
							>
								{i >= reached && <LockSimpleIcon weight="fill" className="size-2.5 text-fg-muted" />}
							</span>
							<span className="whitespace-nowrap text-fg-muted">{roundUsd(s / FEE_RATE)}</span>
						</div>
					))}
				</div>
			</div>
		</div>
	);
}

interface PrizeProps {
	r: Trader;
	place: number;
	payout: number;
}

function PrizeCard({ r, place, payout }: PrizeProps) {
	return (
		<div className="flex h-[112px] items-center gap-4 rounded-8 bg-control px-5">
			<span
				className={cn(
					"grid size-16 shrink-0 place-items-center rounded-8",
					place === 0 ? "bg-fill text-fg-inverse" : "bg-control-hover text-fg-secondary",
				)}
			>
				<CrownSimpleIcon weight="fill" className="size-8" />
			</span>
			<div className="min-w-0 flex-1">
				<div className="flex items-center gap-2">
					<span className="rounded-full bg-control-hover px-2 py-0.5 text-xs">{ordinal[place]}</span>
					<span className="text-lg font-semibold tabular-nums">{usd(payout)}</span>
				</div>
				<div className="mt-2 flex items-center gap-2 text-xs">
					<Blob id={r.address} className="size-5" />
					<span className="truncate text-fg-secondary">{traderName(r)}</span>
					<span className={cn("ml-auto tabular-nums", pnlClass(r.pnl))}>{signedUsd(r.pnl, true)}</span>
				</div>
			</div>
		</div>
	);
}

function Row({ r, you }: { r: Trader; you?: boolean }) {
	return (
		<div
			className={cn(
				"grid h-10 items-center gap-2 border-b border-stroke-faint px-4 text-xs tabular-nums last:border-b-0",
				COLS,
			)}
		>
			<span className="text-fg-secondary">{r.rank.toLocaleString()}</span>
			<RankMove value={move(r)} />
			<span className="flex min-w-0 items-center gap-2">
				<Blob id={r.address} className="size-5" />
				<span className="truncate">{traderName(r)}</span>
				{you && <span className="rounded-full bg-fill px-2 py-0.5 text-2xs font-medium text-fg-inverse">You</span>}
			</span>
			<span className={cn("text-right", pnlClass(r.pnl))}>{signedUsd(r.pnl)}</span>
			<span className="text-right text-fg-secondary">{usd(r.accountValue)}</span>
			<span className={cn("text-right", pnlClass(r.roi))}>{pct(r.roi)}</span>
			<span className="text-right text-fg-secondary">{usdCompact(r.vlm)}</span>
		</div>
	);
}
