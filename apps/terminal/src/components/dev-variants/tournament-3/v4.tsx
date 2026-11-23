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
.t3v4-in{animation:t3v4-in .24s cubic-bezier(.2,.8,.2,1)}
@keyframes t3v4-in{from{opacity:0;transform:scale(.97)}}
`;

const COLS = "grid-cols-[56px_52px_1fr_132px_140px_96px_112px_104px_104px]";
const X_AT = [0, 23 / 30, 29 / 30, 1];

export default function V4() {
	const [tierId, setTierId] = useState<TierId>(MY_TIER);
	const tier = tiers[tierId];
	const t = useTimeLeft();
	return (
		<>
			<style>{css}</style>
			<div className="absolute rounded-xs bg-background px-2 py-1 text-sm text-fg" style={{ left: 662, top: 11 }}>
				Tournament
			</div>
			<div className="absolute inset-x-0 bottom-0 flex flex-col gap-1 bg-background p-1" style={{ top: 48 }}>
				<div className="flex h-[52px] flex-none items-center gap-6 rounded-8 bg-surface px-3 text-xs tabular-nums">
					<SegmentedControls value={tierId} onValueChange={(v) => setTierId(v as TierId)} size="sm">
						{tierIds.map((id) => (
							<SegmentedControlItem key={id} value={id}>
								{tiers[id].label} ({tiers[id].short})
							</SegmentedControlItem>
						))}
					</SegmentedControls>
					<Stat label="Round 1" value={`Day ${Math.min(7, Math.floor(t.progress * 7) + 1)} of 7`} />
					<Stat label="Pot (example)" value={usd(tier.pot)} />
					<Stat label="Ends in" value={`${t.d}d ${pad(t.h)}h ${pad(t.m)}m ${pad(t.s)}s`} />
					<Stat label="Traders" value={tier.count.toLocaleString()} />
					<Stat label="Payout" value="Top 3 split 80%" />
					<span className="ml-auto text-fg-muted">Ranked by dollar PNL. Arrows show rank change in the last 24h.</span>
				</div>
				<div key={tierId} className="t3v4-in flex min-h-0 flex-1 flex-col gap-1">
					<div className="grid flex-none grid-cols-3 gap-1">
						{tier.traders.slice(0, 3).map((r) => (
							<TopPanel key={r.address} r={r} tier={tier} />
						))}
					</div>
					<div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-8 bg-surface">
						<div className="flex h-9 flex-none items-center gap-4 border-b border-stroke-weak px-3 text-xs">
							<span className="text-fg">Standings</span>
							<span className="text-fg-muted">Ranks 4 to {tier.traders.length}</span>
						</div>
						<div className={cn("grid h-7 flex-none items-center gap-2 bg-band px-3 text-xs text-fg-muted", COLS)}>
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
						<div className="flex-none border-t border-stroke-weak p-1">
							{tierId === MY_TIER ? (
								<div className="rounded-6 bg-control">
									<Row r={me} you />
								</div>
							) : (
								<div className="flex h-8 items-center rounded-6 bg-control px-3 text-xs text-fg-muted">
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

function Stat({ label, value }: { label: string; value: string }) {
	return (
		<div className="flex-none">
			<div className="text-fg-muted">{label}</div>
			<div className="text-fg">{value}</div>
		</div>
	);
}

function RankChip({ rank, className }: { rank: number; className?: string }) {
	return (
		<span
			className={cn(
				"grid h-5 min-w-8 place-items-center rounded-4 px-1 text-xs font-semibold tabular-nums",
				rank === 1 ? "bg-fill text-fg-inverse" : "bg-control-hover text-fg",
				className,
			)}
		>
			{ordinal[rank - 1]}
		</span>
	);
}

interface PanelProps {
	r: Trader;
	tier: Tier;
}

function TopPanel({ r, tier }: PanelProps) {
	return (
		<div className="flex h-[236px] flex-col rounded-8 bg-surface">
			<div className="flex h-9 flex-none items-center gap-2 border-b border-stroke-weak px-3 text-xs">
				<RankChip rank={r.rank} />
				<Identicon id={r.address} className="size-5 rounded-4" />
				<span className="truncate">{traderName(r)}</span>
				<span className="ml-auto text-fg-muted tabular-nums">
					Wins <span className="text-fg">{usd(prizeFor(tier, r.rank))}</span>
				</span>
			</div>
			<div className="flex min-h-0 flex-1 gap-3 p-3">
				<div className="flex w-[148px] flex-none flex-col gap-1.5 text-xs tabular-nums">
					<div>
						<div className="text-fg-muted">Round PNL</div>
						<div className={cn("text-base font-medium", pnlClass(r.pnl))}>{signedUsd(r.pnl)}</div>
					</div>
					<KV label="24h PNL" value={signedUsd(r.dayPnl, true)} tone={pnlClass(r.dayPnl)} />
					<KV label="ROI" value={pct(r.roi)} tone={pnlClass(r.roi)} />
					<KV label="Account" value={usdCompact(r.accountValue)} />
					<KV label="Volume" value={usdCompact(r.vlm)} />
				</div>
				<TagChart values={path(r)} width={300} height={176} />
			</div>
		</div>
	);
}

function KV({ label, value, tone }: { label: string; value: string; tone?: string }) {
	return (
		<div className="flex justify-between">
			<span className="text-fg-muted">{label}</span>
			<span className={tone ?? "text-fg-secondary"}>{value}</span>
		</div>
	);
}

interface ChartProps {
	values: number[];
	width: number;
	height: number;
	axis?: number;
}

function TagChart({ values, width, height, axis = 64 }: ChartProps) {
	const plot = width - axis;
	const bottom = 16;
	const min = Math.min(...values);
	const max = Math.max(...values);
	const span = max - min || 1;
	const y = (v: number) => 8 + (1 - (v - min) / span) * (height - 16 - bottom);
	const pts = values.map((v, i) => [X_AT[i] * plot, y(v)]);
	const line = pts.map((p, i) => `${i ? "L" : "M"}${p[0]},${p[1]}`).join(" ");
	const up = values[3] >= values[1];
	const color = up ? "var(--market-up)" : "var(--market-down)";
	const last = pts[3][1];
	const grid = [0, 0.25, 0.5, 0.75, 1].map((f) => 8 + f * (height - 16 - bottom));
	return (
		<svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className="flex-none" aria-hidden="true">
			{grid.map((g) => (
				<line key={g} x1={0} x2={plot} y1={g} y2={g} stroke="var(--stroke-faint)" strokeDasharray="2 3" />
			))}
			<line x1={pts[1][0]} x2={pts[1][0]} y1={0} y2={height - bottom} stroke="var(--stroke-weak)" />
			<text x={pts[1][0] + 4} y={height - 4} className="fill-fg-muted text-2xs">
				Round
			</text>
			<text x={0} y={height - 4} className="fill-fg-muted text-2xs">
				30d
			</text>
			<path d={line} fill="none" stroke={color} strokeWidth={1.5} strokeLinejoin="round" />
			<line x1={0} x2={plot} y1={last} y2={last} stroke={color} strokeDasharray="1 3" />
			<text x={plot + 6} y={y(max) + 4} className="fill-fg-muted text-2xs">
				{usdCompact(max)}
			</text>
			<text x={plot + 6} y={y(min) + 4} className="fill-fg-muted text-2xs">
				{usdCompact(min)}
			</text>
			<rect x={plot + 2} y={last - 8} width={axis - 2} height={16} rx={2} fill={color} />
			<text x={plot + 6} y={last + 4} className="fill-fg-inverse text-2xs font-semibold">
				{usdCompact(values[3])}
			</text>
		</svg>
	);
}

interface RowProps {
	r: Trader;
	you?: boolean;
}

function Row({ r, you }: RowProps) {
	return (
		<div className={cn("grid h-8 items-center gap-2 px-3 text-xs tabular-nums hover:bg-band", COLS)}>
			<span className="text-fg-secondary">{r.rank.toLocaleString()}</span>
			<RankMove value={move(r)} />
			<span className="flex min-w-0 items-center gap-2">
				<Identicon id={r.address} className="size-4 rounded-4" />
				<span className="truncate">{traderName(r)}</span>
				{you && <span className="rounded-4 bg-fill px-1.5 text-2xs font-medium text-fg-inverse">You</span>}
			</span>
			<span className="text-right text-fg-secondary">{usd(r.accountValue)}</span>
			<span className={cn("text-right", pnlClass(r.pnl))}>{signedUsd(r.pnl)}</span>
			<span className={cn("text-right", pnlClass(r.roi))}>{pct(r.roi)}</span>
			<span className="text-right text-fg-secondary">{usdCompact(r.vlm)}</span>
			<span className="pl-4">
				<Spark values={path(r)} width={64} height={16} />
			</span>
			<span className={cn("text-right", pnlClass(r.dayPnl))}>{signedUsd(r.dayPnl, true)}</span>
		</div>
	);
}

export function V4Mobile() {
	const [tierId, setTierId] = useState<TierId>(MY_TIER);
	const tier = tiers[tierId];
	const t = useTimeLeft();
	return (
		<MobileShell>
			<style>{css}</style>
			<div className="flex h-full flex-col gap-1 p-1">
				<div className="flex-none rounded-8 bg-surface p-3 text-xs tabular-nums">
					<div className="flex items-center justify-between">
						<span className="text-sm text-fg">Tournament</span>
						<SegmentedControls value={tierId} onValueChange={(v) => setTierId(v as TierId)} size="xs">
							{tierIds.map((id) => (
								<SegmentedControlItem key={id} value={id}>
									{tiers[id].short}
								</SegmentedControlItem>
							))}
						</SegmentedControls>
					</div>
					<div className="mt-2 grid grid-cols-3 gap-2">
						<Stat label="Pot (example)" value={usd(tier.pot)} />
						<Stat label="Ends in" value={`${t.d}d ${pad(t.h)}h ${pad(t.m)}m`} />
						<Stat label="Traders" value={tier.count.toLocaleString()} />
					</div>
					<div className="mt-2 text-fg-muted">Round 1. Ranked by dollar PNL. Top 3 split 80%.</div>
				</div>
				<div key={tierId} className="t3v4-in flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto">
					{tier.traders.slice(0, 3).map((r) => (
						<div key={r.address} className="flex-none rounded-8 bg-surface">
							<div className="flex h-9 items-center gap-2 border-b border-stroke-weak px-3 text-xs">
								<RankChip rank={r.rank} />
								<Identicon id={r.address} className="size-5 rounded-4" />
								<span className="truncate">{traderName(r)}</span>
								<span className="ml-auto text-fg-muted tabular-nums">
									Wins <span className="text-fg">{usd(prizeFor(tier, r.rank))}</span>
								</span>
							</div>
							<div className="flex gap-2 p-3 text-xs tabular-nums">
								<div className="flex w-[124px] flex-none flex-col gap-1">
									<div className={cn("text-base font-medium", pnlClass(r.pnl))}>{signedUsd(r.pnl, true)}</div>
									<KV label="24h" value={signedUsd(r.dayPnl, true)} tone={pnlClass(r.dayPnl)} />
									<KV label="Account" value={usdCompact(r.accountValue)} />
								</div>
								<TagChart values={path(r)} width={206} height={76} axis={58} />
							</div>
						</div>
					))}
					<div className="flex-none rounded-8 bg-surface">
						<div className="flex h-9 items-center gap-3 border-b border-stroke-weak px-3 text-xs">
							<span>Standings</span>
							<span className="text-fg-muted">Arrows show 24h rank change</span>
						</div>
						{tier.traders.slice(3, 20).map((r) => (
							<MobileRow key={r.address} r={r} />
						))}
					</div>
				</div>
				<div className="flex-none rounded-8 bg-surface p-1">
					{tierId === MY_TIER ? (
						<div className="rounded-6 bg-control">
							<MobileRow r={me} you />
						</div>
					) : (
						<div className="rounded-6 bg-control px-3 py-2.5 text-xs text-fg-muted">
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
		<div className="flex h-9 items-center gap-2 px-3 text-xs tabular-nums">
			<span className="w-8 text-fg-secondary">{r.rank.toLocaleString()}</span>
			<RankMove value={move(r)} className="w-9" />
			<Identicon id={r.address} className="size-4 rounded-4" />
			<span className="flex min-w-0 flex-1 items-center gap-1.5">
				<span className="truncate">{traderName(r)}</span>
				{you && <span className="rounded-4 bg-fill px-1 text-2xs font-medium text-fg-inverse">You</span>}
			</span>
			<Spark values={path(r)} width={40} height={14} />
			<span className={cn("w-[72px] text-right", pnlClass(r.pnl))}>{signedUsd(r.pnl, true)}</span>
		</div>
	);
}
