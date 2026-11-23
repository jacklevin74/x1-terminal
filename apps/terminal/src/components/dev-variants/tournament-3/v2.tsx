import { SegmentedControlItem, SegmentedControls } from "@hypeterminal/ui";
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
} from "../tournament-2/data";
import { MobileShell } from "../tournament-2/mobile-shell";
import { Identicon, RankMove, Spark } from "../tournament-2/parts";

const css = `
.t3v2-in{animation:t3v2-in .24s cubic-bezier(.2,.8,.2,1)}
@keyframes t3v2-in{from{opacity:0;transform:scale(.97)}}
`;

const COLS = "grid-cols-[52px_56px_1fr_132px_140px_96px_112px_112px_104px]";
const X_AT = [0, 23 / 30, 29 / 30, 1];
const LANE = [
	{ stroke: "var(--text-strong)", width: 2.5, dash: undefined, badge: "bg-fill text-fg-inverse" },
	{ stroke: "var(--text-secondary)", width: 2, dash: undefined, badge: "bg-control-hover text-fg" },
	{ stroke: "var(--text-weak)", width: 2, dash: "5 4", badge: "bg-control-hover text-fg-muted" },
];

function gapLine(tier: Tier, r: Trader) {
	const [a, b] = tier.traders;
	if (r.rank === 1) return `Leads 2nd by ${usdCompact(a.pnl - b.pnl)}`;
	return `${usdCompact(a.pnl - r.pnl)} behind 1st`;
}

