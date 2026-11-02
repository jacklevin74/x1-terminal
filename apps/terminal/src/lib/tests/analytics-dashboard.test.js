// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { formatAmount, renderReport, renderTraderTable, rankedUsers } from "../../../../../server/analytics/dashboard-view.js";
import html from "../../../../../server/analytics/dashboard.html?raw";
const address=`0x${"ab".repeat(20)}`,other=`0x${"cd".repeat(20)}`;
const stats={fills:2,volume:"180.0357",realizedPnl:"-0.12345678",builderFeesPaid:null,exchangeFeesPaid:null,totalFeesPaid:null};
const data={builder:other,dataStatus:"ready",userCount:1,fillCount:2,users:[{address,fills:2,byMarket:{HYPE:stats}}],collection:{collectedAt:"2026-10-31T01:35:00Z",run:{status:"succeeded",from:"2026-10-30",to:"2026-10-31"},snapshots:[{includesCurrentDay:true}]},coverage:{metadataAvailable:false,complete:true,files:[{name:"fills.json",status:"loaded",fills:2,included:2}],warnings:[]}};
describe("local leaderboard",()=>{
 it("formats exact decimal amounts",()=>{
  expect(formatAmount("9007199254740993.01",2)).toBe("9,007,199,254,740,993.01");expect(formatAmount(null)).toBe("—");expect(formatAmount("0.00000001")).toBe("0.00000001");expect(formatAmount("-0.1",6,true)).toBe("−0.1");
 });
 it("shows only requested leaderboard columns and one row per user",()=>{
  document.documentElement.innerHTML=html;renderReport(data);
  expect([...document.querySelectorAll('section[aria-label="Leaderboard"] th')].map(n=>n.textContent)).toEqual(["Rank","Trader address","Fills","Volume","Realized PNL ↓","Fees"]);
  expect(document.querySelector("#traders a.address").getAttribute("href")).toBe(`/analytics?address=${address}`);expect(document.querySelectorAll("#traders tr")).toHaveLength(1);expect(document.getElementById("traders").textContent).toContain(address);expect(document.getElementById("traders").textContent).not.toContain("HYPE");expect(document.body.textContent).not.toContain("Builder fees");expect(document.body.textContent).not.toContain("Exchange fees");expect(document.querySelector("#traders .negative").title).toBe("-0.12345678");expect(document.querySelector("#traders td:last-child").textContent).toBe("—");
 });
 it("combines records by user and ranks highest PNL first using exact comparisons",()=>{
  const users=[{address,fills:4,byMarket:{A:{...stats,realizedPnl:"2",builderFeesPaid:"0.1"},B:{...stats,realizedPnl:"-1",builderFeesPaid:"0.2"}}},{address:other,fills:2,byMarket:{C:{...stats,realizedPnl:"1.000000000000000001",builderFeesPaid:"0.4"}}}];
  const rows=rankedUsers(users);expect(rows[0].address).toBe(other);expect(rows[1].totals.realizedPnl).toBe("1");expect(rows[1].totals.knownFeesPaid).toBe("0.3");
  document.documentElement.innerHTML=html;renderTraderTable(users);expect(document.querySelectorAll("#traders tr")).toHaveLength(2);
  renderTraderTable(users,{search:address});expect(document.querySelector("#traders td:first-child").textContent).toBe("2");
 });
 it("preserves the recorded fee total when another fill lacks a fee",()=>{
  document.documentElement.innerHTML=html;renderTraderTable([{address,fills:2,totals:{fills:2,volume:"100",realizedPnl:"2",knownFeesPaid:"0.3",missingFeeFills:1}}]);
  expect(document.querySelector("#traders td:last-child").textContent).toBe("0.3 *");expect(document.querySelector("#traders td:last-child").title).toContain("1 fills have no fee");
 });
 it("filters addresses and renders address text safely",()=>{
  document.documentElement.innerHTML=html;renderTraderTable([{address:"<img src=x onerror=alert(1)>",fills:2,byMarket:{HYPE:stats}}]);expect(document.querySelector("#traders img")).toBeNull();renderTraderTable(data.users,{search:"not-found"});expect(document.getElementById("traders").textContent).toContain("No traders match");
 });
 it("retains collection error/provisional status",()=>{
  document.documentElement.innerHTML=html;renderReport(data);expect(document.getElementById("notice").textContent).toContain("provisional");renderReport({...data,dataStatus:"collection_incomplete",message:"Collection failed",collection:{...data.collection,run:{...data.collection.run,status:"failed"}}});expect(document.getElementById("collection-status").textContent).toBe("Needs attention");expect(document.getElementById("notice").textContent).toBe("Collection failed");
 });
});
