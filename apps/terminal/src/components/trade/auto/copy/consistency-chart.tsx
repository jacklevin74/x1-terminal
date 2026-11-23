import { type ReactNode, useState } from "react";
import { cn } from "@/lib/cn";
import {
	dateLabel,
	linePath,
	type MonthRow,
	monthLabel,
	monthsOf,
	periodsOf,
	seriesDrawdown,
	seriesOf,
	useScale,
	WINDOWS_NOTE,
} from "./consistency";
import { type DirTrader, usd } from "./data";

const UP = "var(--color-market-up)";
const DOWN = "var(--color-market-down)";
const HEIGHT = 112;
const PAD_TOP = 10;

interface ChartCtx {
	series: [number, number][];
	months: MonthRow[];
	w: number;
	pts: [number, number][];
	x: (t: number) => number;
	y: (v: number) => number;
	zero: number;
	last: number;
	tone: string;
}

export function ConsistencyChart({ t }: { t: DirTrader }) {
	const series = seriesOf(t);
	const months = monthsOf(t) ?? [];
	const scale = useScale({
		series: series ?? [
			[0, 0],
			[1, 0],
		],
		height: HEIGHT,
		padTop: PAD_TOP,
	});
	if (!series) return <WindowsFallback t={t} />;
	const last = series[series.length - 1][1];
	const c: ChartCtx = { series, months, ...scale, last, tone: last >= 0 ? UP : DOWN };
	return (
		<div className="flex flex-col gap-2">
			<ConsistencyHead t={t} />
			<div ref={scale.ref} className="w-full">
				{scale.w > 0 && (
					<Hover series={series} pts={scale.pts} w={scale.w} height={HEIGHT}>
						<svg width={scale.w} height={HEIGHT} className="absolute inset-0 overflow-visible" aria-hidden="true">
							<Line c={c} />
						</svg>
					</Hover>
				)}
			</div>
			{scale.w > 0 && (
				<>
					<MonthTicks c={c} />
					<Stats c={c} />
				</>
			)}
		</div>
	);
}

function Line({ c }: { c: ChartCtx }) {
	const end = c.pts[c.pts.length - 1];
	return (
		<>
			<line x1={0} x2={c.w} y1={c.zero} y2={c.zero} stroke="var(--color-control-hover)" />
			<path d={linePath(c.pts)} fill="none" stroke={c.tone} strokeWidth={1.25} strokeLinejoin="round" />
			{c.pts.map((p, i) => (
				<circle key={c.series[i][0]} cx={p[0]} cy={p[1]} r={1.6} fill={c.tone} />
			))}
			<rect x={Math.min(end[0] + 6, c.w - 64)} y={end[1] - 9} width={60} height={18} rx={4} fill="var(--color-fill)" />
			<text
				x={Math.min(end[0] + 36, c.w - 34)}
				y={end[1] + 4}
				textAnchor="middle"
				className="fill-fg-inverse text-2xs font-medium tabular-nums"
			>
				{usd(c.last, true)}
			</text>
		</>
	);
}

function ConsistencyHead({ t }: { t: DirTrader }) {
	return (
		<span className="flex items-baseline justify-between gap-3 text-xs">
			<span className="text-fg-muted">Consistency</span>
			<span className="tabular-nums">{t.consistency}</span>
		</span>
	);
}

function WindowsFallback({ t }: { t: DirTrader }) {
	const { periods } = periodsOf(t);
	return (
		<div className="flex flex-col gap-2">
			<ConsistencyHead t={t} />
			<div className="grid grid-cols-3 gap-2">
				{periods.map((p) => (
					<span key={p.label} className="flex flex-col gap-0.5 rounded-8 bg-control-hover px-3 py-2">
						<span className="text-2xs text-fg-muted">{p.label}</span>
						<span
							className={cn("text-xs font-medium tabular-nums", p.pnl >= 0 ? "text-market-up" : "text-market-down")}
						>
							{usd(p.pnl, true)}
						</span>
					</span>
				))}
			</div>
			<p className="text-2xs text-fg-muted">{WINDOWS_NOTE}</p>
		</div>
	);
}

