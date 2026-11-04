import {it,expect} from "vitest";
import {accountEquity,targetRows,validateSettings} from "@/lib/auto-trader/targets";
import {AUTO_TRADER_DEFAULTS} from "@/config/auto-trader";
import {executionLabel} from "@/components/auto-trader/status-card";
const markets=["BTC","ETH","SOL","HYPE","ZEC","NEAR","xyz:GOOGL","xyz:SOXL","xyz:NVDA"];
const settings={...AUTO_TRADER_DEFAULTS,leverage:5};
it("matches the executor's twelve-market equity allocation and deadband boundaries",()=>{
 const signal={coins:[{coin:"BTC",score:14},{coin:"ETH",score:15},{coin:"SOL",score:-14},{coin:"HYPE",score:-15},{coin:"xyz:NVDA",score:100},...markets.slice(4,8).map(coin=>({coin,score:0}))],timestamp:null};
 const rows=targetRows({equity:228.63,settings,signal,current:{}});
 expect(rows.find(r=>r.coin==="xyz:NVDA")?.target).toBeCloseTo(95.2625);expect(rows[0].target).toBe(0);expect(rows[1].target).toBeCloseTo(14.289375);expect(rows[2].target).toBe(0);expect(rows[3].target).toBeCloseTo(-14.289375);
});
it("holds neutral positions, separates flips, respects minimum orders and the daily loss stop",()=>{
 const one={...settings,include:["BTC"]};
 expect(targetRows({equity:100,settings:one,signal:{coins:[{coin:"BTC",score:0}],timestamp:null},current:{BTC:1}})[0].actions).toEqual(["HOLD"]);
 expect(targetRows({equity:100,settings:one,signal:{coins:[{coin:"BTC",score:-100}],timestamp:null},current:{BTC:100}})[0].actions).toEqual(["FLIP-CLOSE","FLIP-OPEN"]);
 expect(targetRows({equity:100,settings:one,signal:{coins:[{coin:"BTC",score:-100}],timestamp:null},current:{BTC:100},killed:true})[0].actions).toEqual(["CLOSE"]);
 expect(targetRows({equity:100,settings:one,signal:{coins:[{coin:"BTC",score:100}],timestamp:null},current:{BTC:499}})[0].actions).toEqual(["SKIP"]);
 expect(targetRows({equity:100,settings:one,signal:{coins:[{coin:"BTC",score:100}],timestamp:null},current:{BTC:0},killed:true})[0].actions).toEqual(["LOSS STOP"]);
});
it("honors selected markets and excludes without changing the per-market cap",()=>{
 const rows=targetRows({equity:100,settings:{...settings,include:["BTC","ETH","xyz:NVDA"],exclude:["ETH"]},signal:{coins:[{coin:"BTC",score:100},{coin:"ETH",score:100},{coin:"xyz:NVDA",score:100}],timestamp:null},current:{}});expect(rows).toHaveLength(2);expect(rows[0].target).toBe(250);
 expect(()=>validateSettings({...settings,leverage:6},markets)).toThrow();expect(()=>validateSettings({...settings,killPct:0},markets)).toThrow();expect(()=>validateSettings({...settings,minOrderUsd:9},markets)).toThrow();expect(()=>validateSettings({...settings,include:[]},markets)).toThrow();
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

it("uses new API markets for allocation and validates selections against that list",()=>{
 const coins=["BTC","xyz:BRENTOIL","xyz:GOLD","xyz:MU","xyz:INTC"];
 const signal={coins:coins.map(coin=>({coin,score:100})),timestamp:null};
 expect(targetRows({equity:100,settings:{...settings,include:coins},signal,current:{}}).map(r=>r.coin)).toEqual(coins);
 expect(targetRows({equity:100,settings,signal,current:{}})[0].target).toBeCloseTo(500/12);
 expect(()=>validateSettings({...settings,include:["xyz:MU"]},coins)).not.toThrow();
 expect(()=>validateSettings({...settings,include:["xyz:REMOVED"]},coins)).toThrow("supported");
 expect(()=>validateSettings(settings,[])).toThrow("at least one");
});

it("uses numeric scores despite Neutral labels and holds missing-score positions",()=>{
 const signal={coins:[{coin:"HYPE",score:17,label:"Neutral"}],timestamp:null};
 const row=targetRows({equity:100,settings,signal,current:{HYPE:445.60}}).find(r=>r.coin==="HYPE")!;expect(row.actions).toEqual(["REDUCE"]);expect(row.target).toBeCloseTo(500/12*0.17);
 const missing=targetRows({equity:100,settings,signal:{coins:[{coin:"HYPE",score:null}],timestamp:null},current:{HYPE:-100}}).find(r=>r.coin==="HYPE")!;expect(missing.actions).toEqual(["HOLD"]);expect(missing.target).toBe(-100);
});

it("excludes SOXL and keeps neutral markets in allocation",()=>{const rows=targetRows({equity:120,settings,signal:{coins:[{coin:"BTC",score:100},{coin:"xyz:SOXL",score:100}],timestamp:null},current:{}});expect(rows).toHaveLength(12);expect(rows.some(r=>r.coin==="xyz:SOXL")).toBe(false);expect(rows[0].target).toBe(50);expect(rows[1].actions).toEqual(["SKIP"]);});
