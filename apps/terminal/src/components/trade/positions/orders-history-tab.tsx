import { useWithdrawalHistory, WithdrawalLinks } from "./withdrawal-history";
import { AccountTableToolbar } from "./account-table-toolbar";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@hypeterminal/ui";
import { t } from "@lingui/core/macro";
import { useState } from "react";
import { useConnection } from "wagmi";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { MAX_HISTORY_ROWS } from "@/config/trade";
import { cn } from "@/lib/cn";
import { formatDateTime, formatPrice, formatToken } from "@/lib/format";
import { useMarkets, useSubscription } from "@/lib/hyperliquid";
import { orderHistoryDetails } from "@/lib/trade/order-history";
import { useExchangeScope } from "@/providers/exchange-scope";
import { useMarketActions } from "@/stores/use-market-store";
import { AssetBadge } from "../components/asset-badge";
import { Placeholder } from "./placeholder";
import { positionViewRowClass, positionViewBodyClass, positionViewCellClass, positionViewHeadClass, positionsPanelTableLayoutClass, positionViewHeaderClass, positionsPanelTableShellClass, positionsPanelTabRootClass } from "./positions-panel-table-styles";

export function OrdersHistoryTab() {
 const { address, isConnected } = useConnection();
 const { scope } = useExchangeScope();
 const { setSelectedMarket } = useMarketActions();
 const markets = useMarkets();
 const [type, setType] = useState(""); const [side, setSide] = useState(""); const [coin, setCoin] = useState(""); const [descending, setDescending] = useState(true);
 const { data, status, error } = useSubscription("userHistoricalOrders", { user: address ?? "0x0" }, { enabled: isConnected && !!address });
 const withdrawalHistory = useWithdrawalHistory(isConnected ? address : undefined);
 const all = data?.orderHistory ?? [];
 const orders = all.filter(e => (!type || e.order.orderType === type) && (!side || e.order.side === side) && (!coin || e.order.coin === coin)).slice().sort((a, b) => descending ? b.statusTimestamp - a.statusTimestamp : a.statusTimestamp - b.statusTimestamp).slice(0, MAX_HISTORY_ROWS);
 const withdrawals = withdrawalHistory.rows.filter(row => (!type || type === "Withdrawal") && !side && (!coin || coin === row.asset));
 const timeline = [...orders.map(entry => ({ kind: "order" as const, time: entry.statusTimestamp, entry })), ...withdrawals.map(row => ({ kind: "withdrawal" as const, time: row.time, row }))].sort((a,b) => descending ? b.time-a.time : a.time-b.time).slice(0,MAX_HISTORY_ROWS);
 const filters = [{ label: "Type", value: type, set: setType, values: [...new Set([...all.map(e => e.order.orderType), "Withdrawal"])] }, { label: "Side", value: side, set: setSide, values: ["B", "A"] }, { label: "Market", value: coin, set: setCoin, values: [...new Set([...all.map(e => e.order.coin), ...withdrawalHistory.rows.map(row => row.asset)])] }];
 let placeholder = null;
 if (!isConnected) placeholder = <Placeholder>{t`Connect your wallet to view order history.`}</Placeholder>;
 else if (!timeline.length && (status === "subscribing" || status === "idle" || withdrawalHistory.loading)) placeholder = <Placeholder>{t`Loading order history...`}</Placeholder>;
 else if (!timeline.length && status === "error") placeholder = <Placeholder variant="error">{t`Failed to load order history.`}{error instanceof Error && <span>{error.message}</span>}</Placeholder>;
 else if (!timeline.length) placeholder = <Placeholder>{all.length || withdrawalHistory.rows.length ? "No orders match these filters." : "No order or withdrawal history found."}</Placeholder>;
 const headings = ["Time", "Type", "Market", "Direction", "Size", "Filled Size", "Order Value", "Price", "Reduce Only", "Trigger Conditions", "TP/SL", "Status", "Order ID / Track"];
 return <div className={positionsPanelTabRootClass}>
  {isConnected && <AccountTableToolbar tab="orders-history">{filters.map(f => <label key={f.label} className="text-fg-muted"><span className="sr-only">{f.label}</span><select aria-label={`Order history ${f.label.toLowerCase()} filter`} value={f.value} onChange={e => f.set(e.target.value)} className="bg-surface py-1 text-fg outline-none"><option value="">{f.label}</option>{f.values.map(v => <option key={v} value={v}>{f.label === "Side" ? v === "B" ? "Buy" : "Sell" : f.label === "Market" ? markets.getMarket(v)?.pairName ?? v : v}</option>)}</select></label>)}</AccountTableToolbar>}
  <div className={positionsPanelTableShellClass}>{placeholder ?? <ScrollArea className="min-h-0 w-full flex-1"><Table className={positionsPanelTableLayoutClass}>
   <TableHeader className={positionViewHeaderClass}><TableRow className="border-0">{headings.map((heading, i) => <TableHead key={heading} scope="col" size="dense" className={cn(positionViewHeadClass, "px-1")} aria-sort={i === 0 ? descending ? "descending" : "ascending" : undefined}>{i === 0 ? <button type="button" onClick={() => setDescending(v => !v)} className="inline-flex gap-1 hover:text-fg">{heading}<span aria-hidden="true">{descending ? "⌄" : "⌃"}</span></button> : heading}</TableHead>)}</TableRow></TableHeader>
   <TableBody className={positionViewBodyClass}>{timeline.map(item => {
    if (item.kind === "withdrawal") {
     const row = item.row; const cell = cn(positionViewCellClass, "px-1");
     return <TableRow key={`withdrawal:${row.id}`} className={positionViewRowClass}>
      <TableCell size="dense" className={cell}>{formatDateTime(row.time, { year: "numeric", month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false })}</TableCell>
      <TableCell size="dense" className={cell}>Withdrawal</TableCell><TableCell size="dense" className={cn(cell,"font-semibold")}>{row.asset}</TableCell>
      <TableCell size="dense" className={cell}><span title={row.destination || undefined}>To {row.chain}{row.destination ? ` · ${row.destination.slice(0,6)}…${row.destination.slice(-4)}` : ""}</span></TableCell>
      <TableCell size="dense" className={cell}>{row.amount}</TableCell><TableCell size="dense" className={cell}>--</TableCell><TableCell size="dense" className={cell}>--</TableCell><TableCell size="dense" className={cell}>--</TableCell><TableCell size="dense" className={cell}>--</TableCell><TableCell size="dense" className={cell}>N/A</TableCell><TableCell size="dense" className={cell}>--</TableCell>
      <TableCell size="dense" className={cell}>{row.status}</TableCell><TableCell size="dense" className={cell}><WithdrawalLinks row={row} /></TableCell>
     </TableRow>;
    }
    const entry = item.entry;
    const order = entry.order; const market = markets.getMarket(order.coin); const details = orderHistoryDetails(entry, market?.kind === "spot");
    const decimals = markets.getSzDecimals(order.coin); const buy = order.side === "B";
    const quote = market?.kind === "spot" ? market.tokensInfo[1]?.displayName ?? "USDC" : market?.kind === "builderPerp" ? market.quoteToken?.displayName ?? "USDC" : "USDC";
    const cell = cn(positionViewCellClass, "px-1");
    return <TableRow key={`${order.oid}:${entry.statusTimestamp}:${entry.status}`} className={positionViewRowClass}>
     <TableCell size="dense" className={cell}>{formatDateTime(entry.statusTimestamp, { year: "numeric", month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false })}</TableCell>
     <TableCell size="dense" className={cell}>{order.orderType}</TableCell>
     <TableCell size="dense" className={cell}><AssetBadge appearance="position" coin={order.coin} side={buy ? "buy" : "sell"} onClick={() => setSelectedMarket(scope, order.coin)} aria-label={`Switch to ${order.coin} market`} /></TableCell>
     <TableCell size="dense" className={cn(cell, buy ? "text-success" : "text-error")}>{details.direction}</TableCell>
     <TableCell size="dense" className={cell}>{details.size ? formatToken(details.size, decimals) : "--"}</TableCell>
     <TableCell size="dense" className={cell}>{details.filled ? formatToken(details.filled, decimals) : "--"}</TableCell>
     <TableCell size="dense" className={cell}>{details.market && details.size ? "Market" : details.value ? formatToken(details.value, { decimals: 2, symbol: quote, compact: false }) : "--"}</TableCell>
     <TableCell size="dense" className={cell}>{details.market ? <span title="Executes at the available market price." className="underline decoration-dashed underline-offset-4">Market</span> : formatPrice(order.limitPx, { szDecimals: decimals, style: "decimal", compact: false })}</TableCell>
     <TableCell size="dense" className={cell}>{market?.kind === "spot" ? "--" : order.reduceOnly ? "Yes" : "No"}</TableCell>
     <TableCell size="dense" className={cell}>{details.trigger}</TableCell><TableCell size="dense" className={cell}>{details.tpsl}</TableCell>
     <TableCell size="dense" className={cn(cell, "capitalize")}>{entry.status.replace(/([a-z])([A-Z])/g, "$1 $2")}</TableCell><TableCell size="dense" className={cell}>{order.oid}</TableCell>
    </TableRow>;
   })}</TableBody>
  </Table><ScrollBar orientation="horizontal" /></ScrollArea>}</div>
  {isConnected && withdrawalHistory.error && <button type="button" className="px-1.5 py-1 text-left text-xs text-fg-muted" onClick={() => void withdrawalHistory.refresh()}>Withdrawal history unavailable · Retry</button>}
 </div>;
}
