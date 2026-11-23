import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/cn";
import { formatUSD } from "@/lib/format";
import { linePath, smoothPath } from "../copy-trader-3/spark";
import {
	axisUsd,
	hoverLabel,
	niceTicks,
	type Point,
	type RangeId,
	type SeriesId,
	seriesFor,
	signedUsd,
	timeLabel,
	usd,
} from "./data";

const UP = "var(--color-market-up)";
const DOWN = "var(--color-market-down)";
const X1 = "var(--color-x1-blue)";

function useWidth() {
	const ref = useRef<HTMLDivElement>(null);
	const [w, setW] = useState(0);
	useEffect(() => {
		const el = ref.current;
		if (!el) return;
		const o = new ResizeObserver(([e]) => setW(Math.floor(e.contentRect.width)));
		o.observe(el);
		return () => o.disconnect();
	}, []);
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
	series: SeriesId;
	range: RangeId;
	height: number;
	axis?: "right" | "left" | "none";
	xTicks?: boolean;
	dots?: boolean;
	endChip?: boolean;
	smooth?: boolean;
	strokeWidth?: number;
	gridCount?: number;
	className?: string;
}

export function PortfolioChart({
	series,
	range,
	height,
	axis = "right",
	xTicks = true,
	dots = false,
	endChip = false,
	smooth = true,
	strokeWidth = 1.75,
	gridCount = 4,
	className,
}: Props) {
	const points = seriesFor(series, range);
	const { ref, w } = useWidth();
	const [hover, setHover] = useState<number | null>(null);
	const withZero = series !== "value";
	const { min, max } = bounds(points, withZero);
	const { ticks, step } = niceTicks(min, max, gridCount);
	const t0 = points[0][0];
	const t1 = points[points.length - 1][0];
	const chipW = endChip ? 76 : 0;
	const plotW = Math.max(0, w - chipW);
	const padY = 8;
	const x = (t: number) => ((t - t0) / (t1 - t0 || 1)) * plotW;
	const y = (v: number) => padY + (1 - (v - min) / (max - min || 1)) * (height - padY * 2);
	const pts = points.map((p) => [x(p[0]), y(p[1])] as Point);
	const lastValue = points[points.length - 1][1];
	const tone = toneOf(series, lastValue);
	const end = pts[pts.length - 1];
	const fmt = series === "value" ? usd : (v: number) => signedUsd(v);
	const hit = hover === null ? null : { x: pts[hover][0], y: pts[hover][1], p: points[hover] };
	const labelLeft = hit ? hit.x > plotW - 140 : false;
	const xLabels = Array.from({ length: 5 }, (_, i) => t0 + ((t1 - t0) * i) / 4);
	const axisW = axis === "none" ? 0 : 56;

	function onMove(e: React.MouseEvent<HTMLDivElement>) {
		const r = e.currentTarget.getBoundingClientRect();
		const mx = e.clientX - r.left;
		let best = 0;
		for (let k = 1; k < pts.length; k++) if (Math.abs(pts[k][0] - mx) < Math.abs(pts[best][0] - mx)) best = k;
		setHover(best);
	}

	return (
		<div className={cn("flex min-w-0 flex-col gap-2", className)}>
			<div className="flex min-w-0" style={{ flexDirection: axis === "left" ? "row-reverse" : "row" }}>
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
									d={smooth ? smoothPath(pts) : linePath(pts)}
									fill="none"
									stroke={tone}
									strokeWidth={strokeWidth}
									strokeLinejoin="round"
									strokeLinecap="round"
								/>
								{dots && pts.map((p, i) => <circle key={points[i][0]} cx={p[0]} cy={p[1]} r={1.75} fill={tone} />)}
								{!dots && <circle cx={end[0]} cy={end[1]} r={3} fill={tone} />}
								{endChip && (
									<>
										<rect x={plotW + 8} y={end[1] - 10} width={chipW - 8} height={20} rx={4} fill="var(--color-fill)" />
										<text
											x={plotW + 8 + (chipW - 8) / 2}
											y={end[1] + 4}
											textAnchor="middle"
											className="fill-fg-inverse text-2xs font-medium tabular-nums"
										>
											{formatUSD(lastValue, {
												decimals: 0,
												compact: false,
												signDisplay: series === "value" ? "auto" : "exceptZero",
											})}
										</text>
									</>
								)}
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
				{axis !== "none" && (
					<div className="relative shrink-0" style={{ width: axisW, height }}>
						{ticks.map((v) => (
							<span
								key={v}
								className={cn(
									"absolute -translate-y-1/2 text-2xs text-fg-muted tabular-nums",
									axis === "right" ? "right-0" : "left-0",
								)}
								style={{ top: y(v) }}
							>
								{axisUsd(v, step)}
							</span>
						))}
					</div>
				)}
			</div>
			{xTicks && (
				<div
					className="flex justify-between text-2xs text-fg-muted tabular-nums"
					style={{
						paddingRight: axis === "right" ? axisW + chipW : chipW,
						paddingLeft: axis === "left" ? axisW : 0,
					}}
				>
					{xLabels.map((t) => (
						<span key={t}>{timeLabel(t, range)}</span>
					))}
				</div>
			)}
		</div>
	);
}
