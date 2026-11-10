import {expect,it} from "vitest";
import {removedMarketsForSave,closeRemovedSettingsRequest} from "@/lib/auto-trader/removed-markets";
import {forecastTargets} from "@/lib/auto-trader/forecast";
import {validateSettings} from "@/lib/auto-trader/targets";
const base={include:["BTC","ETH"],exclude:[],leverage:3,killPct:.1,minOrderUsd:150};
it("requests only explicitly deselected markets when the option is enabled",()=>{
 expect(removedMarketsForSave(base,{...base,include:["BTC"]},["BTC","ETH","SOL"])).toEqual([]);
 expect(removedMarketsForSave(base,{...base,include:["BTC"],closeRemovedPositions:true},["BTC","ETH","SOL"])).toEqual(["ETH"]);
 const body=closeRemovedSettingsRequest(base,{...base,include:["BTC"],closeRemovedPositions:true,closeMarkets:["SOL"]},["BTC","ETH","SOL"]);
 expect(body.removedMarkets).toEqual(["ETH"]);expect(body).not.toHaveProperty("closeMarkets");
});
it("supports the initial all-markets selection, exclusion and no newly selected closes",()=>{
 const old={...base,include:null};
 expect(removedMarketsForSave(old,{...base,include:["BTC"],closeRemovedPositions:true},["BTC","ETH"])).toEqual(expect.arrayContaining(["ETH"]));
 expect(removedMarketsForSave(base,{...base,exclude:["ETH"],closeRemovedPositions:true},["BTC","ETH"])).toEqual(["ETH"]);
 expect(removedMarketsForSave(base,{...base,include:["BTC","ETH","SOL"],closeRemovedPositions:true},["BTC","ETH","SOL"])).toEqual([]);
});
it("forecasts reduce-only closures for queued markets, not unrelated holdings",()=>{
 const p=forecastTargets({settings:{...base,include:["BTC"],closeRemovedPositions:true,closeMarkets:["ETH"]},signal:{timestamp:1,coins:[{coin:"BTC",score:0}]},universe:["BTC","ETH","SOL"],equity:1000,positions:{BTC:1,ETH:-.1,SOL:4},mids:{BTC:"100",ETH:"50",SOL:"10"},decimals:{BTC:3,ETH:3,SOL:2}});
 const eth=p.rows.find(r=>r.market==="ETH")!;expect(eth.action).toBe("CLOSE");expect(eth.currentUsd).toBe(-5);expect(eth.targetUsd).toBe(0);expect(eth.gapUsd).toBe(5);expect(p.rows.some(r=>r.market==="SOL")).toBe(false);
 expect(p.rows.find(r=>r.market==="BTC")?.action).toBe("HOLD (neutral)");
});
it("allows closing the final selected market without opening a new one",()=>{
 const settings={...base,include:[],closeRemovedPositions:true,closeMarkets:["ETH"]};expect(()=>validateSettings(settings,["ETH"])).not.toThrow();
 const p=forecastTargets({settings,signal:{timestamp:1,coins:[{coin:"ETH",score:99}]},universe:["ETH"],equity:1000,positions:{ETH:1},mids:{ETH:"50"},decimals:{ETH:3}});
 expect(p.rows).toHaveLength(1);expect(p.rows[0].targetUsd).toBe(0);expect(p.rows[0].action).toBe("CLOSE");expect(p.gross).toBe(0);
 expect(()=>validateSettings({...settings,closeRemovedPositions:false},["ETH"])).toThrow("Select at least one market");
});
it("does not forecast any queued closure when the option is off",()=>{
 const p=forecastTargets({settings:{...base,include:["BTC"],closeRemovedPositions:false,closeMarkets:["ETH"]},signal:{timestamp:1,coins:[{coin:"BTC",score:0}]},universe:["BTC","ETH"],equity:1000,positions:{ETH:1},mids:{BTC:"100",ETH:"50"},decimals:{BTC:3,ETH:3}});
 expect(p.rows.some(r=>r.market==="ETH")).toBe(false);
});
