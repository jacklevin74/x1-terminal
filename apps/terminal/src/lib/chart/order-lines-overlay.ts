import { registerOverlay } from "klinecharts";
import {
	type ChartLine,
	type ChartLinesInput,
	layoutAroundMark,
	lineFig,
	palette,
	rectFig,
	textFig,
	textWidth,
	toneColor,
} from "./chart-lines";

export const ORDER_LINES_OVERLAY = "orderLines";
const H = 20;
const AXIS_TAG_H = 20;
const AXIS_FONT = 12;
const AXIS_PAD = 4;

export function axisTagWidth(priceText: string): number {
	return Math.ceil(textWidth(priceText, AXIS_FONT, 400) + AXIS_PAD * 2);
}
const FONT = 11;
const LEFT = 8;
export const CANCEL_KEY = "cancel:";
export const DRAG_KEY = "drag:";
const HANDLE_W = 16;

export interface OrderLinesData extends ChartLinesInput {
	drag?: { oid: number; price: number; priceText: string } | null;
	hover?: string | null;
}

export interface OrderLineHitBox {
	key: string;
	x: number;
	y: number;
	w: number;
	h: number;
}

let hitBoxes: OrderLineHitBox[] = [];

export function getOrderLineHitBoxes(): OrderLineHitBox[] {
	return hitBoxes;
}

function withDrag(input: OrderLinesData): ChartLine[] {
	const drag = input.drag;
	if (!drag) return input.lines;
	return input.lines.map((line) =>
		line.oid === drag.oid ? { ...line, price: drag.price, priceText: drag.priceText } : line,
	);
}

function mixHex(a: string, b: string, t: number): string {
	const pa = Number.parseInt(a.slice(1, 7), 16);
	const pb = Number.parseInt(b.slice(1, 7), 16);
	const ch = (shift: number) => Math.round(((pa >> shift) & 255) * (1 - t) + ((pb >> shift) & 255) * t);
	return `#${((ch(16) << 16) | (ch(8) << 8) | ch(0)).toString(16).padStart(6, "0")}`;
}

function mainText(line: ChartLine): string {
	if (line.kind === "position") return `PNL ${line.pnlText ?? ""}`.trim();
	if (line.kind === "liquidation") return `Liq. ${line.priceText}`;
	if (line.kind === "tp") return `TP ${line.priceText}`;
	if (line.kind === "sl") return `SL ${line.priceText}`;
	return `Limit ${line.priceText}`;
}

let registered = false;

export function registerOrderLinesOverlay() {
	if (registered) return;
	registered = true;
	registerOverlay({
		name: ORDER_LINES_OVERLAY,
		totalStep: 1,
		lock: true,
		zLevel: 2,
		needDefaultPointFigure: false,
		needDefaultXAxisFigure: false,
		needDefaultYAxisFigure: false,
		createPointFigures: ({ overlay, bounding, yAxis }) => {
			const input = overlay.extendData as OrderLinesData;
			if (!yAxis) return [];
			const p = palette();
			const figures: unknown[] = [];
			const boxes: OrderLineHitBox[] = [];
			const items = withDrag(input)
				.map((line) => ({ line, y: yAxis.convertToPixel(line.price) }))
				.filter((i) => i.y >= 0 && i.y <= bounding.height);
			for (const { line, y } of items) {
				const tone = toneColor(line.tone);
				figures.push({
					type: "line",
					attrs: {
						coordinates: [
							{ x: 0, y },
							{ x: bounding.width, y },
						],
					},
					styles: { style: "dashed", color: tone, size: 1, dashedValue: [2, 3] },
					ignoreEvent: true,
				});
			}
			const placed: { y: number; x: number; w: number }[] = [];
			for (const { line, y } of [...items].sort((a, b) => a.y - b.y)) {
				const tone = toneColor(line.tone);
				const fill = tone;
				const text = mainText(line);
				const textW = textWidth(text, FONT, 500) + 16;
				const qty = line.kind === "liquidation" ? null : line.sizeText;
				const qtyW = qty ? textWidth(qty, FONT, 500) + 16 : 0;
				const closeW = line.oid == null ? 0 : 18;
				const handleW = line.oid != null && line.order ? HANDLE_W : 0;
				const total = handleW + textW + qtyW + closeW;
				let left = LEFT;
				for (const box of placed) {
					if (Math.abs(box.y - y) < H + 2 && left < box.x + box.w + 6 && left + total > box.x) left = box.x + box.w + 6;
				}
				placed.push({ y, x: left, w: total });
				const top = y - H / 2;
				figures.push(rectFig(left, top, total, H, p.page, tone, 2));
				figures.push(rectFig(left, top, handleW + textW, H, fill, undefined, 2));
				if (handleW) {
					const cx = left + handleW / 2 + 1;
					for (const dy of [-3, 0, 3]) figures.push(lineFig(cx - 3, y + dy, cx + 3, y + dy, p.page, false));
				}
				figures.push(
					textFig(left + handleW + textW / 2, y, text, p.page, { align: "center", size: FONT, weight: 500 }),
				);
				let x = left + handleW + textW;
				if (qty) {
					figures.push(textFig(x + qtyW / 2, y, qty, p.fg, { align: "center", size: FONT, weight: 500 }));
					x += qtyW;
				}
				if (handleW) {
					const key = `${DRAG_KEY}${line.oid}`;
					boxes.push({ key, x: left, y: top, w: x - left, h: H });
					figures.push({
						key,
						type: "rect",
						attrs: { x: left, y: top, width: x - left, height: H },
						styles: { style: "fill", color: "rgba(0,0,0,0)" },
					});
				}
				if (closeW) {
					const key = `${CANCEL_KEY}${line.oid}`;
					const hovered = input.hover === key;
					boxes.push({ key, x, y: top, w: closeW, h: H });
					if (hovered) figures.push(rectFig(x, top + 1, closeW - 1, H - 2, mixHex(tone, p.page, 0.6), undefined, 0));
					figures.push(lineFig(x, top + 1, x, top + H - 1, tone, false));
					figures.push(
						textFig(x + closeW / 2, y, "×", hovered ? p.fg : p.secondary, { align: "center", size: 13, weight: 400 }),
					);
					figures.push({
						key,
						type: "rect",
						attrs: { x, y: top, width: closeW, height: H },
						styles: { style: "fill", color: "rgba(0,0,0,0)" },
					});
				}
			}
			hitBoxes = boxes;
			return figures as never;
		},
		createYAxisFigures: ({ overlay, bounding, yAxis }) => {
			const input = overlay.extendData as OrderLinesData;
			if (!yAxis) return [];
			const p = palette();
			const figures: unknown[] = [];
			const markY = input.markPx != null ? yAxis.convertToPixel(input.markPx) : null;
			const items = withDrag(input).map((line) => ({ line, y: yAxis.convertToPixel(line.price) }));
			for (const { line, ly } of layoutAroundMark(items, markY, AXIS_TAG_H + 2, bounding.height)) {
				const tone = toneColor(line.tone);
				const w = axisTagWidth(line.priceText);
				figures.push(rectFig(0, ly - AXIS_TAG_H / 2, w, AXIS_TAG_H, tone, undefined, 4));
				figures.push(textFig(AXIS_PAD, ly, line.priceText, p.page, { size: AXIS_FONT, weight: 400 }));
			}
			return figures as never;
		},
	});
}
