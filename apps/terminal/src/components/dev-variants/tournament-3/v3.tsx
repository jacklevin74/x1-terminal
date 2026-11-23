import { SegmentedControlItem, SegmentedControls } from "@hypeterminal/ui";
import { useId, useState } from "react";
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
	roundDates,
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
.t3v3-in{animation:t3v3-in .24s cubic-bezier(.2,.8,.2,1)}
@keyframes t3v3-in{from{opacity:0;transform:scale(.97)}}
`;

const COLS = "grid-cols-[56px_56px_1fr_132px_140px_96px_112px_112px_104px]";
const X_AT = [0, 23 / 30, 29 / 30, 1];
const STEP = [236, 196, 164];
const ORDER = [1, 0, 2];

export default function V3() {
	const [tierId, setTierId] = useState<TierId>(MY_TIER);
	const tier = tiers[tierId];
	const t = useTimeLeft();
	const dates = roundDates(t.ms);
	const top = tier.traders.slice(0, 3);
	return (
		<>
			<style>{css}</style>
			<div className="absolute rounded-xs bg-background px-2 py-1 text-sm text-fg" style={{ left: 662, top: 11 }}>
				Tournament
			</div>
			<div className="absolute inset-x-0 bottom-0 bg-background p-1" style={{ top: 48 }}>
				<div className="flex h-full flex-col rounded-8 bg-surface">
					<div className="flex flex-none items-center px-6 pt-5">
						<div>
							<div className="text-lg font-semibold">Tournament leaderboard</div>
							<div className="text-xs text-fg-muted">
								Round 1. Ranked by dollar PNL. The top 3 at each table split 80% of the pot.
							</div>
						</div>
						<div className="ml-auto">
							<SegmentedControls value={tierId} onValueChange={(v) => setTierId(v as TierId)} size="md">
								{tierIds.map((id) => (
									<SegmentedControlItem key={id} value={id}>
										{tiers[id].label} <span className="text-fg-muted">({tiers[id].short})</span>
									</SegmentedControlItem>
								))}
							</SegmentedControls>
						</div>
					</div>
					<div key={tierId} className="t3v3-in flex min-h-0 flex-1 flex-col">
						<div className="grid flex-none grid-cols-[296px_1fr_296px] gap-2 px-6 pt-4">
							<div className="flex flex-col self-end rounded-8 bg-control p-5" style={{ height: STEP[0] }}>
								<div className="text-xs text-fg-muted">Pot (example)</div>
								<div className="text-2xl font-semibold tabular-nums">{usd(tier.pot)}</div>
								<div className="mt-auto flex flex-col gap-1">
									{SPLIT.map((s, i) => (
										<div
											key={ordinal[i]}
											className="flex h-9 items-center rounded-6 bg-control-hover px-3 text-xs tabular-nums"
										>
											<span className="w-10 text-fg-secondary">{ordinal[i]}</span>
											<span className="text-fg-muted">{Math.round(s * 80)}% of pot</span>
											<span className="ml-auto font-semibold">{usd(tier.payouts[i])}</span>
										</div>
									))}
								</div>
							</div>
							<div className="flex items-end justify-center gap-2">
								{ORDER.map((i) => (
									<Step key={top[i].address} r={top[i]} tier={tier} height={STEP[i]} />
								))}
							</div>
							<div className="flex flex-col self-end rounded-8 bg-control p-5" style={{ height: STEP[0] }}>
								<div className="text-xs text-fg-muted">Ends in</div>
								<div className="mt-2 grid grid-cols-4 gap-1 tabular-nums">
									{[
										[t.d, "days"],
										[pad(t.h), "hrs"],
										[pad(t.m), "min"],
										[pad(t.s), "sec"],
									].map(([n, u]) => (
										<div key={u} className="rounded-6 bg-control-hover py-2 text-center">
											<div className="text-lg font-semibold">{n}</div>
											<div className="text-2xs text-fg-muted">{u}</div>
										</div>
									))}
								</div>
								<div className="mt-auto">
									<div className="flex justify-between text-xs text-fg-muted">
										<span>{dates.start}</span>
										<span>{dates.end}</span>
									</div>
									<div className="mt-1 grid grid-cols-7 gap-1">
										{Array.from({ length: 7 }, (_, d) => (
											<span
												key={`day-${d + 1}`}
												className={cn(
													"h-2 rounded-full",
													d < Math.floor(t.progress * 7) ? "bg-fill" : "bg-control-hover",
												)}
											/>
										))}
									</div>
									<div className="mt-3 text-xs text-fg-muted tabular-nums">
										{tier.count.toLocaleString()} traders. Arrows show rank change in the last 24h.
									</div>
								</div>
							</div>
						</div>
						<div className="mx-6 mt-4 flex min-h-0 flex-1 flex-col">
							<div className={cn("grid h-7 flex-none items-center gap-2 px-3 text-xs text-fg-muted", COLS)}>
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
							<div className="flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto">
								{tier.traders.slice(3).map((r) => (
									<Row key={r.address} r={r} />
								))}
							</div>
						</div>
						<div className="flex-none px-6 pt-2 pb-3">
							{tierId === MY_TIER ? (
								<Row r={me} you />
							) : (
								<div className="flex h-11 items-center rounded-6 bg-control-hover px-4 text-xs text-fg-muted">
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

interface StepProps {
	r: Trader;
	tier: Tier;
	height: number;
}

function Step({ r, tier, height }: StepProps) {
	const first = r.rank === 1;
	return (
		<div className="flex w-[268px] flex-col items-center">
			<Identicon id={r.address} className={cn("rounded-full", first ? "size-12" : "size-10")} />
			<div className="mt-2 max-w-full truncate text-sm">{traderName(r)}</div>
			<div className={cn("mb-2 text-xs tabular-nums", pnlClass(r.dayPnl))}>{signedUsd(r.dayPnl, true)} in 24h</div>
			<div
				className={cn(
					"relative flex w-full flex-col items-center overflow-hidden rounded-8 pt-3",
					first ? "bg-control-hover" : "bg-control",
				)}
				style={{ height }}
			>
				<span className={cn("text-xl leading-none font-semibold tabular-nums", first ? "text-fg" : "text-fg-muted")}>
					{r.rank}
				</span>
				<span className={cn("mt-2 text-base font-semibold tabular-nums", pnlClass(r.pnl))}>{signedUsd(r.pnl)}</span>
				<span className="text-xs text-fg-muted tabular-nums">
					Wins {usd(prizeFor(tier, r.rank))}. Account {usdCompact(r.accountValue)}.
				</span>
				<Carved values={path(r)} width={268} height={height - 108} />
			</div>
		</div>
	);
}

interface CarvedProps {
	values: number[];
	width: number;
	height: number;
	fill?: string;
}

function Carved({ values, width, height, fill = "var(--bg-raised)" }: CarvedProps) {
	const gid = useId();
	const min = Math.min(...values);
	const max = Math.max(...values);
	const span = max - min || 1;
	const pts = values.map((v, i) => [X_AT[i] * width, 6 + (1 - (v - min) / span) * (height - 12)]);
	const line = pts.map((p, i) => `${i ? "L" : "M"}${p[0]},${p[1]}`).join(" ");
	const round = pts
		.slice(1)
		.map((p, i) => `${i ? "L" : "M"}${p[0]},${p[1]}`)
		.join(" ");
	const color = values[3] >= values[1] ? "var(--market-up)" : "var(--market-down)";
	return (
		<svg
			width={width}
			height={height}
			viewBox={`0 0 ${width} ${height}`}
			className="absolute bottom-0 left-0"
			aria-hidden="true"
		>
			<clipPath id={gid}>
				<rect width={width} height={height} />
			</clipPath>
			<path d={`${line} L${width},${height} L0,${height} Z`} fill={fill} clipPath={`url(#${gid})`} />
			<path d={line} fill="none" stroke="var(--text-disabled)" strokeWidth={1.5} />
			<path d={round} fill="none" stroke={color} strokeWidth={2} strokeLinejoin="round" />
		</svg>
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
				"grid h-10 flex-none items-center gap-2 rounded-6 px-3 text-xs tabular-nums",
				you ? "bg-control-hover" : "bg-control",
				COLS,
			)}
		>
			<span className="font-semibold text-fg-secondary">{r.rank.toLocaleString()}</span>
			<RankMove value={move(r)} />
			<span className="flex min-w-0 items-center gap-2">
				<Identicon id={r.address} className="size-6 rounded-full" />
				<span className="truncate">{traderName(r)}</span>
				{you && <span className="rounded-full bg-fill px-2 py-0.5 text-2xs font-medium text-fg-inverse">You</span>}
			</span>
			<span className="text-right text-fg-secondary">{usd(r.accountValue)}</span>
			<span className={cn("text-right font-medium", pnlClass(r.pnl))}>{signedUsd(r.pnl)}</span>
			<span className={cn("text-right", pnlClass(r.roi))}>{pct(r.roi)}</span>
			<span className="text-right text-fg-secondary">{usdCompact(r.vlm)}</span>
			<span className="pl-4">
				<Spark values={path(r)} width={72} height={20} />
			</span>
			<span className={cn("text-right", pnlClass(r.dayPnl))}>{signedUsd(r.dayPnl, true)}</span>
		</div>
	);
}

