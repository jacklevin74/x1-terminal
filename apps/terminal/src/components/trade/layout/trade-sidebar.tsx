import { useLayoutEffect, useRef } from "react";
import { useSelectedMarketInfo } from "@/lib/hyperliquid";
import { AccountPanel } from "../tradebox/account-panel";
import { TradePanel } from "../tradebox/trade-panel";

interface Props {
 onDesiredHeightChange?: (heightPx: number) => void;
}

export function TradeSidebar({ onDesiredHeightChange }: Props) {
 const tradeRef = useRef<HTMLDivElement>(null);
 const accountRef = useRef<HTMLDivElement>(null);
 const { data: market } = useSelectedMarketInfo();
 const formKey = market?.name ?? "default";

 useLayoutEffect(() => {
  const trade = tradeRef.current;
  const account = accountRef.current;
  if (!trade || !account) return;
  function measure() {
   onDesiredHeightChange?.(Math.ceil(trade!.getBoundingClientRect().height + account!.getBoundingClientRect().height));
  }
  measure();
  const observer = typeof ResizeObserver !== "undefined" ? new ResizeObserver(measure) : null;
  observer?.observe(trade);
  observer?.observe(account);
  window.addEventListener("resize", measure);
  return () => { observer?.disconnect(); window.removeEventListener("resize", measure); };
 }, [onDesiredHeightChange]);

 return <div className="flex h-full min-h-0 flex-col bg-surface">
  <div ref={tradeRef} className="shrink-0"><TradePanel key={formKey} /></div>
  <div className="flex-1" />
  <div ref={accountRef} className="shrink-0"><AccountPanel /></div>
 </div>;
}
