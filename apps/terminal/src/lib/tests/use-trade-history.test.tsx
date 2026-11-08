// @vitest-environment jsdom
import { act, createElement } from "react";
import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, expect, it, vi } from "vitest";
import { useTradeHistory } from "@/hooks/use-trade-history";
const state = vi.hoisted(() => ({ address: "0x111", network: "mainnet", request: vi.fn(), live: undefined as any }));
vi.mock("@/hooks/use-trading-account", () => ({ useTradingAccount: () => ({ address: state.address, isConnected: true }) }));
vi.mock("@/lib/network", () => ({ getNetwork: () => state.network }));
vi.mock("@/lib/hyperliquid", () => ({ useHyperliquid: () => ({ info: { userFillsByTime: state.request } }), useSubscription: () => ({ data: state.live }) }));
let root: ReturnType<typeof createRoot>;
let client: QueryClient;
afterEach(async () => { await act(async () => root?.unmount()); client?.clear(); vi.clearAllMocks(); state.live = undefined; state.address = "0x111"; });
it("uses account-scoped cached data immediately, merges live fills, and isolates account switches", async () => {
 client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
 const now = Date.now();
 const row = { coin: "BTC", tid: 1, hash: "0xab", time: now };
 client.setQueryData(["persisted", "trade-history-24h-v1", "mainnet", "0x111", false], { fills: [row], limited: false });
 state.live = { user: "0x111", fills: [row, { ...row, tid: 2 }] };
 state.request.mockResolvedValue([]);
 let result: ReturnType<typeof useTradeHistory>;
 function Probe() { result = useTradeHistory(); return null; }
 root = createRoot(document.createElement("div"));
 await act(async () => root.render(createElement(QueryClientProvider, { client }, createElement(Probe))));
 expect(result!.fills.map(fill => fill.tid)).toEqual([1, 2]);
 expect(state.request).not.toHaveBeenCalled();
 state.address = "0x222";
 await act(async () => { root.render(createElement(QueryClientProvider, { client }, createElement(Probe))); await new Promise(resolve => setTimeout(resolve, 20)); });
 expect(result!.fills).toHaveLength(0);
 expect(state.request.mock.calls[0][0].user).toBe("0x222");
 expect(state.request.mock.calls[0][0].aggregateByTime).toBe(false);
});

it("refreshes only the overlapping tail of a complete cached day", async () => {
 client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
 const now = Date.now();
 const through = now - 120_000;
 const row = { coin: "BTC", tid: 1, hash: "0xab", time: now - 600_000 };
 client.setQueryData(["persisted", "trade-history-24h-v1", "mainnet", "0x111", false], { fills: [row], limited: false, from: now - 86_400_000 - 120_000, through }, { updatedAt: now - 120_000 });
 state.request.mockResolvedValue([{ ...row, tid: 2, time: now }]);
 let result: ReturnType<typeof useTradeHistory>;
 function Probe() { result = useTradeHistory(); return null; }
 root = createRoot(document.createElement("div"));
 await act(async () => { root.render(createElement(QueryClientProvider, { client }, createElement(Probe))); await new Promise(resolve => setTimeout(resolve, 20)); });
 expect(state.request.mock.calls[0][0].startTime).toBe(through - 60_000);
 await act(async () => { await new Promise(resolve => setTimeout(resolve, 20)); });
 expect(result!.fills.map(fill => fill.tid)).toEqual([2, 1]);
});
