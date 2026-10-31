import type { ISubscriptionTransport, L2BookWsEvent } from "@nktkas/hyperliquid";
import { expect, it, vi } from "vitest";
import { orderbookPayload, subscribeOrderbook } from "../../../../../packages/hl-react/src/internal/websocket/orderbook";
it("sends the fast option over the shared transport and keeps depth mode separate", async () => {
 let receive!: (event: CustomEvent<L2BookWsEvent>) => void;
 const subscription = { unsubscribe: vi.fn(async () => {}), failureSignal: new AbortController().signal };
 const transport = { subscribe: vi.fn(async (_channel, _payload, listener) => { receive = listener; return subscription; }) } as unknown as ISubscriptionTransport;
 const payload = orderbookPayload({ coin: "BTC", nSigFigs: 5, mantissa: 2 });
 const listener = vi.fn();
 expect(await subscribeOrderbook(transport, payload, listener)).toBe(subscription);
 expect(transport.subscribe).toHaveBeenCalledWith("l2Book", { type: "l2Book", coin: "BTC", nSigFigs: 5, mantissa: 2, fast: true }, expect.any(Function));
 expect(orderbookPayload({ coin: "BTC", fast: false }).fast).toBe(false);
 const push = (coin: string, time: number) => receive({ detail: { coin, time, levels: [[], []] } } as unknown as CustomEvent<L2BookWsEvent>);
 push("ETH", 200); push("BTC", 100); push("BTC", 99); push("BTC", 100); push("BTC", 101);
 expect(listener.mock.calls.map(([book]) => book.time)).toEqual([100, 101]);
});
