import { AccountTableToolbar } from "./account-table-toolbar";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@hypeterminal/ui";
import { t } from "@lingui/core/macro";
import { ArrowSquareOutIcon } from "@phosphor-icons/react";
import Big from "big.js";
import { useState } from "react";
import { useConnection } from "wagmi";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { MAX_HISTORY_ROWS } from "@/config/trade";
import { cn } from "@/lib/cn";
import { getHyperliquidTxUrl } from "@/lib/explorer";
import { formatDateTime, formatPrice, formatToken } from "@/lib/format";
import { useMarkets, useSubscription } from "@/lib/hyperliquid";
import { useExchangeScope } from "@/providers/exchange-scope";
import { useMarketActions } from "@/stores/use-market-store";
import { AssetBadge } from "../components/asset-badge";
import { Placeholder } from "./placeholder";
import {
 positionViewRowClass, positionViewBodyClass, positionViewCellClass, positionViewHeadClass,
 positionViewHeaderClass, positionsPanelTableShellClass, positionsPanelTabRootClass,
} from "./positions-panel-table-styles";

export function HistoryTab() {
 const { address, isConnected } = useConnection();
 const { scope } = useExchangeScope();
 const { setSelectedMarket } = useMarketActions();
 const markets = useMarkets();
 const [descending, setDescending] = useState(true);
 const [typeFilter, setTypeFilter] = useState(""); const [sideFilter, setSideFilter] = useState(""); const [roleFilter, setRoleFilter] = useState(""); const [marketFilter, setMarketFilter] = useState(""); const [aggregate, setAggregate] = useState(true);
 const { data: fillsEvent, status, error } = useSubscription("userFills", { user: address ?? "0x0", aggregateByTime: aggregate }, { enabled: isConnected && !!address });
 const allFills = fillsEvent?.fills ?? [];
 const fills = allFills.filter(fill => (!typeFilter || (fill.liquidation ? "Liquidated" : fill.dir) === typeFilter) && (!sideFilter || fill.side === sideFilter) && (!roleFilter || (fill.crossed ? "Taker" : "Maker") === roleFilter) && (!marketFilter || fill.coin === marketFilter)).slice().sort((a, b) => descending ? b.time - a.time : a.time - b.time).slice(0, MAX_HISTORY_ROWS);
 let placeholder = null;
 if (!isConnected) placeholder = <Placeholder>{t`Connect your wallet to view trade history.`}</Placeholder>;
 else if (status === "subscribing" || status === "idle") placeholder = <Placeholder>{t`Loading trade history...`}</Placeholder>;
 else if (status === "error") placeholder = <Placeholder variant="error">{t`Failed to load trade history.`}{error instanceof Error && <span className="mt-1 text-xs text-fg-muted">{error.message}</span>}</Placeholder>;
 else if (!fills.length) placeholder = <Placeholder>{allFills.length ? "No trades match these filters." : t`No fills found.`}</Placeholder>;
 const headings = [t`Time`, t`Market`, t`Direction`, t`Price`, t`Size`, t`Trade Value`, t`Fee`, t`Closed PNL`];
 return <div className={positionsPanelTabRootClass}>
  {isConnected && <AccountTableToolbar tab="history">
   {[{ label: "Type", value: typeFilter, set: setTypeFilter, values: [...new Set(allFills.map(fill => fill.liquidation ? "Liquidated" : fill.dir))] }, { label: "Side", value: sideFilter, set: setSideFilter, values: ["B", "A"] }, { label: "Role", value: roleFilter, set: setRoleFilter, values: ["Maker", "Taker"] }, { label: "Market", value: marketFilter, set: setMarketFilter, values: [...new Set(allFills.map(fill => fill.coin))] }].map(filter => <select key={filter.label} aria-label={`Trade history ${filter.label.toLowerCase()} filter`} value={filter.value} onChange={event => filter.set(event.target.value)} className="max-w-40 bg-surface py-1 text-fg outline-none"><option value="">{filter.label}</option>{filter.values.map(value => <option key={value} value={value}>{filter.label === "Side" ? value === "B" ? "Buy" : "Sell" : filter.label === "Market" ? markets.getMarket(value)?.pairName ?? value : value}</option>)}</select>)}
   <label className="inline-flex items-center gap-2 border-l border-stroke-weak pl-4 text-fg"><input type="checkbox" aria-label="Aggregate trade history" checked={aggregate} onChange={event => setAggregate(event.target.checked)} className="size-3.5 accent-brand" />Aggregate</label>
  </AccountTableToolbar>}
  <div className={positionsPanelTableShellClass}>
  {placeholder ?? <ScrollArea className="min-h-0 w-full flex-1">
   <Table className="table-auto min-w-max w-full">
    <TableHeader className={positionViewHeaderClass}><TableRow className="border-0">
     {headings.map((heading, index) => <TableHead key={heading} scope="col" size="dense" className={cn(positionViewHeadClass, "pr-6")} aria-sort={index === 0 ? descending ? "descending" : "ascending" : undefined}>
      {index === 0 ? <button type="button" onClick={() => setDescending(value => !value)} className="inline-flex items-center gap-1 hover:text-fg">{heading}<span aria-hidden="true">{descending ? "⌄" : "⌃"}</span></button> : index === 7 ? <span title="Realized PNL reported by Hyperliquid. Trading fees are shown separately." className="underline decoration-dashed underline-offset-4">{heading}</span> : heading}
     </TableHead>)}
    </TableRow></TableHeader>
    <TableBody className={positionViewBodyClass}>
     {fills.map(fill => {
      const market = markets.getMarket(fill.coin);
      const base = market?.kind === "spot" ? market.tokensInfo[0]?.displayName ?? market.shortName : market?.shortName ?? fill.coin.split(":").at(-1)!;
      const quote = market?.kind === "spot" ? market.tokensInfo[1]?.displayName ?? "USDC" : market?.kind === "builderPerp" ? market.quoteToken?.displayName ?? "USDC" : "USDC";
      const decimals = markets.getSzDecimals(fill.coin);
      const href = getHyperliquidTxUrl(fill.hash);
      const isBuy = fill.side === "B";
      const directionColor = isBuy ? "text-success" : "text-error";
      const pnl = Number(fill.closedPnl);
      const tradeValue = new Big(fill.px).times(fill.sz).toString();
      const time = formatDateTime(fill.time, { year: "numeric", month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false });
      return <TableRow key={`${fill.hash}-${fill.tid}`} className={positionViewRowClass}>
       <TableCell size="dense" className={cn(positionViewCellClass, "pr-6")}>
        {href ? <a href={href} target="_blank" rel="noopener noreferrer" title="View transaction on Hyperliquid" className="inline-flex items-center gap-1 hover:underline"><span>{time}</span><ArrowSquareOutIcon className="size-3 text-brand" /></a> : <span title="Transaction hash unavailable">{time}</span>}
       </TableCell>
       <TableCell size="dense" className={cn(positionViewCellClass, "pr-6")}><AssetBadge appearance="position" coin={fill.coin} side={isBuy ? "buy" : "sell"} onClick={() => setSelectedMarket(scope, fill.coin)} aria-label={t`Switch to ${fill.coin} market`} /></TableCell>
       <TableCell size="dense" className={cn(positionViewCellClass, directionColor, "pr-6")}>{fill.liquidation ? t`Liquidated` : fill.dir}</TableCell>
       <TableCell size="dense" className={cn(positionViewCellClass, "pr-6")}>{formatPrice(fill.px, { szDecimals: decimals, style: "decimal", compact: false })}</TableCell>
       <TableCell size="dense" className={cn(positionViewCellClass, "pr-6")}>{formatToken(fill.sz, { decimals, symbol: base, compact: false })}</TableCell>
       <TableCell size="dense" className={cn(positionViewCellClass, "pr-6")}>{formatToken(tradeValue, { decimals: 2, symbol: quote, compact: false })}</TableCell>
       <TableCell size="dense" className={cn(positionViewCellClass, "pr-6")}>{formatToken(fill.fee, { decimals: fill.feeToken === quote ? 2 : 8, symbol: fill.feeToken, compact: false })}</TableCell>
       <TableCell size="dense" className={cn(positionViewCellClass, pnl > 0 ? "text-success" : pnl < 0 ? "text-error" : "", "pr-6")}>
        <span className="inline-flex items-center gap-1">{formatToken(fill.closedPnl, { decimals: 2, symbol: quote, compact: false })}{href && pnl !== 0 && <a href={href} target="_blank" rel="noopener noreferrer" aria-label="View closed PNL transaction" className="text-brand hover:opacity-80"><ArrowSquareOutIcon className="size-3" /></a>}</span>
       </TableCell>
      </TableRow>;
     })}
    </TableBody>
   </Table><ScrollBar orientation="horizontal" />
  </ScrollArea>}
 </div></div>;
}
