import {expect,it} from "vitest";
import {spotUsdPrices,summarizeAccount} from "@/lib/positions/account-summary";
import type {AllDexsAccountState} from "@/hooks/trade/use-account-balances";
const state=(mm:string,ntl:string,pnl:string,isolated=false)=>({crossMaintenanceMarginUsed:mm,marginSummary:{accountValue:"0"},crossMarginSummary:{accountValue:"0",totalNtlPos:ntl},assetPositions:[{position:{szi:"1",positionValue:ntl,unrealizedPnl:pnl,marginUsed:isolated?"5000":"0",leverage:{type:isolated?"isolated":"cross"}}}]});
const input=()=>({states:[["",state("1000","50000","10")],["xyz",state("2377.81","57248.28","25.51")]] as unknown as AllDexsAccountState["clearinghouseStates"],balances:[{coin:"USDC",token:0,total:"40471.05",hold:"0",entryNtl:"0"}],mode:"unifiedAccount",collateral:{"":0,xyz:0}});
it("uses unified equity once and aggregates exposure, maintenance and PNL across venues",()=>{
 const summary=summarizeAccount(input());expect(summary.portfolioValue).toBe(40471.05);expect(summary.unrealizedPnl).toBe(35.51);expect(summary.maintenance).toBe(3377.81);expect(summary.leverage).toBeCloseTo(2.65,2);expect(summary.ratio).toBeCloseTo(3377.81/40471.05);
});
it("deducts isolated margin and takes the highest ratio per collateral token",()=>{
 const data=input();data.states[0][1]=state("1000","50000","10",true) as typeof data.states[0][1];
 expect(summarizeAccount(data).ratio).toBeCloseTo(3377.81/(40471.05-5000));
 const multi=input();multi.states.push(["other",state("100","1000","0") as typeof multi.states[0][1]]);multi.balances.push({coin:"USDT",token:360,total:"500",hold:"0",entryNtl:"0"});expect(summarizeAccount({...multi,collateral:{...multi.collateral,other:360},prices:{360:1}}).ratio).toBe(0.2);
});
it("never values spot assets at historical entry notional or invents incomplete risk values",()=>{
 const data=input();data.balances.push({coin:"HYPE",token:150,total:"2",hold:"0",entryNtl:"9999"});
 expect(summarizeAccount(data).portfolioValue).toBeNull();expect(summarizeAccount({...data,prices:{150:40}}).portfolioValue).toBe(40551.05);
 expect(summarizeAccount({...input(),collateral:{}}).ratio).toBeNull();expect(summarizeAccount({...input(),ready:false}).portfolioValue).toBeNull();
});
it("does not fabricate portfolio-margin risk or classify unfunded cross exposure as healthy",()=>{
 expect(summarizeAccount({...input(),mode:"portfolioMargin"}).ratio).toBeNull();expect(summarizeAccount({...input(),mode:"portfolioMargin"}).portfolioValue).toBeNull();
 const data=input();data.balances[0].total="0";expect(summarizeAccount(data).ratio).toBe(Infinity);
});

it("matches sparse spot contexts by market name instead of valuing MAX at another token’s price",()=>{
 const universe=[{name:"@107",tokens:[150,0]},{name:"@188",tokens:[299,0]},{name:"@591",tokens:[734,0]}];
 const contexts=[{coin:"@306",markPx:"8.2877"},{coin:"@591",markPx:"0.000001"},{coin:"@107",markPx:"80"},{coin:"@188",markPx:"0.003"}];
 const prices=spotUsdPrices(universe,contexts);expect(prices).toEqual({0:1,150:80,299:0.003,734:0.000001});
 const data=input();data.balances=[{coin:"USDC",token:0,total:"241034.91626236",hold:"0",entryNtl:"0"},{coin:"MAX",token:734,total:"165124.2589",hold:"0",entryNtl:"0"}];
 expect(summarizeAccount({...data,prices}).portfolioValue).toBeCloseTo(241035.0813866189);
});
it("never falls back to a neighboring context when the market quote is missing",()=>{
 const prices=spotUsdPrices([{name:"@591",tokens:[734,0]}],[{coin:"@306",markPx:"8.2877"}]);expect(prices[734]).toBeUndefined();
 const data=input();data.balances.push({coin:"MAX",token:734,total:"165124.2589",hold:"0",entryNtl:"0"});expect(summarizeAccount({...data,prices}).portfolioValue).toBeNull();
});

it("does not dilute unified leverage with non-collateral spot holdings or isolated notional",()=>{
 const data=input();data.balances.push({coin:"HYPE",token:150,total:"1000",hold:"0",entryNtl:"0"});
 data.states[0][1].assetPositions[0].position.positionValue="100000";
 const summary=summarizeAccount({...data,prices:{150:80}});expect(summary.portfolioValue).toBe(120471.05);expect(summary.leverage).toBeCloseTo(107248.28/40471.05);
 expect(summarizeAccount({...data,prices:{150:80},collateral:{}}).leverage).toBeNull();
});

it("reconciles unified equity with held orders and an isolated position without double deductions",()=>{
 // Anonymized live reconciliation: order holds remain in total equity, while
 // isolated margin reduces the collateral available for the risk ratio only.
 const equity="40281.131688",isolatedMargin="367.418421";
 const data=input();
 data.balances=[{coin:"USDC",token:0,total:equity,hold:"23000.034529",entryNtl:"0"}];
 data.states[0][1]=state("3518.084216","113163.08054","92.070956") as typeof data.states[0][1];
 data.states[1][1]=state("0","0","-70.135493",true) as typeof data.states[0][1];
 data.states[1][1].assetPositions[0].position.marginUsed=isolatedMargin;
 data.states[1][1].assetPositions[0].position.positionValue="1837.092105";
 const summary=summarizeAccount(data);
 expect(summary.portfolioValue).toBe(Number(equity));
 expect(summary.unrealizedPnl).toBeCloseTo(21.935463,6);
 expect(summary.maintenance).toBe(3518.084216);
 expect(summary.ratio).toBeCloseTo(3518.084216/(Number(equity)-Number(isolatedMargin)),12);
 expect((summary.ratio!*100).toFixed(2)).toBe("8.81");
 expect(summary.leverage).toBeCloseTo(2.8093322058702728,12);
 expect(summary.leverage!.toFixed(2)).toBe("2.81");
});
