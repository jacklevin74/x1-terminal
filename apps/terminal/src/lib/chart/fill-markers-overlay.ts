import { registerOverlay } from "klinecharts";
import { type FillBucket, palette, textFig, toneAlpha, toneColor } from "./chart-lines";
import { colorToRgba, getChartColors } from "./theme-colors";

export const FILL_MARKERS_OVERLAY = "fillMarkers";
export const FILL_ENTER_MS = 200;
const RADIUS = 7.5;
const ENTER_SCALE = 0.97;

let registered = false;

function enterProgress(b: FillBucket, index: number): number {
	if (b.enter == null || b.enterFrom == null || index < b.enterFrom) return 1;
	return Math.min(1, Math.max(0, b.enter));
}

export function registerFillMarkersOverlay() {
	if (registered) return;
	registered = true;
	registerOverlay({
		name: FILL_MARKERS_OVERLAY,
		totalStep: 1,
		lock: true,
		zLevel: 1,
		needDefaultPointFigure: false,
		needDefaultXAxisFigure: false,
		needDefaultYAxisFigure: false,
		createPointFigures: ({ overlay, coordinates }) => {
			const point = coordinates[0];
			if (!point) return [];
			const b = overlay.extendData as FillBucket;
			const tone = b.side === "B" ? "up" : "down";
			const color = toneColor(tone);
			const p = palette();
			const dir = b.side === "B" ? 1 : -1;
			const figures: unknown[] = [];
			for (let i = 0; i < b.count; i++) {
				const cy = point.y + dir * (4 + RADIUS + i * 16);
				const e = enterProgress(b, i);
				const scale = ENTER_SCALE + (1 - ENTER_SCALE) * e;
				figures.push({
					type: "circle",
					attrs: { x: point.x, y: cy, r: RADIUS * scale },
					styles: { style: "fill", color: e < 1 ? toneAlpha(tone, e) : color },
					ignoreEvent: true,
				});
				const textColor = e < 1 ? colorToRgba(getChartColors().foreground, e) : p.fg;
				figures.push(textFig(point.x, cy + 0.5, b.side, textColor, { align: "center", size: 9 * scale, weight: 700 }));
			}
			return figures as never;
		},
	});
}