export default function V2() {
	const [tierId, setTierId] = useState<TierId>(MY_TIER);
	const tier = tiers[tierId];
	const t = useTimeLeft();
	const top = tier.traders.slice(0, 3);
	return (
		<>
			<style>{css}</style>
			<div className="absolute rounded-xs bg-background px-2 py-1 text-sm text-fg" style={{ left: 662, top: 11 }}>
				Tournament
			</div>
			<div className="absolute inset-x-0 bottom-0 bg-background p-1" style={{ top: 48 }}>
				<div className="flex h-full flex-col rounded-8 bg-surface">
					<div className="flex flex-none items-center gap-4 px-6 pt-5">
						<div className="min-w-0">
							<div className="text-lg font-semibold">Tournament leaderboard</div>
							<div className="text-xs text-fg-muted">
								Round 1. Ranked by dollar PNL. The top 3 at each table split 80% of the pot.
							</div>
						</div>
						<div className="ml-auto flex items-center gap-2 text-xs tabular-nums">
							<SegmentedControls value={tierId} onValueChange={(v) => setTierId(v as TierId)} size="md">
								{tierIds.map((id) => (
									<SegmentedControlItem key={id} value={id}>
										{tiers[id].label} <span className="text-fg-muted">({tiers[id].short})</span>
									</SegmentedControlItem>
								))}
							</SegmentedControls>
							<div className="flex h-9 items-center gap-2 rounded-8 bg-control px-3">
								<span className="text-fg-muted">Pot (example)</span>
								<span className="text-sm font-semibold">{usd(tier.pot)}</span>
							</div>
							<div className="flex h-9 items-center gap-2 rounded-8 bg-control px-3">
								<span className="text-fg-muted">Ends in</span>
								<span className="text-sm font-semibold">
									{t.d}d {pad(t.h)}h {pad(t.m)}m {pad(t.s)}s
								</span>
							</div>
						</div>
					</div>
					<div key={tierId} className="t3v2-in flex min-h-0 flex-1 flex-col">
						<div className="grid flex-none grid-cols-[1fr_400px] gap-2 px-6 pt-4">
							<div className="rounded-8 bg-control p-4">
								<div className="flex items-center text-xs">
									<span className="text-sm font-medium">Race for the pot</span>
									<span className="ml-3 text-fg-muted">
										Cumulative PNL over 30 days. The round is the lighter band.
									</span>
								</div>
								<RaceChart traders={top} width={980} height={250} />
							</div>
							<div className="flex flex-col gap-2">
								{top.map((r, i) => (
									<Lane key={r.address} r={r} i={i} tier={tier} />
								))}
							</div>
						</div>
						<div className="flex flex-none items-center px-6 pt-4 pb-2 text-xs text-fg-muted tabular-nums">
							<span className="text-sm font-medium text-fg">Standings</span>
							<span className="ml-auto">
								{tier.count.toLocaleString()} traders. Arrows show rank change in the last 24h.
							</span>
						</div>
						<div className="mx-6 flex min-h-0 flex-1 flex-col overflow-hidden">
							<div className={cn("grid h-8 flex-none items-center gap-2 px-3 text-xs text-fg-muted", COLS)}>
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
									<Row r={me} you note={`${usdCompact(tier.traders[2].pnl - me.pnl)} to reach 3rd`} />
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

interface LaneProps {
	r: Trader;
	i: number;
	tier: Tier;
}

function Badge({ i, className }: { i: number; className?: string }) {
	return (
		<span
			className={cn(
				"grid size-7 flex-none place-items-center rounded-full text-sm font-semibold tabular-nums",
				LANE[i].badge,
				className,
			)}
		>
			{i + 1}
		</span>
	);
}

function Lane({ r, i, tier }: LaneProps) {
	return (
		<div className="flex h-[96px] items-center gap-3 rounded-8 bg-control px-4">
			<Badge i={i} />
			<div className="min-w-0 flex-1">
				<div className="flex items-center gap-2">
					<Identicon id={r.address} className="size-5 rounded-4" />
					<span className="truncate text-sm">{traderName(r)}</span>
				</div>
				<div className={cn("mt-1 text-lg font-semibold tabular-nums", pnlClass(r.pnl))}>{signedUsd(r.pnl)}</div>
				<div className="text-xs text-fg-muted tabular-nums">{gapLine(tier, r)}</div>
			</div>
			<div className="flex flex-none flex-col items-end gap-1 text-xs tabular-nums">
				<span>
					<span className="text-fg-muted">Wins </span>
					{usd(prizeFor(tier, r.rank))}
				</span>
				<span>
					<span className="text-fg-muted">Account </span>
					{usdCompact(r.accountValue)}
				</span>
				<span className={pnlClass(r.dayPnl)}>{signedUsd(r.dayPnl, true)} 24h</span>
			</div>
		</div>
	);
}

function spread(ys: number[], gap: number) {
	const order = ys.map((_, i) => i).sort((a, b) => ys[a] - ys[b]);
	const out = [...ys];
	for (let k = 1; k < order.length; k++) {
		const prev = out[order[k - 1]];
		if (out[order[k]] < prev + gap) out[order[k]] = prev + gap;
	}
	return out;
}

interface ChartProps {
	traders: Trader[];
	width: number;
	height: number;
	compact?: boolean;
}

function RaceChart({ traders, width, height, compact }: ChartProps) {
	const left = compact ? 0 : 56;
	const right = compact ? 30 : 36;
	const top = 14;
	const bottom = 22;
	const series = traders.map(path);
	const all = series.flat();
	const min = Math.min(0, ...all);
	const max = Math.max(...all);
	const span = max - min || 1;
	const w = width - left - right;
	const h = height - top - bottom;
	const x = (i: number) => left + X_AT[i] * w;
	const y = (v: number) => top + (1 - (v - min) / span) * h;
	const ticks = [0, 0.5, 1].map((f) => min + f * span);
	const r = compact ? 8 : 10;
	const tags = spread(
		series.map((v) => y(v[3])),
		r * 2 + 2,
	);
	return (
		<svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className="mt-2 block" aria-hidden="true">
			<rect x={x(1)} y={top} width={x(3) - x(1)} height={h} fill="var(--bg-band)" />
			{ticks.map((v) => (
				<g key={v}>
					<line x1={left} x2={width - right} y1={y(v)} y2={y(v)} stroke="var(--stroke-faint)" />
					{!compact && (
						<text x={0} y={y(v) + 4} className="fill-fg-muted text-2xs">
							{usdCompact(v)}
						</text>
					)}
				</g>
			))}
			{["30d ago", "Round start", "Now"].map((label, k) => {
				const i = [0, 1, 3][k];
				return (
					<text
						key={label}
						x={x(i)}
						y={height - 4}
						textAnchor={(["start", "middle", "end"] as const)[k]}
						className="fill-fg-muted text-2xs"
					>
						{label}
					</text>
				);
			})}
			{[...series].reverse().map((vals, ri) => {
				const i = series.length - 1 - ri;
				const d = vals.map((v, k) => `${k ? "L" : "M"}${x(k)},${y(v)}`).join(" ");
				return (
					<path
						key={traders[i].address}
						d={d}
						fill="none"
						stroke={LANE[i].stroke}
						strokeWidth={LANE[i].width}
						strokeDasharray={LANE[i].dash}
						strokeLinejoin="round"
					/>
				);
			})}
			{series.map((vals, i) => (
				<g key={traders[i].address}>
					<circle cx={x(3)} cy={y(vals[3])} r={3} fill={LANE[i].stroke} />
					<line x1={x(3)} x2={x(3) + 10} y1={y(vals[3])} y2={tags[i]} stroke={LANE[i].stroke} />
					<circle cx={x(3) + 10 + r} cy={tags[i]} r={r} fill={LANE[i].stroke} />
					<text
						x={x(3) + 10 + r}
						y={tags[i] + 4}
						textAnchor="middle"
						className="fill-fg-inverse text-2xs font-semibold"
					>
						{i + 1}
					</text>
				</g>
			))}
		</svg>
	);
}

interface RowProps {
	r: Trader;
	you?: boolean;
	note?: string;
}

function Row({ r, you, note }: RowProps) {
	return (
		<div
			className={cn(
				"grid h-11 items-center gap-2 border-b border-stroke-faint px-3 text-xs tabular-nums last:border-b-0",
				COLS,
			)}
		>
			<span className="grid h-6 w-9 place-items-center rounded-4 bg-control text-fg-secondary">
				{r.rank.toLocaleString()}
			</span>
			<RankMove value={move(r)} />
			<span className="flex min-w-0 items-center gap-2">
				<Identicon id={r.address} className="size-6 rounded-full" />
				<span className="truncate">{traderName(r)}</span>
				{you && <span className="rounded-full bg-fill px-2 py-0.5 text-2xs font-medium text-fg-inverse">You</span>}
				{note && <span className="text-fg-muted">{note}</span>}
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

export function V2Mobile() {
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
						<div className="mt-3 flex gap-2 text-xs tabular-nums">
							<div className="flex h-9 flex-1 items-center justify-between rounded-8 bg-surface px-3">
								<span className="text-fg-muted">Pot (example)</span>
								<span className="text-sm font-semibold">{usd(tier.pot)}</span>
							</div>
							<div className="flex h-9 flex-1 items-center justify-between rounded-8 bg-surface px-3">
								<span className="text-fg-muted">Ends in</span>
								<span className="text-sm font-semibold">
									{t.d}d {pad(t.h)}h {pad(t.m)}m
								</span>
							</div>
						</div>
						<SegmentedControls value={tierId} onValueChange={(v) => setTierId(v as TierId)} fullWidth className="mt-2">
							{tierIds.map((id) => (
								<SegmentedControlItem key={id} value={id}>
									{tiers[id].short}
								</SegmentedControlItem>
							))}
						</SegmentedControls>
					</div>
					<div key={tierId} className="t3v2-in px-4 pt-3">
						<div className="rounded-8 bg-surface p-3">
							<div className="text-sm font-medium">Race for the pot</div>
							<div className="text-xs text-fg-muted">Cumulative PNL over 30 days. The round is the lighter band.</div>
							<RaceChart traders={top} width={334} height={150} compact />
							<div className="mt-2 flex flex-col gap-1">
								{top.map((r, i) => (
									<div key={r.address} className="flex h-11 items-center gap-2 rounded-6 bg-control px-2">
										<Badge i={i} className="size-6 text-xs" />
										<Identicon id={r.address} className="size-5 rounded-4" />
										<span className="min-w-0 flex-1">
											<span className="block truncate text-xs">{traderName(r)}</span>
											<span className="block text-2xs text-fg-muted tabular-nums">{gapLine(tier, r)}</span>
										</span>
										<span className="text-right tabular-nums">
											<span className={cn("block text-xs font-semibold", pnlClass(r.pnl))}>
												{signedUsd(r.pnl, true)}
											</span>
											<span className="block text-2xs text-fg-muted">Wins {usd(prizeFor(tier, r.rank))}</span>
										</span>
									</div>
								))}
							</div>
						</div>
						<div className="mt-3 mb-1 flex items-center justify-between text-xs">
							<span className="text-sm font-medium">Standings</span>
							<span className="text-fg-muted tabular-nums">{tier.count.toLocaleString()} traders</span>
						</div>
						<div className="mb-3 rounded-8 bg-surface">
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
							<div className="px-3 pb-2 text-2xs text-fg-muted tabular-nums">
								{usdCompact(tier.traders[2].pnl - me.pnl)} to reach 3rd
							</div>
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

function MobileRow({ r, you }: RowProps) {
	return (
		<div className="flex h-12 items-center gap-2 border-b border-stroke-faint px-3 text-xs tabular-nums last:border-b-0">
			<span className="grid h-6 w-10 flex-none place-items-center rounded-4 bg-control text-fg-secondary">
				{r.rank.toLocaleString()}
			</span>
			<Identicon id={r.address} className="size-6 rounded-full" />
			<span className="min-w-0 flex-1">
				<span className="flex items-center gap-1.5">
					<span className="truncate">{traderName(r)}</span>
					{you && <span className="rounded-full bg-fill px-1.5 text-2xs font-medium text-fg-inverse">You</span>}
				</span>
				<RankMove value={move(r)} zero="Same rank in 24h" className="text-2xs" />
			</span>
			<Spark values={path(r)} width={48} height={18} />
			<span className={cn("w-[76px] text-right", pnlClass(r.pnl))}>{signedUsd(r.pnl, true)}</span>
		</div>
	);
}
