import { orderbookPayload, subscribeOrderbook } from "../internal/websocket/orderbook";
import type { L2BookWsEvent, L2BookWsParameters } from "@nktkas/hyperliquid";
import { serializeKey, subscriptionKeys } from "../query/keys";
import { useSubscriptionTransport } from "./useTransport";
import { useSub } from "./utils/useSub";

export interface OrderbookSubscriptionParams extends L2BookWsParameters { fast?: boolean }
/** The installed SDK strips `fast`; use its shared transport to preserve this API option. */
export function useOrderbookSubscription(params: OrderbookSubscriptionParams, enabled = true) {
 const transport = useSubscriptionTransport();
 const payload = orderbookPayload(params);
 const key = serializeKey(subscriptionKeys.method("l2Book", payload));
 return useSub<L2BookWsEvent>(key, listener => subscribeOrderbook(transport, payload, listener), { enabled, throttleMs: 0 });
}
