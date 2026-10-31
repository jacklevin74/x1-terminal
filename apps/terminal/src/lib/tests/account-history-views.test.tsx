// @vitest-environment jsdom
import { act, createElement, type ReactNode } from "react";
import { createRoot } from "react-dom/client";
import { expect, it, vi } from "vitest";
import { OrdersTab } from "@/components/trade/positions/orders-tab";
import { OrdersHistoryTab } from "@/components/trade/positions/orders-history-tab";
import { FundingTab } from "@/components/trade/positions/funding-tab";
const state = vi.hoisted(() => ({ cancel: vi.fn(), order: { coin: "BTC", side: "A", limitPx: "100", sz: "2", oid: 123, timestamp: 1_800_000_000_000, origSz: "3", triggerCondition: "", isTrigger: false, triggerPx: "0", children: [], isPositionTpsl: false, reduceOnly: true, orderType: "Limit", tif: "Gtc", cloid: null } }));
vi.mock("@/components/trade/positions/withdrawal-history", () => ({ useWithdrawalHistory: () => ({ rows: [{id:"withdraw-1",time:1800000001000,asset:"SOL",amount:"0.13",destination:"solana-recipient",chain:"Solana",status:"Completed",trackingUrl:"https://explorer.hyperunit.xyz/addresses/solana-recipient"}], loading:false,error:false,refresh:vi.fn() }), WithdrawalLinks: () => createElement("a", {href:"https://explorer.hyperunit.xyz/addresses/solana-recipient"}, "Unit ↗") }));
vi.mock("@lingui/core/macro", () => ({ t: (strings: TemplateStringsArray, ...values: unknown[]) => strings.reduce((s, part, i) => s + part + (values[i] ?? ""), "") }));
vi.mock("wagmi", () => ({ useConnection: () => ({ address: `0x${"cd".repeat(20)}`, isConnected: true }) }));
vi.mock("@/lib/hyperliquid", () => ({ useExchange: () => ({ mutate: state.cancel, reset: vi.fn() }), useMarkets: () => ({ getMarket: () => ({ kind: "perp", shortName: "BTC" }), getSzDecimals: () => 3, getAssetId: () => 0 }), useSubscription: (method: string) => ({ status: "active", data: method === "openOrders" ? { orders: [state.order] } : method === "userHistoricalOrders" ? { orderHistory: [{ order: state.order, status: "open", statusTimestamp: state.order.timestamp }] } : { fundings: Array.from({ length: 16 }, (_, i) => ({ coin: "BTC", time: 1_800_000_000_000 + i * 1000, szi: i % 2 ? "-1" : "1", usdc: "-0.0001", fundingRate: "0.000013" })) } }) }));
vi.mock("@/providers/exchange-scope", () => ({ useExchangeScope: () => ({ scope: "perp" }) }));
vi.mock("@/stores/use-market-store", () => ({ useMarketActions: () => ({ setSelectedMarket: vi.fn() }) }));
vi.mock("@/stores/use-order-entry-store", () => ({ useOrderEntryActions: () => ({ setSide: vi.fn() }) }));
vi.mock("@/stores/use-global-settings-store", () => ({ getResolvedFormatLocale: () => "en-US" }));
vi.mock("@/components/trade/components/asset-badge", () => ({ AssetBadge: () => createElement("span", null, "BTC") }));
vi.mock("@/components/ui/scroll-area", () => ({ ScrollArea: ({ children }: { children: ReactNode }) => createElement("div", null, children), ScrollBar: () => null }));
vi.mock("@hypeterminal/ui", () => {
 const tag = (name: string) => ({ children, ...props }: { children: ReactNode }) => createElement(name, props, children);
 return { Table: tag("table"), TableBody: tag("tbody"), TableHeader: tag("thead"), TableRow: tag("tr"), TableHead: tag("th"), TableCell: tag("td"), Checkbox: () => createElement("input", { type: "checkbox" }) };
});
it("shows the requested open-order columns and preserves explicit cancellation", async () => {
 const node = document.createElement("div"); const root = createRoot(node);
 await act(async () => root.render(createElement(OrdersTab)));
 expect([...node.querySelectorAll("th")].map(n => n.textContent?.replace(/[⌄⌃]/g, ""))).toEqual(["Time", "Type", "Market", "Direction", "Size", "Original Size", "Order Value", "Price", "Reduce Only", "Trigger Conditions", "TP/SL", "Cancel All"]);
 expect(node.textContent).toContain("Close Long"); expect(node.textContent).toContain("200.00 USDC"); expect(state.cancel).not.toHaveBeenCalled();
 await act(async () => node.querySelector<HTMLButtonElement>('button[aria-label="Cancel order"]')!.click());
 expect(state.cancel).toHaveBeenCalledWith({ cancels: [{ a: 0, o: 123 }] }, expect.any(Object));
 await act(async () => root.unmount());
});
it("shows order IDs and filled size and filters order history", async () => {
 const node = document.createElement("div"); const root = createRoot(node);
 await act(async () => root.render(createElement(OrdersHistoryTab)));
 expect(node.textContent).toContain("Withdrawal");
 expect(node.querySelector("tbody tr")?.textContent).toContain("Withdrawal");
 expect(node.textContent).toContain("Filled Size"); expect(node.textContent).toContain("123"); expect(node.textContent).toContain("1.000");
 await act(async () => { const select = node.querySelector<HTMLSelectElement>('select[aria-label="Order history side filter"]')!; select.value = "B"; select.dispatchEvent(new Event("change", { bubbles: true })); });
 expect(node.textContent).toContain("No orders match these filters");

 await act(async () => { const select = node.querySelector<HTMLSelectElement>('select[aria-label="Order history side filter"]')!; select.value = ""; select.dispatchEvent(new Event("change", { bubbles: true })); const type = node.querySelector<HTMLSelectElement>('select[aria-label="Order history type filter"]')!; type.value = "Withdrawal"; type.dispatchEvent(new Event("change", { bubbles: true })); });
 expect(node.querySelectorAll("tbody tr")).toHaveLength(1);
 expect(node.textContent).toContain("Completed");
 expect(node.querySelector('a[href*="explorer.hyperunit.xyz"]')).not.toBeNull();
 await act(async () => root.unmount());
});
it("shows funding units, payment/rate precision, all-loaded view and side filtering", async () => {
 const node = document.createElement("div"); const root = createRoot(node);
 await act(async () => root.render(createElement(FundingTab)));
 expect(node.querySelectorAll("tbody tr")).toHaveLength(15);
 expect(node.textContent).toContain("-0.0001 USDC"); expect(node.textContent).toContain("0.0013%");
 await act(async () => [...node.querySelectorAll("button")].find(b => b.textContent === "View All")!.click());
 expect(node.querySelectorAll("tbody tr")).toHaveLength(16);
 await act(async () => { const select = node.querySelector<HTMLSelectElement>('select[aria-label="Funding history side filter"]')!; select.value = "Long"; select.dispatchEvent(new Event("change", { bubbles: true })); });
 expect(node.querySelectorAll("tbody tr")).toHaveLength(8);
 await act(async () => root.unmount());
});