const M_STEP = [150, 124, 104];

export function V3Mobile() {
	const [tierId, setTierId] = useState<TierId>(MY_TIER);
	const tier = tiers[tierId];
	const t = useTimeLeft();
	const top = tier.traders.slice(0, 3);
	return (
		<MobileShell>
			<style>{css}</style>
			<div className="flex h-full flex-col">
				<div className="min-h-0 flex-1 overflow-y-auto">
					<div className="px-4 pt-4">
						<div className="text-lg font-semibold">Tournament leaderboard</div>
						<div className="mt-1 text-xs text-fg-muted">Round 1. Top 3 split 80% of the pot.</div>
						<SegmentedControls value={tierId} onValueChange={(v) => setTierId(v as TierId)} fullWidth className="mt-3">
							{tierIds.map((id) => (
								<SegmentedControlItem key={id} value={id}>
									{tiers[id].short}
								</SegmentedControlItem>
							))}
						</SegmentedControls>
						<div className="mt-2 grid grid-cols-2 gap-2 tabular-nums">
							<div className="rounded-8 bg-surface px-3 py-2">
								<div className="text-xs text-fg-muted">Pot (example)</div>
								<div className="text-base font-semibold">{usd(tier.pot)}</div>
							</div>
							<div className="rounded-8 bg-surface px-3 py-2">
								<div className="text-xs text-fg-muted">Ends in</div>
								<div className="text-base font-semibold">
									{t.d}d {pad(t.h)}h {pad(t.m)}m {pad(t.s)}s
								</div>
							</div>
						</div>
					</div>
					<div key={tierId} className="t3v3-in px-4 pt-4">
						<div className="flex items-end gap-1.5">
							{ORDER.map((i) => {
								const r = top[i];
								return (
									<div key={r.address} className="flex min-w-0 flex-1 flex-col items-center">
										<Identicon id={r.address} className="size-8 rounded-full" />
										<div className="mt-1 max-w-full truncate text-xs">{traderName(r)}</div>
										<div
											className={cn(
												"relative mt-1.5 flex w-full flex-col items-center overflow-hidden rounded-8 pt-2",
												i === 0 ? "bg-control-hover" : "bg-surface",
											)}
											style={{ height: M_STEP[i] }}
										>
											<span className={cn("text-lg leading-none font-semibold", i ? "text-fg-muted" : "text-fg")}>
												{r.rank}
											</span>
											<span className={cn("mt-1 text-xs font-semibold tabular-nums", pnlClass(r.pnl))}>
												{signedUsd(r.pnl, true)}
											</span>
											<span className="text-2xs text-fg-muted tabular-nums">Wins {usd(prizeFor(tier, r.rank))}</span>
											<Carved values={path(r)} width={116} height={M_STEP[i] - 66} fill="var(--bg-base)" />
										</div>
									</div>
								);
							})}
						</div>
						<div className="mt-3 mb-3 flex flex-col gap-1">
							{tier.traders.slice(3, 20).map((r) => (
								<MobileRow key={r.address} r={r} />
							))}
						</div>
					</div>
				</div>
				<div className="flex-none bg-surface px-3 pt-2 pb-4">
					{tierId === MY_TIER ? (
						<MobileRow r={me} you />
					) : (
						<div className="rounded-6 bg-control px-3 py-3 text-xs text-fg-muted">
							You play at the {tiers[MY_TIER].label.toLowerCase()}.
						</div>
					)}
				</div>
			</div>
		</MobileShell>
	);
}

function MobileRow({ r, you }: RowProps) {
	return (
		<div
			className={cn(
				"flex h-12 flex-none items-center gap-2 rounded-6 px-3 text-xs tabular-nums",
				you ? "bg-control-hover" : "bg-surface",
			)}
		>
			<span className="w-9 font-semibold text-fg-secondary">{r.rank.toLocaleString()}</span>
			<Identicon id={r.address} className="size-6 rounded-full" />
			<span className="min-w-0 flex-1">
				<span className="flex items-center gap-1.5">
					<span className="truncate">{traderName(r)}</span>
					{you && <span className="rounded-full bg-fill px-1.5 text-2xs font-medium text-fg-inverse">You</span>}
				</span>
				<RankMove value={move(r)} zero="Same rank in 24h" className="text-2xs" />
			</span>
			<Spark values={path(r)} width={48} height={18} />
			<span className={cn("w-[80px] text-right font-medium", pnlClass(r.pnl))}>{signedUsd(r.pnl, true)}</span>
		</div>
	);
}
