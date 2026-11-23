import { useEffect, useState } from "react";
import { cn } from "@/lib/cn";
import { axisUsd, hoverLabel, niceTicks, signedUsd, timeLabel, usd } from "@/lib/portfolio/format";
import type { Point, RangeId, SeriesId } from "@/lib/portfolio/model";
import { stepPath } from "@/lib/portfolio/path";

const UP = "var(--color-market-up)";
const DOWN = "var(--color-market-down)";
const X1 = "var(--color-fg)";
const AXIS_W = 56;
const PAD_Y = 8;

function useWidth() {
	const [el, ref] = useState<HTMLDivElement | null>(null);
	const [w, setW] = useState(0);
	useEffect(() => {
		if (!el) return;
		const o = new ResizeObserver(([e]) => setW(Math.floor(e.contentRect.width)));
		o.observe(el);
		return () => o.disconnect();
	}, [el]);
	return { ref, w };
}

function bounds(points: Point[], withZero: boolean) {
	const vals = points.map((p) => p[1]);
	let min = Math.min(...vals);
	let max = Math.max(...vals);
	if (withZero) {
		min = Math.min(0, min);
		max = Math.max(0, max);
	}
	const pad = (max - min || Math.abs(max) || 1) * 0.08;
	return { min: withZero && min === 0 ? 0 : min - pad, max: max + pad };
}

function toneOf(series: SeriesId, lastValue: number) {
	if (series === "value") return X1;
	return lastValue >= 0 ? UP : DOWN;
}

interface Props {
	points: Point[];
	series: SeriesId;
	range: RangeId;
	height: number;
	loading?: boolean;
}

export function PortfolioChart({ points, series, range, height, loading }: Props) {
	const { ref, w } = useWidth();
	const [hover, setHover] = useState<number | null>(null);

	if (points.length < 2) {
		return (
			<div className="flex min-w-0 flex-col gap-2">
				<div
					className={cn(
						"flex items-center justify-center rounded-6 text-xs text-fg-muted",
						loading && "animate-pulse bg-control motion-reduce:animate-none",
					)}
					style={{ height: height + 24 }}
				>
					{loading ? null : "No history for this range."}
				</div>
			</div>
		);
	}

	const withZero = series !== "value";
	const { min, max } = bounds(points, withZero);
	const { ticks, step } = niceTicks(min, max, 4);
	const t0 = points[0][0];
	const t1 = points[points.length - 1][0];
	const plotW = Math.max(0, w);
	const x = (t: number) => ((t - t0) / (t1 - t0 || 1)) * plotW;
	const y = (v: number) => PAD_Y + (1 - (v - min) / (max - min || 1)) * (height - PAD_Y * 2);
	const pts = points.map((p) => [x(p[0]), y(p[1])] as Point);
	const lastValue = points[points.length - 1][1];
	const tone = toneOf(series, lastValue);
	const end = pts[pts.length - 1];
	const fmt = series === "value" ? usd : (v: number) => signedUsd(v);
	const index = hover !== null && hover < pts.length ? hover : null;
	const hit = index === null ? null : { x: pts[index][0], y: pts[index][1], p: points[index] };
	const labelLeft = hit ? hit.x > plotW - 140 : false;
	const xLabels = Array.from({ length: 5 }, (_, i) => t0 + ((t1 - t0) * i) / 4);

	function onMove(e: React.MouseEvent<HTMLDivElement>) {
		const r = e.currentTarget.getBoundingClientRect();
		const mx = e.clientX - r.left;
		let best = 0;
		for (let k = 1; k < pts.length; k++) if (Math.abs(pts[k][0] - mx) < Math.abs(pts[best][0] - mx)) best = k;
		setHover(best);
	}

	return (
		<div className="flex min-w-0 flex-col gap-2">
			<div className="flex min-w-0">
				<div ref={ref} className="min-w-0 flex-1">
					{w > 0 && (
						<div
							role="img"
							aria-label="Portfolio chart"
							className="relative"
							style={{ height }}
							onMouseMove={onMove}
							onMouseLeave={() => setHover(null)}
						>
							<svg width={w} height={height} className="absolute inset-0 overflow-visible" aria-hidden="true">
								{ticks.map((v) => (
									<line
										key={v}
										x1={0}
										x2={plotW}
										y1={y(v)}
										y2={y(v)}
										stroke={v === 0 && withZero ? "var(--color-fg-disabled)" : "var(--color-control)"}
										strokeDasharray={v === 0 && withZero ? "3 3" : undefined}
									/>
								))}
								<path
									key={`${series}-${range}-${points.length}`}
									d={stepPath(pts)}
									pathLength={1}
									strokeDasharray={1}
									fill="none"
									stroke={tone}
									strokeWidth={1.5}
									strokeLinejoin="miter"
									strokeLinecap="butt"
									className="motion-safe:animate-draw-line"
								/>
								<circle
									key={`dot-${series}-${range}-${points.length}`}
									cx={end[0]}
									cy={end[1]}
									r={3}
									fill={tone}
									className="motion-safe:animate-fade-in-late"
								/>
							</svg>
							{hit && (
								<>
									<span
										className="pointer-events-none absolute top-0 bottom-0 w-px bg-fg-disabled"
										style={{ left: hit.x }}
									/>
									<span
										className="pointer-events-none absolute size-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full ring-2 ring-surface"
										style={{ left: hit.x, top: hit.y, backgroundColor: tone }}
									/>
									<span
										className={cn(
											"pointer-events-none absolute top-0 flex flex-col rounded-6 bg-overlay px-2 py-1 text-2xs whitespace-nowrap shadow-menu",
											labelLeft && "-translate-x-full",
										)}
										style={{ left: labelLeft ? hit.x - 10 : hit.x + 10 }}
									>
										<span className="text-fg-muted">{hoverLabel(hit.p[0])}</span>
										<span
											className={cn(
												"text-xs font-medium tabular-nums",
												series === "value" && "text-fg",
												series !== "value" && (hit.p[1] >= 0 ? "text-market-up" : "text-market-down"),
											)}
										>
											{fmt(hit.p[1])}
										</span>
									</span>
								</>
							)}
						</div>
					)}
				</div>
				<div className="relative shrink-0" style={{ width: AXIS_W, height }}>
					{ticks.map((v) => (
						<span
							key={v}
							className="absolute right-0 -translate-y-1/2 text-2xs text-fg-muted tabular-nums"
							style={{ top: y(v) }}
						>
							{axisUsd(v, step)}
						</span>
					))}
				</div>
			</div>
			<div className="flex justify-between text-2xs text-fg-muted tabular-nums" style={{ paddingRight: AXIS_W }}>
				{xLabels.map((t) => (
					<span key={t}>{timeLabel(t, range)}</span>
				))}
			</div>
		</div>
	);
}
