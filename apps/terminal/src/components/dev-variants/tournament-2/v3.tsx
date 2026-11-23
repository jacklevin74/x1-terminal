import { ArrowRightIcon, CaretLeftIcon, CaretRightIcon } from "@phosphor-icons/react";
import { useState } from "react";
import { cn } from "@/lib/cn";
import {
	MY_TIER,
	me,
	move,
	moversOf,
	ordinal,
	pad,
	pnlClass,
	roundDates,
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
import { Blob, RankMove } from "./parts";

const css = `
.t2v3-in{animation:t2v3-in .24s cubic-bezier(.2,.8,.2,1)}
@keyframes t2v3-in{from{opacity:0;transform:scale(.97)}}
.t2v3-live{animation:t2v3-live 1.6s ease-in-out infinite}
@keyframes t2v3-live{50%{opacity:.35}}
`;

type Left = ReturnType<typeof useTimeLeft>;

const COLS = "grid-cols-[48px_1fr_72px_150px_150px_110px]";

export default function V3() {
	const [tierId, setTierId] = useState<TierId>(MY_TIER);
	const tier = tiers[tierId];
	const t = useTimeLeft();
	const dates = roundDates(t.ms);
	return (
		<>
			<style>{css}</style>
			<div className="absolute rounded-xs bg-background px-2 py-1 text-sm text-fg" style={{ left: 662, top: 11 }}>
				Tournament
			</div>
			<div className="absolute inset-x-0 bottom-0 bg-background p-1" style={{ top: 48 }}>
				<div className="flex h-full flex-col overflow-y-auto rounded-8 bg-surface px-8 pt-6">
					<div className="flex flex-none items-center gap-4">
						<div className="text-2xl font-semibold">
							<span className="text-fg-muted">Tournament </span>Round 1
						</div>
						<TierPills tierId={tierId} onChange={setTierId} />
						<div className="ml-auto flex h-9 items-center gap-3 rounded-8 bg-control px-2 text-sm">
							<CaretLeftIcon className="size-4 text-fg-muted" />
							<span className="tabular-nums">
								{dates.start} to {dates.end}
							</span>
							<span className="flex items-center gap-1 rounded-4 bg-control-hover px-1.5 py-0.5 text-2xs font-medium tracking-micro uppercase">
								<span className="t2v3-live size-1.5 rounded-full bg-market-up" />
								Live
							</span>
							<CaretRightIcon className="size-4 text-fg-disabled" />
						</div>
					</div>
					<div key={tierId} className="t2v3-in flex-none">
						<div className="mt-5 grid grid-cols-3 gap-3">
							<ProgressCard tier={tier} />
							<TimeCard t={t} />
							<PotCard tier={tier} />
						</div>
						<div className="mt-6 flex gap-6">
							<div className="min-w-0 flex-1">
								<div className="flex items-baseline justify-between">
									<span className="text-base font-medium">Leaderboard</span>
									<span className="text-xs text-fg-muted tabular-nums">
										{tier.count.toLocaleString()} traders at the {tier.label.toLowerCase()}
									</span>
								</div>
								<div className={cn("mt-2 grid h-8 items-center gap-3 text-xs text-fg-muted", COLS)}>
									<span>Rank</span>
									<span>Trader</span>
									<span>24h</span>
									<span className="text-right">Round PNL</span>
									<span className="text-right">Volume</span>
									<span className="text-right">Prize</span>
								</div>
								{tier.traders.slice(0, 12).map((r) => (
									<Row key={r.address} r={r} tier={tier} />
								))}
							</div>
							<Movers tier={tier} />
						</div>
						<div className="h-6" />
					</div>
				</div>
			</div>
		</>
	);
}

function TierPills({ tierId, onChange }: { tierId: TierId; onChange: (id: TierId) => void }) {
	return (
		<div className="flex rounded-full bg-control p-1 text-xs">
			{tierIds.map((id) => (
				<button
					key={id}
					type="button"
					onClick={() => onChange(id)}
					className={cn(
						"h-7 flex-1 whitespace-nowrap rounded-full px-3 transition-colors",
						id === tierId ? "bg-control-hover text-fg" : "text-fg-muted hover:text-fg",
					)}
				>
					{tiers[id].short}
				</button>
			))}
		</div>
	);
}

function Gauge({ share, size }: { share: number; size: number }) {
	const ticks = 48;
	const r = size / 2 - 4;
	const cx = size / 2;
	return (
		<svg width={size} height={size / 2 + 4} viewBox={`0 0 ${size} ${size / 2 + 4}`} aria-hidden="true">
			{Array.from({ length: ticks }, (_, i) => {
				const a = Math.PI - (i / (ticks - 1)) * Math.PI;
				const on = i / (ticks - 1) <= share;
				return (
					<line
						key={a}
						x1={cx + Math.cos(a) * (r - 18)}
						y1={cx - Math.sin(a) * (r - 18)}
						x2={cx + Math.cos(a) * r}
						y2={cx - Math.sin(a) * r}
						stroke={on ? "var(--color-fg)" : "var(--color-control-hover)"}
						strokeWidth={2}
						strokeLinecap="round"
					/>
				);
			})}
		</svg>
	);
}

function ProgressCard({ tier }: { tier: Tier }) {
	const mine = tier.id === MY_TIER;
	const beat = 1 - me.rank / tier.count;
	return (
		<div className="relative h-[232px] overflow-hidden rounded-8 bg-control p-5">
			<div className="text-sm font-medium">Your standing</div>
			<div className="text-xs text-fg-muted">
				{mine ? "Ranked by dollar PNL this round" : `You play at the ${tiers[MY_TIER].label.toLowerCase()}`}
			</div>
			{mine ? (
				<div className="absolute inset-x-0 bottom-4 flex flex-col items-center">
					<Gauge share={beat} size={280} />
					<div className="-mt-14 text-2xl font-semibold tabular-nums">#{me.rank.toLocaleString()}</div>
					<div className="text-xs text-fg-muted tabular-nums">
						Ahead of {Math.round(beat * 100)}% <RankMove value={move(me)} className="ml-1" /> in 24h
					</div>
				</div>
			) : (
				<div className="absolute inset-x-5 bottom-5 text-xs text-fg-muted">
					Your account is {usd(me.accountValue)}. Accounts over $1M play here.
				</div>
			)}
		</div>
	);
}

function TimeCard({ t }: { t: Left }) {
	const done = Math.floor(t.progress * 7);
	return (
		<div className="flex h-[232px] flex-col rounded-8 bg-control p-5">
			<div className="text-sm font-medium">Time remaining</div>
			<div className="text-xs text-fg-muted">Until the round ends and the pot pays out</div>
			<div className="mt-auto flex items-baseline gap-3 font-semibold tabular-nums">
				<Unit v={pad(t.d)} u="D" />
				<Unit v={pad(t.h)} u="H" />
				<Unit v={pad(t.m)} u="M" />
			</div>
			<div className="mt-3 grid grid-cols-7 gap-1.5">
				{Array.from({ length: 7 }, (_, i) => (
					<span
						key={`day-${i + 1}`}
						className={cn(
							"h-7 rounded-4",
							i < done && "bg-fill",
							i === done && "t2v3-live bg-fill",
							i > done && "bg-control-hover",
						)}
					/>
				))}
			</div>
		</div>
	);
}

function Unit({ v, u }: { v: string; u: string }) {
	return (
		<span className="text-2xl">
			{v}
			<span className="text-fg-disabled">{u}</span>
		</span>
	);
}

function PotCard({ tier }: { tier: Tier }) {
	return (
		<div className="flex h-[232px] flex-col rounded-8 bg-control p-5">
			<div className="text-sm font-medium">Prize pool</div>
			<div className="text-xs text-fg-muted">Builder fees from this table (example)</div>
			<div className="mt-auto text-2xl font-semibold tabular-nums">{usd(tier.pot)}</div>
			<div className="mt-3 flex flex-col gap-1.5 text-xs tabular-nums">
				{tier.payouts.map((p, i) => (
					<div key={ordinal[i]} className="flex items-center gap-3">
						<span className="w-7 text-fg-muted">{ordinal[i]}</span>
						<span className="h-1.5 flex-1 rounded-full bg-control-hover">
							<span
								className={cn("block h-full rounded-full", i === 0 ? "bg-fill" : "bg-fg-muted")}
								style={{ width: `${(p / tier.payouts[0]) * 100}%` }}
							/>
						</span>
						<span className="w-14 text-right">{usd(p)}</span>
					</div>
				))}
			</div>
		</div>
	);
}

function Medal({ place }: { place: number }) {
	return (
		<span
			className={cn(
				"absolute -right-1 -bottom-1 grid size-4 place-items-center rounded-full text-2xs font-semibold",
				place === 1 ? "bg-fill text-fg-inverse" : "bg-control-hover text-fg",
			)}
		>
			{place}
		</span>
	);
}

function Row({ r, tier }: { r: Trader; tier: Tier }) {
	const prize = r.rank <= 3 ? tier.payouts[r.rank - 1] : 0;
	return (
		<div className={cn("grid h-14 items-center gap-3 border-b border-stroke-faint text-sm tabular-nums", COLS)}>
			<span className="text-fg-muted">{r.rank}</span>
			<span className="flex min-w-0 items-center gap-3">
				<span className="relative">
					<Blob id={r.address} />
					{r.rank <= 3 && <Medal place={r.rank} />}
				</span>
				<span className="truncate">{traderName(r)}</span>
			</span>
			<RankMove value={move(r)} className="text-xs" />
			<span className={cn("text-right", pnlClass(r.pnl))}>{signedUsd(r.pnl)}</span>
			<span className="text-right text-fg-secondary">{usdCompact(r.vlm)}</span>
			<span className={cn("text-right", prize ? "text-fg" : "text-fg-disabled")}>{prize ? usd(prize) : "$0"}</span>
		</div>
	);
}

function Movers({ tier }: { tier: Tier }) {
	return (
		<div className="w-[340px] flex-none self-start rounded-8 bg-control p-4">
			<div className="text-base font-medium">Biggest climbs today</div>
			<div className="text-xs text-fg-muted">Rank 24h ago and now</div>
			<div className="mt-2">
				{moversOf(tier).map((r, i) => (
					<div key={r.address} className="flex items-center gap-3 border-b border-stroke-faint py-3 last:border-b-0">
						<span className="w-3 text-xs text-fg-muted">{i + 1}</span>
						<Blob id={r.address} className="size-7" />
						<div className="min-w-0 flex-1">
							<div className="truncate text-sm">{traderName(r)}</div>
							<div className="flex items-center gap-1.5 text-xs tabular-nums">
								<span className="text-fg-muted">#{r.prevRank}</span>
								<ArrowRightIcon className="size-3 text-fg-muted" />
								<span>#{r.rank}</span>
								<span className={cn("ml-1", pnlClass(r.dayPnl))}>{signedUsd(r.dayPnl, true)} today</span>
							</div>
						</div>
					</div>
				))}
			</div>
		</div>
	);
}

export function V3Mobile() {
	const [tierId, setTierId] = useState<TierId>(MY_TIER);
	const tier = tiers[tierId];
	const t = useTimeLeft();
	const dates = roundDates(t.ms);
	const done = Math.floor(t.progress * 7);
	return (
		<MobileShell>
			<style>{css}</style>
			<div className="h-full overflow-y-auto px-4 pt-4 pb-6">
				<div className="flex items-center justify-between">
					<span className="text-lg font-semibold">Round 1</span>
					<span className="flex items-center gap-1.5 text-xs text-fg-muted tabular-nums">
						<span className="t2v3-live size-1.5 rounded-full bg-market-up" />
						{dates.start} to {dates.end}
					</span>
				</div>
				<div className="mt-3">
					<TierPills tierId={tierId} onChange={setTierId} />
				</div>
				<div key={tierId} className="t2v3-in">
					<div className="mt-3 grid grid-cols-2 gap-2">
						<div className="rounded-8 bg-surface p-3">
							<div className="text-xs text-fg-muted">Time remaining</div>
							<div className="mt-1 text-base font-semibold tabular-nums">
								{pad(t.d)}
								<span className="text-fg-disabled">D </span>
								{pad(t.h)}
								<span className="text-fg-disabled">H </span>
								{pad(t.m)}
								<span className="text-fg-disabled">M</span>
							</div>
							<div className="mt-2 grid grid-cols-7 gap-1">
								{Array.from({ length: 7 }, (_, i) => (
									<span
										key={`d-${i + 1}`}
										className={cn("h-3 rounded-4", i <= done ? "bg-fill" : "bg-control-hover")}
									/>
								))}
							</div>
						</div>
						<div className="rounded-8 bg-surface p-3">
							<div className="text-xs text-fg-muted">Prize pool (example)</div>
							<div className="mt-1 text-base font-semibold tabular-nums">{usd(tier.pot)}</div>
							<div className="mt-1 text-xs text-fg-muted tabular-nums">1st wins {usdCompact(tier.payouts[0])}</div>
						</div>
					</div>
					{tierId === MY_TIER && (
						<div className="mt-2 flex items-center gap-3 rounded-8 bg-surface p-3">
							<Blob id={me.address} />
							<div className="flex-1 text-xs">
								<div className="text-fg-muted">Your standing</div>
								<div className="text-base font-semibold tabular-nums">
									#{me.rank.toLocaleString()}{" "}
									<span className="text-xs font-normal text-fg-muted">of {tier.count.toLocaleString()}</span>
								</div>
							</div>
							<div className="text-right text-xs tabular-nums">
								<div className={pnlClass(me.pnl)}>{signedUsd(me.pnl)}</div>
								<RankMove value={move(me)} />
							</div>
						</div>
					)}
					<div className="mt-4 text-sm font-medium">Leaderboard</div>
					<div className="mt-1">
						{tier.traders.slice(0, 15).map((r) => (
							<div
								key={r.address}
								className="flex h-14 items-center gap-3 border-b border-stroke-faint text-sm tabular-nums"
							>
								<span className="w-5 text-xs text-fg-muted">{r.rank}</span>
								<span className="relative">
									<Blob id={r.address} />
									{r.rank <= 3 && <Medal place={r.rank} />}
								</span>
								<span className="min-w-0 flex-1">
									<span className="block truncate">{traderName(r)}</span>
									<RankMove value={move(r)} zero="Same rank in 24h" className="text-xs" />
								</span>
								<span className={cn("text-right", pnlClass(r.pnl))}>{signedUsd(r.pnl, true)}</span>
							</div>
						))}
					</div>
				</div>
			</div>
		</MobileShell>
	);
}
