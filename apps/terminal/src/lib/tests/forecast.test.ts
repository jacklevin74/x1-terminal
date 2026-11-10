import { expect, it } from "vitest";
import { forecastTargets } from "@/lib/auto-trader/forecast";
import fixtures from "./fixtures/forecast-executor-parity.json";
// Golden expectations generated offline from hl-ws bc5745c planFollower.
// The extraction invokes only the pure planner, without module initialization or I/O.
it.each(fixtures)("matches executor planner targets: $name",fixture=>{
 const result=forecastTargets(fixture.input);
 expect(result.k).toBeCloseTo(fixture.expected.k,10);
 if(fixture.expected.gross!==null)expect(result.gross).toBeCloseTo(fixture.expected.gross,8);
 for(const expected of fixture.expected.rows){const row=result.rows.find(r=>r.market===expected.market)!;expect(Number(row.targetUsd!.toFixed(2))).toBe(expected.target);expect(Number(row.currentUsd!.toFixed(2))).toBe(expected.current);}
});
it("keeps missing market data unavailable rather than guessing zero targets",()=>{
 const fixture=fixtures[0].input;const result=forecastTargets({...fixture,mids:{}});
 expect(result.rows.every(row=>row.targetUsd===null&&row.action==="UNAVAILABLE")).toBe(true);
});
it("honors follower-specific flow weighting when the API exposes the legs",()=>{
 const fixture=fixtures[0].input;
 const result=forecastTargets({...fixture,settings:{...fixture.settings,flowPct:0,include:["BTC"]},signal:{timestamp:1,coins:[{coin:"BTC",score:40,posScore:80,flowScore:-20,flowPct:40,tradersLong:5,tradersShort:0,activeWallets:5}]}});
 expect(result.rows[0].score).toBe(80);
});
it("uses the saved minimum order and preserves full closes",()=>{
 const fixture=fixtures[0].input;
 const result=forecastTargets({...fixture,settings:{...fixture.settings,minOrderUsd:1000,include:["BTC"]},positions:{BTC:.1},signal:{timestamp:1,coins:[{coin:"BTC",score:-15}]}});
 expect(result.rows[0].action).toContain("FLIP-CLOSE");expect(result.rows[0].action).not.toContain("skip FLIP-CLOSE");expect(result.rows[0].action).toContain("skip FLIP-OPEN");
});
