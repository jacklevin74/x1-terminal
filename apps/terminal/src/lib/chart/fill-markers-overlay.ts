import { registerOverlay } from "klinecharts";
import { type FillBucket, palette, textFig, toneColor } from "./chart-lines";

export const FILL_MARKERS_OVERLAY = "fillMarkers";

let registered = false;

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
			const color = toneColor(b.side === "B" ? "up" : "down");
			const p = palette();
			const dir = b.side === "B" ? 1 : -1;
			const figures: unknown[] = [];
			for (let i = 0; i < b.count; i++) {
				const cy = point.y + dir * (4 + 7.5 + i * 16);
				figures.push({
					type: "circle",
					attrs: { x: point.x, y: cy, r: 7.5 },
					styles: { style: "fill", color },
					ignoreEvent: true,
				});
				figures.push(textFig(point.x, cy + 0.5, b.side, p.fg, { align: "center", size: 9, weight: 700 }));
			}
			return figures as never;
		},
	});
}