interface HoverProps {
	series: [number, number][];
	pts: [number, number][];
	w: number;
	height: number;
	children: ReactNode;
}

function Hover({ series, pts, w, height, children }: HoverProps) {
	const [i, setI] = useState<number | null>(null);
	const hit = i === null ? null : { x: pts[i][0], y: pts[i][1], v: series[i][1], t: series[i][0] };
	const labelLeft = hit ? hit.x > w - 110 : false;
	return (
		<div
			role="img"
			aria-label="Cumulative PNL"
			className="relative"
			style={{ height }}
			onMouseMove={(e) => {
				const r = e.currentTarget.getBoundingClientRect();
				const mx = e.clientX - r.left;
				let best = 0;
				for (let k = 1; k < pts.length; k++) if (Math.abs(pts[k][0] - mx) < Math.abs(pts[best][0] - mx)) best = k;
				setI(best);
			}}
			onMouseLeave={() => setI(null)}
		>
			{children}
			{hit && (
				<>
					<span className="pointer-events-none absolute top-0 bottom-0 w-px bg-fg-disabled" style={{ left: hit.x }} />
					<span
						className="pointer-events-none absolute size-2 -translate-x-1/2 -translate-y-1/2 rounded-full ring-2 ring-surface"
						style={{ left: hit.x, top: hit.y, backgroundColor: hit.v >= 0 ? UP : DOWN }}
					/>
					<span
						className={cn(
							"pointer-events-none absolute top-0 flex flex-col rounded-6 bg-overlay px-2 py-1 text-2xs whitespace-nowrap shadow-menu",
							labelLeft ? "-translate-x-full" : "",
						)}
						style={{ left: labelLeft ? hit.x - 8 : hit.x + 8 }}
					>
						<span className="text-fg-muted">{dateLabel(hit.t)}</span>
						<span className={cn("font-medium tabular-nums", hit.v >= 0 ? "text-market-up" : "text-market-down")}>
							{usd(hit.v, true)}
						</span>
					</span>
				</>
			)}
		</div>
	);
}

function Stats({ c }: { c: ChartCtx }) {
	const green = c.months.filter((m) => m.pnl > 0).length;
	const dd = seriesDrawdown(c.series);
	return (
		<div className="grid grid-cols-3 gap-2 text-2xs">
			<span className="flex flex-col gap-0.5">
				<span className="text-fg-muted">Profitable months</span>
				<span className="text-xs font-medium tabular-nums">
					{green} of {c.months.length}
				</span>
			</span>
			<span className="flex flex-col gap-0.5">
				<span className="text-fg-muted">Max drawdown</span>
				<span className="text-xs font-medium text-market-down tabular-nums">
					{dd.amount ? usd(-dd.amount, true) : "None"}
				</span>
			</span>
			<span className="flex flex-col gap-0.5">
				<span className="text-fg-muted">Net {c.months.length} months</span>
				<span className={cn("text-xs font-medium tabular-nums", c.last >= 0 ? "text-market-up" : "text-market-down")}>
					{usd(c.last, true)}
				</span>
			</span>
		</div>
	);
}

function MonthTicks({ c, every = 3 }: { c: ChartCtx; every?: number }) {
	const seen = new Set<string>();
	const ticks: [number, number][] = [];
	for (const p of c.series) {
		const key = new Date(p[0]).toISOString().slice(0, 7);
		if (!seen.has(key)) {
			seen.add(key);
			ticks.push(p);
		}
	}
	return (
		<div className="relative h-4 text-2xs text-fg-muted">
			{ticks
				.filter((p, i) => i % every === 0 && c.x(p[0]) < c.w - 40)
				.map((p) => (
					<span key={p[0]} className="absolute" style={{ left: c.x(p[0]) }}>
						{monthLabel(p[0])}
					</span>
				))}
			<span className="absolute right-0">Now</span>
		</div>
	);
}
