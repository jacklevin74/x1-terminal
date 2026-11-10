import {expect,it} from "vitest";
import {forecastScore} from "@/lib/auto-trader/forecast";
import {validateSettings} from "@/lib/auto-trader/targets";
import {AUTO_TRADER_DEFAULTS} from "@/config/auto-trader";
import cases from "./fixtures/flow-score-pr28-parity.json";
// Captured offline from the merged hl-ws PR #28 pure rowFor/followerScore functions.
it.each(cases)("matches backend score: $name",c=>expect(forecastScore(c.coin,c.flowPct)).toBe(c.expected));
it.each([-1,41,3.5,NaN])("rejects invalid flow setting %s before submission",flowPct=>{
 expect(()=>validateSettings({...AUTO_TRADER_DEFAULTS,include:["BTC"],flowPct},["BTC"])).toThrow("Flow weight");
});
it.each([0,20,40,undefined])("accepts supported flow setting %s",flowPct=>{
 expect(()=>validateSettings({...AUTO_TRADER_DEFAULTS,include:["BTC"],flowPct},["BTC"])).not.toThrow();
});
