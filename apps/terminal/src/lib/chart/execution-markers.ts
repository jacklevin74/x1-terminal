export interface ExecutionFill { coin: string; side: string; time: number; px: string; sz: string; tid: number }
export interface ExecutionMarker { id: string; time: number; price: number; size: string; label: "B" | "S"; color: string; stack: number }
export function buildExecutionMarkers(fills: readonly ExecutionFill[], symbol: string, intervalMs: number): ExecutionMarker[] {
 if (!Number.isFinite(intervalMs) || intervalMs <= 0) return [];
 const seen = new Set<string>();
 const stacks = new Map<string, number>();
 return fills.filter(f => f.coin === symbol && (f.side === "B" || f.side === "A") && Number.isFinite(f.time) && f.time > 0 && Number(f.px) > 0 && Number.isFinite(Number(f.px)))
  .slice().sort((a, b) => a.time - b.time).flatMap(f => {
   const id = `${f.coin}:${f.tid}`;
   if (seen.has(id)) return [];
   seen.add(id);
   let time = Math.floor(f.time / intervalMs) * intervalMs;
   if (intervalMs === 30 * 86_400_000) { const date = new Date(f.time); time = Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1); }
   else if (intervalMs === 7 * 86_400_000) { const date = new Date(f.time); time = Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate() - (date.getUTCDay() + 6) % 7); }
   const label = f.side === "B" ? "B" : "S";
   const bucket = `${time}:${label}`;
   const stack = stacks.get(bucket) ?? 0; stacks.set(bucket, stack + 1);
   return [{ id, time, price: Number(f.px), size: f.sz, label, color: label === "B" ? "#26a69a" : "#ef5350", stack }];
  });
}
