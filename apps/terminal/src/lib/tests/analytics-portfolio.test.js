// @vitest-environment jsdom
import { expect, it } from "vitest";
import { loadPortfolio } from "../../../../../server/analytics/portfolio.js";
it("loads all discovered perp venues and spot holdings without signing",async()=>{
 const calls=[],panel=document.createElement("div");
 await loadPortfolio(`0x${"ab".repeat(20)}`,panel,async(type,user,extra)=>{calls.push([type,extra]);if(type==="perpDexs")return [null,{name:"xyz"}];if(type==="spotClearinghouseState")return {balances:[{coin:"SOL",total:"1.25",hold:"0"}]};return {assetPositions:extra.dex?[{position:{coin:"xyz:TSLA",szi:"-2",entryPx:"300",positionValue:"600",unrealizedPnl:"-10",returnOnEquity:"-0.1",marginUsed:"30",liquidationPx:null,leverage:{type:"cross",value:20}}}]:[]};});
 expect(calls.filter(c=>c[0]==="clearinghouseState").map(c=>c[1].dex)).toEqual(["","xyz"]);expect(panel.textContent).toContain("xyz:TSLA");expect(panel.textContent).toContain("Short");expect(panel.textContent).toContain("1.25");
});
it("shows unavailable rather than zero when requests fail",async()=>{const panel=document.createElement("div");await loadPortfolio("0xabc",panel,async()=>{throw new Error("offline");});expect(panel.textContent).toContain("could not be loaded");expect(panel.textContent).toContain("Spot balances unavailable");expect(panel.textContent).not.toContain("No open positions");});
