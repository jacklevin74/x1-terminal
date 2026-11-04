import Big from "big.js";
import type { AllDexsClearinghouseStateWsEvent } from "@nktkas/hyperliquid";
import type { Position } from "@/lib/hyperliquid";

/** Sum the same account-wide positions used by the position table. */
export function getAccountUnrealizedPnl(states: AllDexsClearinghouseStateWsEvent["clearinghouseStates"]): number | null {
 if (!states.length) return null;
 try {
  let total = new Big(0);
  for (const [, state] of states) {
   for (const { position } of state.assetPositions) {
    if (new Big(position.szi).eq(0)) continue;
    total = total.plus(position.unrealizedPnl);
   }
  }
  const value = total.toNumber();
  return Number.isFinite(value) ? value : null;
 } catch { return null; }
}

/** Valuation mark from the position snapshot; never substitute the book midpoint. */
export function getPositionMarkPrice(position: Pick<Position, "szi" | "positionValue">): string | undefined {
 try {
  const size = new Big(position.szi).abs(), value = new Big(position.positionValue);
  if (size.eq(0) || value.lte(0)) return undefined;
  return value.div(size).toString();
 } catch { return undefined; }
}
