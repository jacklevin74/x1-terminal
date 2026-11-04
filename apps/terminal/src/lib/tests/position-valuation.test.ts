import {expect,it} from "vitest";
import {getAccountUnrealizedPnl,getPositionMarkPrice} from "@/lib/positions/valuation";
type States=Parameters<typeof getAccountUnrealizedPnl>[0];
it("includes native and builder positions in the account total",()=>{
 const states=[["",{assetPositions:[{position:{szi:"1",unrealizedPnl:"-8.103336"}}]}],["xyz",{assetPositions:[{position:{szi:"-1",unrealizedPnl:"20.83139"}}]}],["empty",{assetPositions:[]}]] as unknown as States;
 expect(getAccountUnrealizedPnl(states)).toBe(12.728054);
});
it("distinguishes unavailable data from a verified flat account and does not report partial totals",()=>{
 expect(getAccountUnrealizedPnl([])).toBeNull();expect(getAccountUnrealizedPnl([["",{assetPositions:[]}]] as unknown as States)).toBe(0);
 expect(getAccountUnrealizedPnl([["",{assetPositions:[{position:{szi:"1",unrealizedPnl:"4"}},{position:{szi:"1",unrealizedPnl:"invalid"}}]}]] as unknown as States)).toBeNull();
});
it("uses the same valuation for long and short positions rather than the current midpoint",()=>{
 expect(getPositionMarkPrice({szi:"-0.921",positionValue:"782.04873"})).toBe("849.13");
 expect(getPositionMarkPrice({szi:"0.0872",positionValue:"197.95272"})).toBe("2270.1");
 expect(getPositionMarkPrice({szi:"0",positionValue:"0"})).toBeUndefined();expect(getPositionMarkPrice({szi:"1",positionValue:"invalid"})).toBeUndefined();
});
