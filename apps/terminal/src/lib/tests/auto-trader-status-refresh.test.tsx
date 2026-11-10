// @vitest-environment jsdom
import { act, createElement } from "react";
import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, expect, it, vi } from "vitest";
import { useAutoTraderStatus } from "@/lib/auto-trader/hooks";
const mocks=vi.hoisted(()=>({getStatus:vi.fn()}));
vi.mock("@/lib/auto-trader/api",()=>({getStatus:mocks.getStatus,getSignal:vi.fn(),signedCall:vi.fn()}));
vi.mock("@/hooks/use-trading-account",()=>({useTradingAccount:()=>({})}));
vi.mock("wagmi",()=>({useConnection:()=>({}),useWalletClient:()=>({})}));
vi.mock("@/lib/hyperliquid",()=>({useHyperliquid:()=>({})}));
let root:ReturnType<typeof createRoot>;let client:QueryClient;
afterEach(async()=>{await act(async()=>root?.unmount());client?.clear();vi.useRealTimers();vi.clearAllMocks();});
it("refreshes active account status every five seconds and exposes the newer cycle",async()=>{
 vi.useFakeTimers();
 mocks.getStatus.mockResolvedValueOnce({registered:true,state:"active",lastCycle:100}).mockResolvedValue({registered:true,state:"active",lastCycle:200});
 client=new QueryClient({defaultOptions:{queries:{retry:false}}});
 let lastCycle:number|undefined;
 function Probe(){lastCycle=useAutoTraderStatus("0x1212121212121212121212121212121212121212").data?.lastCycle;return null;}
 root=createRoot(document.createElement("div"));
 await act(async()=>{root.render(createElement(QueryClientProvider,{client},createElement(Probe)));});
 await act(async()=>{await vi.advanceTimersByTimeAsync(1);});
 expect(lastCycle).toBe(100);expect(mocks.getStatus).toHaveBeenCalledTimes(1);
 await act(async()=>{await vi.advanceTimersByTimeAsync(5001);});
 expect(mocks.getStatus).toHaveBeenCalledTimes(2);expect(lastCycle).toBe(200);
});
