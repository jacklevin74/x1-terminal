import { registerOverlay } from "klinecharts";
import type { ExecutionMarker } from "./execution-markers";
import { colorToHex, getChartColors } from "./theme-colors";
export const EXECUTION_OVERLAY = "executionBadge";
let registered = false;
export function registerExecutionOverlay() {
	if (registered) return;
	registered = true;
	registerOverlay({
		name: EXECUTION_OVERLAY,
		totalStep: 1,
		lock: true,
		needDefaultPointFigure: false,
		needDefaultXAxisFigure: false,
		needDefaultYAxisFigure: false,
		createPointFigures: ({ coordinates, overlay }) => {
			const point = coordinates[0];
			if (!point) return [];
			const marker = overlay.extendData as ExecutionMarker & { color: string };
			const colors = getChartColors();
			const y = point.y + (marker.label === "B" ? 1 : -1) * (14 + marker.stack * 18);
			return [
				{
					type: "circle",
					attrs: { x: point.x, y, r: 9 },
					styles: { style: "fill", color: marker.color },
					ignoreEvent: true,
				},
				{
					type: "text",
					attrs: { x: point.x, y, text: marker.label, align: "center", baseline: "middle" },
					styles: { color: colorToHex(colors.page), size: 12, weight: "normal", family: colors.fontFamily },
					ignoreEvent: true,
				},
			];
		},
	});
}
