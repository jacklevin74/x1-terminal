import { useEffect, useRef, useState } from "react";
import { type DirTrader, WINDOW_LABEL, type Window } from "./data";
import probe from "./months-probe.json";

export interface Period {
	label: string;
	pnl: number;
}

export interface MonthRow {
	m: string;
	y: number;
	pnl: number;
}

const WINDOWS: Window[] = ["d7", "d30", "all"];

const probeMonths = (probe as { traders: Record<string, MonthRow[]> }).traders;
const probeSeries = (probe as unknown as { series?: Record<string, [number, number][]> }).series ?? {};

const MONTH_INDEX: Record<string, number> = {
	Jan: 0,
	Feb: 1,
	Mar: 2,
	Apr: 3,
	May: 4,
	Jun: 5,
	Jul: 6,
	Aug: 7,
	Sep: 8,
	Oct: 9,
	Nov: 10,
	Dec: 11,
};

/** All saved months for a trader (probe first, then Jack's 4), oldest first. */
export function monthsOf(t: DirTrader): MonthRow[] | null {
	const long = probeMonths[t.id];
	if (long) return long;
	if (t.months?.length) return t.months.map((m) => ({ ...m, y: 2026 }));
	return null;
}

/** Cumulative PNL points [timestamp, pnl], rebased to 0. Weekly for the probe, month ends otherwise. */
export function seriesOf(t: DirTrader): [number, number][] | null {
	const long = probeSeries[t.id];
	if (long) return long;
	const months = monthsOf(t);
	if (!months) return null;
	const first = months[0];
	const start = Date.UTC(first.y, MONTH_INDEX[first.m] ?? 0, 1);
	let sum = 0;
	const out: [number, number][] = [[start, 0]];
	for (const m of months) {
		sum += m.pnl;
		out.push([Date.UTC(m.y, (MONTH_INDEX[m.m] ?? 0) + 1, 1), sum]);
	}
	return out;
}

export function periodsOf(t: DirTrader): { months: boolean; periods: Period[] } {
	const long = probeMonths[t.id];
	if (long) return { months: true, periods: long.slice(-12).map((m) => ({ label: m.m, pnl: m.pnl })) };
	if (t.months?.length) return { months: true, periods: t.months.map((m) => ({ label: m.m, pnl: m.pnl })) };
	const periods: Period[] = [];
	for (const w of WINDOWS) {
		const pnl = t.pnl[w];
		if (pnl !== null) periods.push({ label: WINDOW_LABEL[w], pnl });
	}
	return { months: false, periods };
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

export function linePath(pts: [number, number][]) {
	return pts.map((p, i) => `${i ? "L" : "M"}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(" ");
}

export function dateLabel(ts: number) {
	return new Date(ts).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
}

export function monthLabel(ts: number) {
	return new Date(ts).toLocaleDateString("en-US", { month: "short", timeZone: "UTC" });
}

export const WINDOWS_NOTE = "No monthly PNL for this trader. Showing the 7d, 30d and all-time windows.";

export function useWidth() {
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
