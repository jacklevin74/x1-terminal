import { colorToHex, colorToRgba, getChartColors } from "./theme-colors";

export type LineKind = "position" | "liquidation" | "limit" | "tp" | "sl";
export type Tone = "up" | "down" | "warning";

export interface ChartLine {
	id: string;
	kind: LineKind;
	price: number;
	tone: Tone;
	priceText: string;
	sizeText: string;
	title: string;
	pnlText?: string;
	pnlTone?: Tone;
	expectedPnlText?: string;
	expectedPnlTone?: Tone;
	signedSizeText?: string;
	valueText?: string;
	closesLong?: boolean;
	oid?: number;
}

export interface ChartLinesInput {
	lines: ChartLine[];
	markPx: number | null;
	symbol: string;
	positionSide: "long" | "short" | null;
}

export interface FillBucket {
	id: string;
	time: number;
	side: "B" | "S";
	count: number;
	sizeText: string;
	avgPxText: string;
	anchor: number;
}

export function toneColor(tone: Tone): string {
	const c = getChartColors();
	if (tone === "up") return colorToHex(c.green);
	if (tone === "down") return colorToHex(c.red);
	return colorToHex(c.warning);
}

export function toneAlpha(tone: Tone, alpha: number): string {
	const c = getChartColors();
	if (tone === "up") return colorToRgba(c.green, alpha);
	if (tone === "down") return colorToRgba(c.red, alpha);
	return colorToRgba(c.warning, alpha);
}

export function palette() {
	const c = getChartColors();
	return {
		page: colorToHex(c.page),
		surface: colorToHex(c.background),
		overlay: colorToHex(c.overlay),
		control: colorToHex(c.control),
		fg: colorToHex(c.foreground),
		muted: colorToHex(c.textMuted),
		secondary: colorToHex(c.textSecondary),
		font: c.fontFamily,
	};
}

let measureCtx: CanvasRenderingContext2D | null = null;

export function textWidth(text: string, size: number, weight: number | string = 400): number {
	if (!measureCtx) measureCtx = document.createElement("canvas").getContext("2d");
	if (!measureCtx) return text.length * size * 0.6;
	measureCtx.font = `${weight} ${size}px ${palette().font || "sans-serif"}`;
	return measureCtx.measureText(text).width;
}

export function resolveCollisions<T extends { y: number }>(
	items: T[],
	height: number,
	top = 0,
	bottom = Infinity,
): (T & { ly: number })[] {
	const sorted = [...items].sort((a, b) => a.y - b.y);
	const out: (T & { ly: number })[] = [];
	for (const item of sorted) {
		const prev = out[out.length - 1];
		const ly = prev && item.y - prev.ly < height ? prev.ly + height : item.y;
		out.push({ ...item, ly });
	}
	const overflow = out.length ? out[out.length - 1].ly + height / 2 - bottom : 0;
	if (overflow > 0) {
		for (let i = out.length - 1; i >= 0; i--) {
			const next = out[i + 1];
			const ly = next ? Math.min(out[i].ly, next.ly - height) : out[i].ly - overflow;
			out[i] = { ...out[i], ly: Math.max(top + height / 2, ly) };
		}
	}
	return out;
}

export function rectFig(
	x: number,
	y: number,
	width: number,
	height: number,
	fill: string,
	border?: string,
	radius = 2,
) {
	return {
		type: "rect",
		attrs: { x, y, width, height },
		styles: {
			style: border ? "stroke_fill" : "fill",
			color: fill,
			borderColor: border ?? fill,
			borderSize: border ? 1 : 0,
			borderRadius: radius,
		},
		ignoreEvent: true,
	};
}

export function textFig(
	x: number,
	y: number,
	text: string,
	color: string,
	opts: { size?: number; weight?: number; align?: CanvasTextAlign } = {},
) {
	return {
		type: "text",
		attrs: { x, y, text, align: opts.align ?? "left", baseline: "middle" },
		styles: {
			color,
			size: opts.size ?? 11,
			weight: opts.weight ?? 500,
			family: palette().font,
			style: "fill",
			backgroundColor: "transparent",
			borderSize: 0,
			paddingLeft: 0,
			paddingRight: 0,
			paddingTop: 0,
			paddingBottom: 0,
		},
		ignoreEvent: true,
	};
}

export function lineFig(x1: number, y1: number, x2: number, y2: number, color: string, dashed: boolean) {
	return {
		type: "line",
		attrs: {
			coordinates: [
				{ x: x1, y: y1 },
				{ x: x2, y: y2 },
			],
		},
		styles: { style: dashed ? "dashed" : "solid", color, size: 1, dashedValue: [4, 4] },
		ignoreEvent: true,
	};
}

export function polygonFig(points: { x: number; y: number }[], color: string) {
	return { type: "polygon", attrs: { coordinates: points }, styles: { style: "fill", color }, ignoreEvent: true };
}

export function avoidMark<T extends { y: number }>(items: T[], markY: number | null, height: number): T[] {
	if (markY == null) return items;
	return items.map((item) => {
		if (Math.abs(item.y - markY) >= height) return item;
		return { ...item, y: item.y < markY ? markY - height : markY + height };
	});
}

export function layoutAroundMark<T extends { y: number }>(
	items: T[],
	markY: number | null,
	height: number,
	bottom: number,
): (T & { ly: number })[] {
	const visible = items.filter((i) => i.y >= 0 && i.y <= bottom);
	if (markY == null) return resolveCollisions(visible, height, 0, bottom);
	const above = visible.filter((i) => i.y <= markY).sort((a, b) => b.y - a.y);
	const below = visible.filter((i) => i.y > markY).sort((a, b) => a.y - b.y);
	const out: (T & { ly: number })[] = [];
	let limit = markY - height;
	for (const item of above) {
		const ly = Math.min(item.y, limit);
		out.push({ ...item, ly });
		limit = ly - height;
	}
	limit = markY + height;
	for (const item of below) {
		const ly = Math.max(item.y, limit);
		out.push({ ...item, ly });
		limit = ly + height;
	}
	return out;
}
