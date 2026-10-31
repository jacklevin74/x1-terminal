import type { Chart } from "klinecharts";
import { useEffect, type RefObject } from "react";
import { buildExecutionMarkers } from "@/lib/chart/execution-markers";
import { EXECUTION_OVERLAY, registerExecutionOverlay } from "@/lib/chart/execution-overlay";
import { useExecutionFills } from "./use-execution-fills";
export function useKlineExecutions(chartRef: RefObject<Chart | null>, symbol: string, intervalMs: number) {
 const fills = useExecutionFills();
 useEffect(() => {
  const chart = chartRef.current; if (!chart) return;
  registerExecutionOverlay();
  chart.removeOverlay({ name: EXECUTION_OVERLAY });
  for (const marker of buildExecutionMarkers(fills, symbol, intervalMs)) {
   chart.createOverlay({ name: EXECUTION_OVERLAY, id: `execution:${marker.id}`, points: [{ timestamp: marker.time, value: marker.price }], extendData: marker });
  }
  return () => { chart.removeOverlay({ name: EXECUTION_OVERLAY }); };
 }, [chartRef, fills, symbol, intervalMs]);
}
