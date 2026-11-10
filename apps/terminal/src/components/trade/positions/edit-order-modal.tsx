import { Button, Modal, ModalContent, ModalFooter, ModalHeader, ModalPopup, ModalTitle } from "@hypeterminal/ui";
import Big from "big.js";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { NumberInput } from "@/components/ui/number-input";
import { useTradingAccount } from "@/hooks/use-trading-account";
import { getPositionDex } from "@/domain/market";
import { useExchange, useMarkets, useUserPositions } from "@/lib/hyperliquid";
import { assertAmendmentAccepted, buildOrderAmendment } from "@/lib/trade/amend-order";
import type { OpenOrder } from "@/lib/trade/open-orders";

export function EditOrderModal({ order, field, onClose }: { order: OpenOrder; field: "amount" | "value"; onClose: () => void }) {
 const { address } = useTradingAccount();
 const original = useRef({ address, sz: order.sz, price: order.limitPx, tif: order.tif });
 const market = useMarkets().getMarket(order.coin);
 const positions = useUserPositions();
 const { mutateAsync: modify, isPending } = useExchange("modify");
 const [mode, setMode] = useState(field);
 const [input, setInput] = useState(field === "amount" ? order.sz : new Big(order.sz).times(order.limitPx).toString());
 const [error, setError] = useState<string | null>(null);
 const busy = useRef(false);
 const quote = market?.kind === "spot" ? market.tokensInfo[1]?.displayName ?? "USDC" : market?.kind === "builderPerp" ? market.quoteToken?.displayName ?? "USDC" : "USDC";
 let amendment: ReturnType<typeof buildOrderAmendment> | undefined;
 let validationError: string | null = null;
 try {
  if (!market) throw new Error("Market metadata is unavailable.");
  if (address !== original.current.address || order.sz !== original.current.sz || order.limitPx !== original.current.price || order.tif !== original.current.tif) throw new Error("The order or account changed. Close and reopen the editor.");
  amendment = buildOrderAmendment(order, { assetId: market.assetId, szDecimals: market.szDecimals, input, mode, positionSize: positions.getPosition(order.coin, getPositionDex(market))?.szi });
 } catch (e) { validationError = e instanceof Error ? e.message : "Invalid order."; }
 async function save() {
  if (!amendment || validationError || busy.current) return;
  busy.current = true; setError(null);
  try { assertAmendmentAccepted(await modify(amendment.params)); toast.success("Order updated"); onClose(); }
  catch (e) { setError(e instanceof Error ? e.message : "Could not update order."); }
  finally { busy.current = false; }
 }
 function changeMode(next: "amount" | "value") {
  if (next === mode) return;
  if (amendment) setInput(next === "amount" ? amendment.amount : amendment.value);
  setMode(next); setError(null);
 }
 return <Modal open onOpenChange={open => { if (!open && !isPending) onClose(); }}>
  <ModalPopup size="sm"><ModalHeader><ModalTitle>Edit {order.coin} order</ModalTitle></ModalHeader>
   <ModalContent className="space-y-4">
    <p className="text-xs text-fg-muted">Editing the remaining order. Price stays {order.limitPx} {quote}; side, Reduce Only and time-in-force stay the same. Increasing size may require more margin and can change queue priority.</p>
    <div className="flex gap-2"><Button size="sm" variant={mode === "amount" ? "filled" : "outline"} onClick={() => changeMode("amount")} disabled={isPending}>Amount</Button><Button size="sm" variant={mode === "value" ? "filled" : "outline"} onClick={() => changeMode("value")} disabled={isPending}>Value</Button></div>
    <NumberInput autoFocus aria-label={mode === "amount" ? "New remaining amount" : "New remaining value"} label={mode === "amount" ? "Remaining amount" : `Remaining value (${quote})`} value={input} onChange={e => { setInput(e.target.value); setError(null); }} disabled={isPending} />
    {amendment && <p className="text-sm">{amendment.amount} {market?.shortName ?? order.coin} · {amendment.value} {quote}</p>}
    {(error || validationError) && <p role="alert" className="text-xs text-error">{error || validationError}</p>}
   </ModalContent>
   <ModalFooter><Button variant="outline" onClick={onClose} disabled={isPending}>Cancel</Button><Button onClick={() => void save()} disabled={!amendment || !!validationError || isPending}>{isPending ? "Updating…" : "Update order"}</Button></ModalFooter>
  </ModalPopup>
 </Modal>;
}
