// @vitest-environment jsdom
import { act, createElement, type ReactNode } from "react";
import { createRoot } from "react-dom/client";
import { expect, it, vi } from "vitest";
import { OrderbookPanel } from "@/components/trade/orderbook/orderbook-panel";
vi.mock("@lingui/core/macro", () => ({ t: (strings: TemplateStringsArray, ...values: unknown[]) => strings.reduce((text, part, i) => text + part + (values[i] ?? ""), "") }));
const state = vi.hoisted(() => ({ fast: true }));
vi.mock("@hypeterminal/hl-react", () => ({ useOrderbookSubscription: (params: { fast: boolean }) => {
 state.fast = params.fast;
 const levels = Array.from({ length: params.fast ? 5 : 20 }, (_, i) => ({ px: String(100 + i), sz: "1", n: 1 }));
 return { data: { levels: [levels, levels], spread: "1" }, status: "live" };
} }));
vi.mock("@/lib/hyperliquid", () => ({ useSelectedMarketInfo: () => ({ data: { name: "BTC", pairName: "BTC/USDC", kind: "perp", markPx: "100", szDecimals: 3 } }) }));
vi.mock("@/lib/performance/render-profile", () => ({ useRenderCommitTrack: () => {} }));
vi.mock("@/stores/use-global-settings-store", () => ({ getResolvedFormatLocale: () => "en-US", useGlobalSettings: () => ({ showOrderbookInQuote: false }), useGlobalSettingsActions: () => ({ setShowOrderbookInQuote: vi.fn() }) }));
vi.mock("@/components/trade/orderbook/trades-panel", () => ({ TradesPanel: () => null }));
vi.mock("@/components/trade/orderbook/orderbook-row", () => ({ OrderbookRow: ({ side }: { side: string }) => createElement("div", { "data-book-side": side }) }));
vi.mock("@hypeterminal/ui", () => {
 const Wrap = ({ children }: { children: ReactNode }) => createElement("div", null, children);
 return { Dropdown: () => null, Tabs: Wrap, TabsContent: Wrap, TabsList: Wrap, TabsTrigger: Wrap };
});
it("renders 5, 10, 15, and 20 rows per side rather than silently capping to the container height", async () => {
 const node = document.createElement("div"); document.body.append(node); const root = createRoot(node);
 await act(async () => root.render(createElement(OrderbookPanel)));
 const select = node.querySelector<HTMLSelectElement>('select[aria-label="Order book depth per side"]')!;
 for (const depth of [5, 10, 15, 20, 5]) {
  await act(async () => { select.value = String(depth); select.dispatchEvent(new Event("change", { bubbles: true })); });
  expect(node.querySelectorAll('[data-book-side="ask"]')).toHaveLength(depth);
  expect(node.querySelectorAll('[data-book-side="bid"]')).toHaveLength(depth);
  expect(state.fast).toBe(depth === 5);
 }
 await act(async () => root.unmount()); node.remove();
});
