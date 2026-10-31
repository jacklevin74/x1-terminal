// @vitest-environment jsdom
import { act, createElement, type ReactNode } from "react";
import { createRoot } from "react-dom/client";
import { expect, it, vi } from "vitest";
import { HistoryTab } from "@/components/trade/positions/history-tab";
const hash = `0x${"ab".repeat(32)}`;
vi.mock("@lingui/core/macro", () => ({ t: (strings: TemplateStringsArray, ...values: unknown[]) => strings.reduce((s, part, i) => s + part + (values[i] ?? ""), "") }));
vi.mock("wagmi", () => ({ useConnection: () => ({ address: `0x${"cd".repeat(20)}`, isConnected: true }) }));
vi.mock("@/lib/hyperliquid", () => ({ useSubscription: () => ({ status: "live", data: { fills: [
 { coin: "BTC", crossed: true, side: "B", dir: "Open Long", time: 1_800_000_000_000, px: "100.25", sz: "2", fee: "0.10", feeToken: "USDC", closedPnl: "0", tid: 1, hash: `0x${"ab".repeat(32)}` },
 { coin: "BTC", crossed: false, side: "A", dir: "Close Long", time: 1_800_000_001_000, px: "101", sz: "1", fee: "0.05", feeToken: "USDC", closedPnl: "0.75", tid: 2, hash: `0x${"cd".repeat(32)}` },
 ] } }), useMarkets: () => ({ getMarket: () => ({ kind: "perp", shortName: "BTC" }), getSzDecimals: () => 3 }) }));
vi.mock("@/providers/exchange-scope", () => ({ useExchangeScope: () => ({ scope: "perp" }) }));
vi.mock("@/stores/use-market-store", () => ({ useMarketActions: () => ({ setSelectedMarket: vi.fn() }) }));
vi.mock("@/stores/use-global-settings-store", () => ({ getResolvedFormatLocale: () => "en-US" }));
vi.mock("@/lib/network", () => ({ isTestnet: () => false }));
vi.mock("@/components/trade/components/asset-badge", () => ({ AssetBadge: () => createElement("span", null, "BTC") }));
vi.mock("@/components/ui/scroll-area", () => ({ ScrollArea: ({ children }: { children: ReactNode }) => createElement("div", null, children), ScrollBar: () => null }));
vi.mock("@hypeterminal/ui", () => {
 const tag = (name: string) => ({ children, ...props }: { children: ReactNode }) => createElement(name, props, children);
 return { Table: tag("table"), TableBody: tag("tbody"), TableHeader: tag("thead"), TableRow: tag("tr"), TableHead: tag("th"), TableCell: tag("td") };
});
it("matches the requested columns, displays trade value and units, and sorts time", async () => {
 const node = document.createElement("div"); document.body.append(node); const root = createRoot(node);
 await act(async () => root.render(createElement(HistoryTab)));
 expect([...node.querySelectorAll("th")].map(n => n.textContent?.replace(/[⌄⌃]/g, ""))).toEqual(["Time", "Market", "Direction", "Price", "Size", "Trade Value", "Fee", "Closed PNL"]);
 expect(node.textContent).toContain("200.50 USDC"); expect(node.textContent).toContain("2.000 BTC");
 expect(node.querySelector("tbody tr")?.textContent).toContain("Close Long");
 await act(async () => node.querySelector("th button")!.dispatchEvent(new MouseEvent("click", { bubbles: true })));
 expect(node.querySelector("tbody tr")?.textContent).toContain("Open Long");
 expect(node.querySelector("tbody tr a")?.getAttribute("href")).toBe(`https://app.hyperliquid.xyz/explorer/tx/${hash}`);
 await act(async () => { const select = node.querySelector<HTMLSelectElement>('select[aria-label="Trade history role filter"]')!; select.value = "Maker"; select.dispatchEvent(new Event("change", { bubbles: true })); });
 expect(node.querySelectorAll("tbody tr")).toHaveLength(1);
 expect(node.querySelector("tbody tr")?.textContent).toContain("Close Long");
 await act(async () => root.unmount()); node.remove();
});
