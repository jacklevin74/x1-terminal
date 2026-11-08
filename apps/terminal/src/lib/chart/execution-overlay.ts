import { registerOverlay } from "klinecharts";
import type { ExecutionMarker } from "./execution-markers";
export const EXECUTION_OVERLAY = "executionBadge";
let registered = false;
export function registerExecutionOverlay() {
 if (registered) return;
 registered = true;
 registerOverlay({ name: EXECUTION_OVERLAY, totalStep: 1, lock: true,
  needDefaultPointFigure: false, needDefaultXAxisFigure: false, needDefaultYAxisFigure: false,
  createPointFigures: ({ coordinates, overlay }) => {
   const point = coordinates[0]; if (!point) return [];
   const marker = overlay.extendData as ExecutionMarker;
   const y = point.y + (marker.label === "B" ? 1 : -1) * (10 + marker.stack * 14);
   return [
    { type: "circle", attrs: { x: point.x, y, r: 6 }, styles: { style: "fill", color: marker.color }, ignoreEvent: true },
    { type: "text", attrs: { x: point.x, y, text: marker.label, align: "center", baseline: "middle" }, styles: { color: "#ffffff", size: 6.75, weight: "bold" }, ignoreEvent: true },
   ];
  },
 });
}
