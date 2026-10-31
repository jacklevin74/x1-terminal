export interface TradingLine { id: string; price: number; label: string; color: string }
interface Position { szi: string; entryPx: string; liquidationPx?: string | null; unrealizedPnl?: string }
interface Order { oid: number; coin: string; side: "B" | "A"; isTrigger: boolean; triggerPx: string; limitPx: string; sz: string; label: string }
export function buildTradingLines(symbol: string, position: Position | undefined, orders: readonly Order[]): TradingLine[] {
 const lines: TradingLine[] = [];
 const valid = (price: number) => Number.isFinite(price) && price > 0;
 if (position && Number(position.szi) !== 0 && Number.isFinite(Number(position.szi))) {
  const long = Number(position.szi) > 0;
  const entry = Number(position.entryPx);
  if (valid(entry)) lines.push({ id: "position", price: entry, label: `${long ? "Long" : "Short"} · ${Math.abs(Number(position.szi))}${position.unrealizedPnl != null && Number.isFinite(Number(position.unrealizedPnl)) ? ` · PNL ${Number(position.unrealizedPnl).toFixed(2)}` : ""}`, color: long ? "#26a69a" : "#ef5350" });
  const liquidation = Number(position.liquidationPx);
  if (valid(liquidation)) lines.push({ id: "liquidation", price: liquidation, label: "Liquidation", color: "#f59e0b" });
 }
 for (const order of orders) {
  if (order.coin !== symbol) continue;
  const price = Number(order.isTrigger ? order.triggerPx : order.limitPx);
  if (valid(price)) lines.push({ id: `order:${order.oid}`, price, label: `${order.label} · ${order.sz}`, color: order.side === "B" ? "#26a69a" : "#ef5350" });
 }
 return lines;
}
