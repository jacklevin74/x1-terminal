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
} from "../tournament-2/data";
import { MobileShell } from "../tournament-2/mobile-shell";
import { Identicon, RankMove, Spark } from "../tournament-2/parts";

const css = `
.t3v1-in{animation:t3v1-in .24s cubic-bezier(.2,.8,.2,1)}
@keyframes t3v1-in{from{opacity:0;transform:scale(.97)}}
`;

const COLS = "grid-cols-[56px_56px_1fr_132px_150px_96px_112px_112px_104px]";
const X_AT = [0, 23 / 30, 29 / 30, 1];
const X_LABELS = ["30d ago", "Round start", "1d ago", "Now"];
const LABELLED = [0, 1, 3];
const ANCHOR = ["start", "middle", "end", "end"] as const;

const numeral = (rank: number) => String(rank).padStart(2, "0");

export default function V1() {
	const [tierId, setTierId] = useState<TierId>(MY_TIER);
	const tier = tiers[tierId];
	const t = useTimeLeft();
	const dates = roundDates(t.ms);
	const [first, second, third] = tier.traders;
	return (
		<>
			<style>{css}</style>
			<div className="absolute rounded-xs bg-background px-2 py-1 text-sm text-fg" style={{ left: 662, top: 11 }}>
				Tournament
			</div>
			<div className="absolute inset-x-0 bottom-0 bg-background p-1" style={{ top: 48 }}>
				<div className="flex h-full flex-col rounded-8 bg-surface">
					<div className="flex flex-none items-end justify-between px-8 pt-6">
						<div>
							<div className="flex gap-4 text-2xs tracking-micro text-fg-muted uppercase">
								<span>Round 1</span>
								<span>{tier.label}</span>
								<span>
									{dates.start} to {dates.end}
								</span>
							</div>
							<div className="mt-1 text-xl font-semibold">Tournament leaderboard</div>
							<div className="mt-1 text-sm text-fg-muted">
								Ranked by dollar PNL. The top 3 at each table split 80% of the pot.
							</div>
						</div>
						<div className="flex items-end gap-10">
							<div>
								<div className="text-2xs tracking-micro text-fg-muted uppercase">Pot (example)</div>
								<div className="text-xl font-semibold tabular-nums">{usd(tier.pot)}</div>
							</div>
							<div>
								<div className="text-2xs tracking-micro text-fg-muted uppercase">Ends in</div>
								<div className="flex items-baseline gap-2 tabular-nums">
									<Unit n={t.d} u="d" />
									<Unit n={pad(t.h)} u="h" />
									<Unit n={pad(t.m)} u="m" />
									<Unit n={pad(t.s)} u="s" />
								</div>
							</div>
						</div>
					</div>
					<div className="flex flex-none items-center px-8 pt-5">
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
					<div key={tierId} className="t3v1-in flex min-h-0 flex-1 flex-col">
						<div className="grid flex-none grid-cols-[1.3fr_1fr] gap-2 px-8 pt-4">
							<LeadCard r={first} tier={tier} />
							<div className="flex flex-col gap-2">
								<SideCard r={second} tier={tier} />
								<SideCard r={third} tier={tier} />
							</div>
						</div>
						<div className="mx-8 mt-5 flex min-h-0 flex-1 flex-col">
							<div
								className={cn(
									"grid h-7 flex-none items-center gap-2 px-3 text-2xs tracking-micro text-fg-muted uppercase",
									COLS,
								)}
							>
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
						<div className="flex-none px-6 pt-2 pb-3">
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

function Unit({ n, u }: { n: number | string; u: string }) {
	return (
		<span>
			<span className="text-xl font-semibold">{n}</span>
			<span className="ml-0.5 text-sm text-fg-muted">{u}</span>
		</span>
	);
}

interface CardProps {
	r: Trader;
	tier: Tier;
}

function Who({ r }: { r: Trader }) {
	return (
		<div className="flex min-w-0 items-center gap-2">
			<Identicon id={r.address} className="size-6 rounded-4" />
			<span className="truncate text-sm">{traderName(r)}</span>
			<span className={cn("text-xs tabular-nums", pnlClass(r.dayPnl))}>{signedUsd(r.dayPnl, true)} 24h</span>
		</div>
	);
}

function LeadCard({ r, tier }: CardProps) {
	return (
		<div className="flex h-[252px] gap-6 rounded-8 bg-control p-5">
			<div className="flex w-[300px] flex-none flex-col">
				<div className="flex items-start gap-3">
					<span className="text-3xl leading-none font-semibold text-fg tabular-nums">{numeral(r.rank)}</span>
					<span className="mt-1 rounded-full bg-fill px-2 py-0.5 text-2xs font-semibold tracking-micro text-fg-inverse uppercase">
						1st place
					</span>
				</div>
				<div className="mt-4">
					<Who r={r} />
				</div>
				<div className="mt-auto">
					<div className="text-2xs tracking-micro text-fg-muted uppercase">Round PNL</div>
					<div className={cn("text-2xl font-semibold tabular-nums", pnlClass(r.pnl))}>{signedUsd(r.pnl)}</div>
					<div className="mt-1 flex gap-5 text-xs tabular-nums">
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
			<div className="min-w-0 flex-1">
				<LineChart values={path(r)} width={480} height={212} labels />
			</div>
		</div>
	);
}

function SideCard({ r, tier }: CardProps) {
	return (
		<div className="flex h-[122px] gap-4 rounded-8 bg-control p-4">
			<span className="text-xl leading-none font-semibold text-fg-muted tabular-nums">{numeral(r.rank)}</span>
			<div className="flex min-w-0 flex-1 flex-col">
				<Who r={r} />
				<div className="mt-auto">
					<div className={cn("text-lg font-semibold tabular-nums", pnlClass(r.pnl))}>{signedUsd(r.pnl)}</div>
					<div className="flex gap-4 text-xs tabular-nums">
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
			<LineChart values={path(r)} width={200} height={90} />
		</div>
	);
}

interface ChartProps {
	values: number[];
	width: number;
	height: number;
	labels?: boolean;
}

function LineChart({ values, width, height, labels }: ChartProps) {
	const bottom = labels ? 22 : 4;
	const min = Math.min(...values);
	const max = Math.max(...values);
	const span = max - min || 1;
	const pts = values.map((v, i) => [X_AT[i] * width, 8 + (1 - (v - min) / span) * (height - 8 - bottom)]);
	const before = `M${pts[0][0]},${pts[0][1]} L${pts[1][0]},${pts[1][1]}`;
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
			className="overflow-visible"
			aria-hidden="true"
		>
			<rect x={pts[1][0]} y={0} width={width - pts[1][0]} height={height - bottom} fill="var(--bg-band)" />
			<path d={before} fill="none" stroke="var(--text-disabled)" strokeWidth={1.5} strokeDasharray="3 4" />
			<path d={round} fill="none" stroke={color} strokeWidth={2} strokeLinejoin="round" />
			{pts.map((p, i) => (
				<circle
					key={X_LABELS[i]}
					cx={p[0]}
					cy={p[1]}
					r={i === 3 ? 4 : 2.5}
					fill={i === 0 ? "var(--text-weak)" : color}
				/>
			))}
			{labels &&
				LABELLED.map((i) => (
					<text
						key={X_LABELS[i]}
						x={pts[i][0]}
						y={height - 4}
						textAnchor={ANCHOR[i]}
						className="fill-fg-muted text-2xs"
					>
						{X_LABELS[i]}
					</text>
				))}
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
				"grid h-10 items-center gap-2 rounded-6 px-3 text-xs tabular-nums transition-colors hover:bg-band",
				COLS,
			)}
		>
			<span className="text-sm font-semibold text-fg-muted">{numeral(r.rank)}</span>
			<RankMove value={move(r)} />
			<span className="flex min-w-0 items-center gap-2">
				<Identicon id={r.address} className="size-6 rounded-4" />
				<span className="truncate text-sm">{traderName(r)}</span>
				{you && <span className="rounded-full bg-fill px-2 py-0.5 text-2xs font-medium text-fg-inverse">You</span>}
			</span>
			<span className="text-right text-fg-secondary">{usd(r.accountValue)}</span>
			<span className={cn("text-right text-sm font-semibold", pnlClass(r.pnl))}>{signedUsd(r.pnl)}</span>
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
	const [first, ...rest] = tier.traders.slice(0, 3);
	return (
		<MobileShell>
			<style>{css}</style>
			<div className="flex h-full flex-col">
				<div className="min-h-0 flex-1 overflow-y-auto">
					<div className="px-4 pt-4">
						<div className="flex gap-3 text-2xs tracking-micro text-fg-muted uppercase">
							<span>Round 1</span>
							<span>{tier.label}</span>
						</div>
						<div className="mt-1 text-lg font-semibold">Tournament leaderboard</div>
						<div className="mt-1 text-xs text-fg-muted">Ranked by dollar PNL. Top 3 split 80% of the pot.</div>
						<div className="mt-4 flex items-end justify-between tabular-nums">
							<div>
								<div className="text-2xs tracking-micro text-fg-muted uppercase">Pot (example)</div>
								<div className="text-lg font-semibold">{usd(tier.pot)}</div>
							</div>
							<div className="text-right">
								<div className="text-2xs tracking-micro text-fg-muted uppercase">Ends in</div>
								<div className="text-lg font-semibold">
									{t.d}d {pad(t.h)}h {pad(t.m)}m {pad(t.s)}s
								</div>
							</div>
						</div>
						<SegmentedControls value={tierId} onValueChange={(v) => setTierId(v as TierId)} fullWidth className="mt-4">
							{tierIds.map((id) => (
								<SegmentedControlItem key={id} value={id}>
									{tiers[id].short}
								</SegmentedControlItem>
							))}
						</SegmentedControls>
						<div className="mt-2 text-xs text-fg-muted tabular-nums">
							{tier.count.toLocaleString()} traders. Arrows show rank change in 24h.
						</div>
					</div>
					<div key={tierId} className="t3v1-in px-4 pt-3">
						<div className="rounded-8 bg-surface p-4">
							<div className="flex items-start justify-between">
								<span className="text-xl leading-none font-semibold tabular-nums">{numeral(first.rank)}</span>
								<span className="rounded-full bg-fill px-2 py-0.5 text-2xs font-semibold tracking-micro text-fg-inverse uppercase">
									1st place
								</span>
							</div>
							<div className="mt-3">
								<Who r={first} />
							</div>
							<div className={cn("mt-2 text-xl font-semibold tabular-nums", pnlClass(first.pnl))}>
								{signedUsd(first.pnl)}
							</div>
							<div className="text-xs text-fg-muted tabular-nums">
								Account {usdCompact(first.accountValue)}. Wins {usd(prizeFor(tier, 1))}.
							</div>
							<div className="mt-3">
								<LineChart values={path(first)} width={326} height={110} labels />
							</div>
						</div>
						<div className="mt-2 grid grid-cols-2 gap-2">
							{rest.map((r) => (
								<div key={r.address} className="rounded-8 bg-surface p-3">
									<div className="flex items-center justify-between">
										<span className="text-lg leading-none font-semibold text-fg-muted tabular-nums">
											{numeral(r.rank)}
										</span>
										<Identicon id={r.address} className="size-6 rounded-4" />
									</div>
									<div className="mt-2 truncate text-xs">{traderName(r)}</div>
									<div className={cn("text-base font-semibold tabular-nums", pnlClass(r.pnl))}>
										{signedUsd(r.pnl, true)}
									</div>
									<div className="text-xs text-fg-muted tabular-nums">Wins {usd(prizeFor(tier, r.rank))}</div>
									<div className="mt-2">
										<LineChart values={path(r)} width={147} height={44} />
									</div>
								</div>
							))}
						</div>
						<div className="mt-4 mb-3">
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

function MobileRow({ r, you }: RowProps) {
	return (
		<div className="flex h-12 items-center gap-2 px-3 text-xs tabular-nums">
			<span className="w-9 text-sm font-semibold text-fg-muted">{numeral(r.rank)}</span>
			<Identicon id={r.address} className="size-6 rounded-4" />
			<span className="min-w-0 flex-1">
				<span className="flex items-center gap-1.5">
					<span className="truncate">{traderName(r)}</span>
					{you && <span className="rounded-full bg-fill px-1.5 text-2xs font-medium text-fg-inverse">You</span>}
				</span>
				<RankMove value={move(r)} zero="Same rank in 24h" className="text-2xs" />
			</span>
			<Spark values={path(r)} width={48} height={18} />
			<span className={cn("w-[84px] text-right font-semibold", pnlClass(r.pnl))}>{signedUsd(r.pnl, true)}</span>
		</div>
	);
}
