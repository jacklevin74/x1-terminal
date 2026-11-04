import { registerOverlay } from "klinecharts";
import {
	type ChartLine,
	type ChartLinesInput,
	layoutAroundMark,
	lineFig,
	palette,
	rectFig,
	resolveCollisions,
	textFig,
	textWidth,
	toneColor,
} from "./chart-lines";

export const ORDER_LINES_OVERLAY = "orderLines";
const H = 20;
const TAG_H = 18;
const FONT = 11;
const LEFT = 8;
export const CANCEL_KEY = "cancel:";

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
			const input = overlay.extendData as ChartLinesInput;
			if (!yAxis) return [];
			const p = palette();
			const figures: unknown[] = [];
			const items = input.lines
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
			for (const { line, y, ly } of resolveCollisions(items, H + 4, 0, bounding.height)) {
				const tone = toneColor(line.tone);
				const text = mainText(line);
				const textW = textWidth(text, FONT, 500) + 18;
				const qty = line.kind === "liquidation" ? null : line.sizeText;
				const qtyW = qty ? textWidth(qty, FONT, 500) + 20 : 0;
				const closeW = line.oid == null ? 0 : 20;
				const total = textW + qtyW + closeW;
				const top = ly - H / 2;
				if (ly !== y) figures.push(lineFig(LEFT + total, ly, LEFT + total + 10, y, tone, false));
				figures.push(rectFig(LEFT, top, total, H, p.page, tone, 2));
				figures.push(rectFig(LEFT, top, textW, H, tone, undefined, 2));
				figures.push(textFig(LEFT + textW / 2, ly, text, p.page, { align: "center", size: FONT, weight: 600 }));
				let x = LEFT + textW;
				if (qty) {
					figures.push(textFig(x + qtyW / 2, ly, qty, p.fg, { align: "center", size: FONT, weight: 500 }));
					x += qtyW;
					figures.push(lineFig(x, top + 1, x, top + H - 1, tone, false));
				}
				if (closeW) {
					figures.push(textFig(x + closeW / 2, ly, "×", p.fg, { align: "center", size: 14, weight: 400 }));
					figures.push({
						key: `${CANCEL_KEY}${line.oid}`,
						type: "rect",
						attrs: { x, y: top, width: closeW, height: H },
						styles: { style: "fill", color: "rgba(0,0,0,0)" },
					});
				}
			}
			return figures as never;
		},
		createYAxisFigures: ({ overlay, bounding, yAxis }) => {
			const input = overlay.extendData as ChartLinesInput;
			if (!yAxis) return [];
			const p = palette();
			const markY = input.markPx != null ? yAxis.convertToPixel(input.markPx) : null;
			const items = input.lines.map((line) => ({ line, y: yAxis.convertToPixel(line.price) }));
			const figures: unknown[] = [];
			for (const { line, ly } of layoutAroundMark(items, markY, TAG_H + 2, bounding.height)) {
				const tone = toneColor(line.tone);
				figures.push(rectFig(1, ly - TAG_H / 2, bounding.width - 4, TAG_H, p.page, tone, 2));
				figures.push(textFig(6, ly, line.priceText, tone, { size: FONT, weight: 500 }));
			}
			return figures as never;
		},
	});
}
