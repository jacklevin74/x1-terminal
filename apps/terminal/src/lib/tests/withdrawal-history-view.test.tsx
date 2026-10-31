// @vitest-environment jsdom
import { act, createElement, type ReactNode } from "react";
import { createRoot } from "react-dom/client";
import { expect, it, vi } from "vitest";
import { useWithdrawalHistory, WithdrawalLinks } from "@/components/trade/positions/withdrawal-history";
const state = vi.hoisted(() => ({ destination: "solana-recipient", hash: `0x${"ab".repeat(32)}` }));
vi.mock("@tanstack/react-query", () => ({ useQuery: () => ({ data: [{ id:"native-1", time:1800000000000, asset:"SOL", amount:"0.13", destination:state.destination, chain:"Solana", status:"Completed", trackingUrl:`https://explorer.hyperunit.xyz/addresses/${state.destination}`, transactionUrl:"https://solscan.io/tx/native-signature" }], refetch:vi.fn() }) }));
vi.mock("@/lib/hyperliquid", () => ({ useSubscription: () => ({ data: {nonFundingLedgerUpdates:[{hash:state.hash,time:1800000000001,delta:{type:"withdraw",usdc:"16.95"}}, {hash:"ordinary-send",time:1800000000002,delta:{type:"send",amount:"1"}}]} }) }));
vi.mock("@/lib/network", () => ({isTestnet:()=>false}));
vi.mock("@/lib/format", () => ({formatDateTime:(time:number)=>String(time)}));
vi.mock("@hypeterminal/ui", () => {
 const tag = (name:string) => ({children,...props}:{children:ReactNode}) => createElement(name,props,children);
 return {Table:tag("table"),TableHeader:tag("thead"),TableBody:tag("tbody"),TableRow:tag("tr"),TableHead:tag("th"),TableCell:tag("td")};
});
function HistoryHarness() {
 const {rows}=useWithdrawalHistory(`0x${"cd".repeat(20)}`);
 return createElement("div",null,`Withdrawals (${rows.length})`,...rows.map(row=>createElement("article",{key:row.id},row.status,createElement(WithdrawalLinks,{row}))));
}
it("renders native tracking and legacy ledger links without misclassifying normal sends",async()=>{
 const node=document.createElement("div");const root=createRoot(node);
 await act(async()=>root.render(createElement(HistoryHarness)));
 expect(node.textContent).toContain("Withdrawals (2)");
 expect(node.textContent).toContain("Completed");expect(node.textContent).toContain("Submitted");
 const links=[...node.querySelectorAll("a")].map(a=>a.href);
 expect(links).toContain(`https://explorer.hyperunit.xyz/addresses/${state.destination}`);
 expect(links).toContain(`https://app.hyperliquid.xyz/explorer/tx/${state.hash}`);
 expect(links).toContain("https://solscan.io/tx/native-signature");
 expect(node.querySelectorAll("article")).toHaveLength(2);
 await act(async()=>root.unmount());
});
