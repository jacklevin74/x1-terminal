import type { ISubscriptionTransport, L2BookWsEvent, L2BookWsParameters } from "@nktkas/hyperliquid";
export function orderbookPayload(params: L2BookWsParameters & { fast?: boolean }) {
 return { type: "l2Book" as const, coin: params.coin, nSigFigs: params.nSigFigs ?? null, mantissa: params.mantissa ?? null, fast: params.fast ?? true };
}
export function subscribeOrderbook(transport: ISubscriptionTransport, payload: ReturnType<typeof orderbookPayload>, listener: (book: L2BookWsEvent) => void) {
 let lastTime = -Infinity;
 return transport.subscribe<L2BookWsEvent>("l2Book", payload, event => {
  const book = event.detail;
  if (book.coin !== payload.coin || !Number.isFinite(book.time) || book.time <= lastTime) return;
  lastTime = book.time;
  listener(book);
 });
}
