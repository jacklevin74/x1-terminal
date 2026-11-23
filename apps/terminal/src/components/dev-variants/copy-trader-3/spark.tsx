import { type ReactNode, useState } from "react";
import { cn } from "@/lib/cn";
import { type DirTrader, usd } from "../copy-trader-2/data";
import { ConsistencyHead, type MonthRow, monthsOf, periodsOf, seriesOf, useWidth, WINDOWS_NOTE } from "./shared";

export const UP = "var(--color-market-up)";
export const DOWN = "var(--color-market-down)";

export function smoothPath(pts: [number, number][]) {
	if (pts.length < 2) return "";
	let d = `M${pts[0][0].toFixed(1)},${pts[0][1].toFixed(1)}`;
	for (let i = 0; i < pts.length - 1; i++) {
		const p0 = pts[Math.max(0, i - 1)];
		const p1 = pts[i];
		const p2 = pts[i + 1];
		const p3 = pts[Math.min(pts.length - 1, i + 2)];
		const c1x = p1[0] + (p2[0] - p0[0]) / 6;
		const c1y = p1[1] + (p2[1] - p0[1]) / 6;
		const c2x = p2[0] - (p3[0] - p1[0]) / 6;
		const c2y = p2[1] - (p3[1] - p1[1]) / 6;
		d += ` C${c1x.toFixed(1)},${c1y.toFixed(1)} ${c2x.toFixed(1)},${c2y.toFixed(1)} ${p2[0].toFixed(1)},${p2[1].toFixed(1)}`;
	}
	return d;
}

export function linePath(pts: [number, number][]) {
	return pts.map((p, i) => `${i ? "L" : "M"}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(" ");
}

export function dateLabel(ts: number) {
	return new Date(ts).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
}

export function monthLabel(ts: number) {
	return new Date(ts).toLocaleDateString("en-US", { month: "short", timeZone: "UTC" });
}

interface ScaleProps {
	series: [number, number][];
	height: number;
	padTop?: number;
	padBottom?: number;
}

export function useScale({ series, height, padTop = 6, padBottom = 6 }: ScaleProps) {
	const { ref, w } = useWidth();
	const t0 = series[0][0];
	const t1 = series[series.length - 1][0];
	const vals = series.map((p) => p[1]);
	const min = Math.min(0, ...vals);
	const max = Math.max(0, ...vals);
	const span = max - min || 1;
	const x = (t: number) => ((t - t0) / (t1 - t0 || 1)) * w;
	const y = (v: number) => padTop + (1 - (v - min) / span) * (height - padTop - padBottom);
	const pts = series.map((p) => [x(p[0]), y(p[1])] as [number, number]);
	return { ref, w, x, y, pts, min, max, zero: y(0) };
}

interface HoverProps {
	series: [number, number][];
	pts: [number, number][];
	w: number;
	height: number;
	children: (i: number | null) => React.ReactNode;
}

/** Nearest-point hover. Renders children with the hovered index, plus a crosshair and a label. */
export function Hover({ series, pts, w, height, children }: HoverProps) {
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
			{children(i)}
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

export const X1 = "var(--color-x1-blue)";
export const CYAN = "var(--color-x1-cyan)";

export interface ChartCtx {
	series: [number, number][];
	months: MonthRow[];
	w: number;
	pts: [number, number][];
	x: (t: number) => number;
	y: (v: number) => number;
	zero: number;
	min: number;
	max: number;
	last: number;
	tone: string;
}

interface FrameProps {
	t: DirTrader;
	height: number;
	padTop?: number;
	padBottom?: number;
	head?: ReactNode;
	children: (c: ChartCtx) => ReactNode;
	after?: (c: ChartCtx) => ReactNode;
}

/** Shared chart frame: header, fallback for traders without a series, width measure, hover. */
export function Frame({ t, height, padTop, padBottom, head, children, after }: FrameProps) {
	const series = seriesOf(t);
	const months = monthsOf(t) ?? [];
	const scale = useScale({
		series: series ?? [
			[0, 0],
			[1, 0],
		],
		height,
		padTop,
		padBottom,
	});
	if (!series) {
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
	const last = series[series.length - 1][1];
	const ctx: ChartCtx = { series, months, ...scale, last, tone: last >= 0 ? UP : DOWN };
	return (
		<div className="flex flex-col gap-2">
			<ConsistencyHead t={t}>{head}</ConsistencyHead>
			<div ref={scale.ref} className="w-full">
				{scale.w > 0 && (
					<Hover series={series} pts={scale.pts} w={scale.w} height={height}>
						{() => (
							<svg width={scale.w} height={height} className="absolute inset-0 overflow-visible" aria-hidden="true">
								{children(ctx)}
							</svg>
						)}
					</Hover>
				)}
			</div>
			{scale.w > 0 && after?.(ctx)}
		</div>
	);
}

export function seriesDrawdown(series: [number, number][]) {
	let peak = -Infinity;
	let amount = 0;
	for (const p of series) {
		peak = Math.max(peak, p[1]);
		amount = Math.max(amount, peak - p[1]);
	}
	return { amount };
}

export function Stats({ c }: { c: ChartCtx }) {
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

export function MonthTicks({ c, every = 3 }: { c: ChartCtx; every?: number }) {
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
