import {it,expect} from "vitest";
import {accountEquity,validateSettings,allowedMarkets,selectableMarkets,EXECUTOR_MARKETS} from "@/lib/auto-trader/targets";
import {AUTO_TRADER_DEFAULTS} from "@/config/auto-trader";
import {executionLabel} from "@/components/auto-trader/status-card";
const settings={...AUTO_TRADER_DEFAULTS,leverage:5};
it("validates settings and filters supported markets without calculating targets",()=>{
 const coins=["BTC","ETH","xyz:MU","xyz:SOXL"];
 expect(allowedMarkets({...settings,include:["BTC","ETH","xyz:SOXL"],exclude:["ETH"]},coins)).toEqual(["BTC","xyz:SOXL"]);
 expect(()=>validateSettings({...settings,leverage:6},coins)).toThrow();expect(()=>validateSettings({...settings,killPct:0},coins)).toThrow();expect(()=>validateSettings({...settings,minOrderUsd:9},coins)).toThrow();expect(()=>validateSettings({...settings,include:[]},coins)).toThrow();
 expect(()=>validateSettings({...settings,include:["xyz:MU"]},coins)).not.toThrow();expect(()=>validateSettings({...settings,include:["xyz:REMOVED"]},coins)).not.toThrow();expect(()=>validateSettings({...settings,include:["bad market"]},coins)).toThrow("identifiers");
});
it("uses spot USDC plus all included unrealized PNL for unified equity without double counting margin",()=>{
 const main={marginSummary:{accountValue:"500"},assetPositions:[{position:{unrealizedPnl:"5"}}]},xyz={marginSummary:{accountValue:"200"},assetPositions:[{position:{unrealizedPnl:"-2"}}]},spot={balances:[{coin:"USDC",total:"100"}]};
 expect(accountEquity("unifiedAccount",main,xyz,spot)).toBe(103);expect(accountEquity("disabled",main,xyz,spot)).toBe(700);expect(accountEquity("unifiedAccount",main,xyz,undefined)).toBeNull();expect(accountEquity("portfolioMargin",main,xyz,spot)).toBeNull();
});
it("never calls a resumed or active account live without a live executor cycle",()=>{
 expect(executionLabel({registered:true,state:"active",dryRun:false})).toBe("WAITING FOR CYCLE");
 expect(executionLabel({registered:true,state:"paused",lastCycle:Date.now(),plan:{ts:Date.now(),state:"active",live:true}})).toBe("PAUSED");
 expect(executionLabel({registered:true,state:"active",lastCycle:Date.now(),plan:{ts:Date.now(),state:"active",live:false,dryRun:true}})).toBe("DRY-RUN");
});

it("uses the actual reported subaccount cycle instead of a hardcoded deployment assumption",()=>{
 expect(executionLabel({registered:true,isSubaccount:true,state:"active",lastCycle:Date.now(),plan:{ts:Date.now(),state:"active",live:true}})).toBe("LIVE");
 expect(executionLabel({registered:true,isSubaccount:true,state:"active"})).toBe("WAITING FOR CYCLE");
});

it("allows every displayed choice without changing the executor support snapshot",()=>{
 const markets=[...EXECUTOR_MARKETS,"xyz:SOXL"];
 expect(EXECUTOR_MARKETS.filter(coin=>coin==="XRP")).toHaveLength(1);
 expect(allowedMarkets(settings,markets)).toContain("XRP");
 expect(allowedMarkets(settings,markets)).toContain("xyz:SOXL");
 expect(EXECUTOR_MARKETS as readonly string[]).not.toContain("xyz:SOXL");
 expect(()=>validateSettings({...settings,include:["XRP"]},markets)).not.toThrow();
 expect(allowedMarkets({...settings,include:["BTC"]},markets)).not.toContain("XRP");
 expect(allowedMarkets({...settings,exclude:["XRP"]},markets)).not.toContain("XRP");
 expect(allowedMarkets(settings,["BTC"])).toContain("XRP");
 expect(()=>validateSettings({...settings,include:["XRP"]},["BTC"])).not.toThrow();
});

it("retains saved include/exclude choices while signal markets are missing",()=>{
 const saved={...settings,include:["BTC","xyz:SAVED"],exclude:["ETH"]};
 expect(selectableMarkets(["BTC"],saved)).toEqual(["BTC","XRP","xyz:SAVED","ETH"]);
 expect(allowedMarkets(saved,["BTC"])).toEqual(["BTC","xyz:SAVED"]);
 expect(()=>validateSettings(saved,["BTC"])).not.toThrow();
 expect(()=>validateSettings(saved,[])).toThrow("unavailable");
});

it("shows a legacy short include name once using its API market identifier",()=>{
 const saved={...settings,include:["GOOGL"]};
 expect(selectableMarkets(["xyz:GOOGL"],saved)).toEqual(["xyz:GOOGL","XRP"]);
 expect(allowedMarkets(saved,["xyz:GOOGL"])).toEqual(["xyz:GOOGL"]);
});
