import Big from "big.js";
import type { Position } from "@/lib/hyperliquid";
import type { TpSlOrderInfo } from "@/lib/trade/open-orders";
import { getPositionMarkPrice } from "./valuation";

export type PositionSortKey = "market" | "size" | "value" | "entry" | "mark" | "pnl" | "roe" | "liquidation" | "margin" | "funding" | "tp" | "sl";
export interface PositionSort { key: PositionSortKey; descending: boolean }
const names = new Intl.Collator("en", { numeric: true, sensitivity: "base" });
function numeric(value: string | number | null | undefined): Big | null {
 try { return value == null || value === "" ? null : new Big(value); } catch { return null; }
}
function sortValue(position: Position, key: PositionSortKey, stops?: TpSlOrderInfo): Big | null {
 switch (key) {
  case "size": return numeric(position.szi)?.abs() ?? null;
  case "value": return numeric(position.positionValue);
  case "entry": return numeric(position.entryPx);
  case "mark": return numeric(getPositionMarkPrice(position));
  case "pnl": return numeric(position.unrealizedPnl);
  case "roe": return numeric(position.returnOnEquity);
  case "liquidation": return numeric(position.liquidationPx);
  case "margin": return numeric(position.marginUsed);
  // The table displays funding received as the negative of sinceOpen.
  case "funding": return numeric(position.cumFunding.sinceOpen)?.times(-1) ?? null;
  case "tp": return numeric(stops?.tpPrice);
  case "sl": return numeric(stops?.slPrice);
  default: return null;
 }
}
/** Compare raw values, preserve ties, and keep unavailable prices last in both directions. */
export function sortPositions(
 positions: readonly Position[], sort: PositionSort,
 stops: ReadonlyMap<string, TpSlOrderInfo> = new Map(),
 marketName: (coin: string) => string = coin => coin.split(":").at(-1) ?? coin,
): Position[] {
 return [...positions].sort((a, b) => {
  if (sort.key === "market") return names.compare(marketName(a.coin), marketName(b.coin)) * (sort.descending ? -1 : 1);
  const left = sortValue(a, sort.key, stops.get(a.coin));
  const right = sortValue(b, sort.key, stops.get(b.coin));
  if (left === null) return right === null ? 0 : 1;
  if (right === null) return -1;
  return left.cmp(right) * (sort.descending ? -1 : 1);
 });
}
