import { AccountTableToolbar } from "./account-table-toolbar";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@hypeterminal/ui";
import { t } from "@lingui/core/macro";
import { useState } from "react";
import { useConnection } from "wagmi";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { cn } from "@/lib/cn";
import { formatDateTime, formatPercent, formatToken } from "@/lib/format";
import { useMarkets, useSubscription } from "@/lib/hyperliquid";
import { downloadHistoryCsv } from "@/lib/trade/history-csv";
import { useExchangeScope } from "@/providers/exchange-scope";
import { useMarketActions } from "@/stores/use-market-store";
import { AssetBadge } from "../components/asset-badge";
import { Placeholder } from "./placeholder";
import { positionViewRowClass, positionViewBodyClass, positionViewCellClass, positionViewHeadClass, positionsPanelTableLayoutClass, positionViewHeaderClass, positionsPanelTableShellClass, positionsPanelTabRootClass } from "./positions-panel-table-styles";

export function FundingTab() {
 const { address, isConnected } = useConnection(); const { scope } = useExchangeScope(); const { setSelectedMarket } = useMarketActions(); const markets = useMarkets();
 const [side, setSide] = useState(""); const [coin, setCoin] = useState(""); const [descending, setDescending] = useState(true); const [viewAll, setViewAll] = useState(false); const [exportError, setExportError] = useState<string | null>(null);
 const { data, status, error } = useSubscription("userFundings", { user: address ?? "0x0" }, { enabled: isConnected && !!address });
 const all = data?.fundings ?? [];
 const updates = all.filter(f => (!coin || f.coin === coin) && (!side || (side === "Long" ? Number(f.szi) > 0 : Number(f.szi) < 0))).slice().sort((a, b) => descending ? b.time - a.time : a.time - b.time);
 const visible = viewAll ? updates : updates.slice(0, 15);
 const coins = [...new Set(all.map(f => f.coin))];
 const currency = (name: string) => { const market = markets.getMarket(name); return market?.kind === "builderPerp" ? market.quoteToken?.displayName ?? "USDC" : "USDC"; };
 function exportCsv() {
  setExportError(null);
  try { downloadHistoryCsv([["Time (UTC)", "Market", "Size", "Side", "Payment", "Currency", "Rate"], ...updates.map(f => [new Date(f.time).toISOString(), f.coin, f.szi.replace(/^-/, ""), Number(f.szi) > 0 ? "Long" : Number(f.szi) < 0 ? "Short" : "Flat", f.usdc, currency(f.coin), f.fundingRate])], `funding-history-${address}.csv`); }
  catch { setExportError("Could not export funding history. Try again."); }
 }
 let placeholder = null;
 if (!isConnected) placeholder = <Placeholder>{t`Connect your wallet to view funding payments.`}</Placeholder>;
 else if (status === "subscribing" || status === "idle") placeholder = <Placeholder>{t`Loading funding history...`}</Placeholder>;
 else if (status === "error") placeholder = <Placeholder variant="error">{t`Failed to load funding history.`}{error instanceof Error && <span>{error.message}</span>}</Placeholder>;
 else if (!updates.length) placeholder = <Placeholder>{all.length ? "No funding payments match these filters." : t`No funding payments found.`}</Placeholder>;
 return <div className={positionsPanelTabRootClass}>
  {isConnected && <AccountTableToolbar tab="funding">
   <select aria-label="Funding history side filter" value={side} onChange={e => { setSide(e.target.value); setViewAll(false); }} className="bg-surface py-1 text-fg outline-none"><option value="">Side</option><option>Long</option><option>Short</option></select>
   <select aria-label="Funding history market filter" value={coin} onChange={e => { setCoin(e.target.value); setViewAll(false); }} className="bg-surface py-1 text-fg outline-none"><option value="">Market</option>{coins.map(c => <option key={c} value={c}>{markets.getMarket(c)?.shortName ?? c}</option>)}</select>
  </AccountTableToolbar>}
  <div className={positionsPanelTableShellClass}>{placeholder ?? <ScrollArea className="min-h-0 w-full flex-1"><Table className={positionsPanelTableLayoutClass}>
   <TableHeader className={positionViewHeaderClass}><TableRow className="border-0">{["Time", "Market", "Size", "Side", "Payment", "Rate"].map((heading, i) => <TableHead key={heading} scope="col" size="dense" className={cn(positionViewHeadClass, "pr-8")} aria-sort={i === 0 ? descending ? "descending" : "ascending" : undefined}>{i === 0 ? <button type="button" onClick={() => setDescending(v => !v)} className="inline-flex gap-1 hover:text-fg">{heading}<span aria-hidden="true">{descending ? "⌄" : "⌃"}</span></button> : heading}</TableHead>)}</TableRow></TableHeader>
   <TableBody className={positionViewBodyClass}>{visible.map(f => {
    const long = Number(f.szi) > 0; const size = Math.abs(Number(f.szi)); const market = markets.getMarket(f.coin); const color = long ? "text-success" : "text-error"; const cell = cn(positionViewCellClass, "pr-8");
    return <TableRow key={`${f.time}:${f.coin}`} className={positionViewRowClass}>
     <TableCell size="dense" className={cell}>{formatDateTime(f.time, { year: "numeric", month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false })}</TableCell>
     <TableCell size="dense" className={cell}><AssetBadge appearance="position" coin={f.coin} side={long ? "buy" : "sell"} onClick={() => setSelectedMarket(scope, f.coin)} aria-label={`Switch to ${f.coin} market`} /></TableCell>
     <TableCell size="dense" className={cell}>{formatToken(size, { decimals: markets.getSzDecimals(f.coin), symbol: market?.shortName ?? f.coin.split(":").at(-1), compact: false })}</TableCell>
     <TableCell size="dense" className={cn(cell, size ? color : "text-fg-muted")}>{size ? long ? "Long" : "Short" : "Flat"}</TableCell>
     <TableCell size="dense" className={cn(cell, Number(f.usdc) > 0 ? "text-success" : Number(f.usdc) < 0 ? "text-error" : "")}>{formatToken(f.usdc, { decimals: 4, symbol: currency(f.coin), compact: false })}</TableCell>
     <TableCell size="dense" className={cell}>{formatPercent(f.fundingRate, { decimals: 4, signDisplay: "auto" })}</TableCell>
    </TableRow>;
   })}</TableBody>
  </Table><ScrollBar orientation="horizontal" /></ScrollArea>}</div>
  {isConnected && updates.length > 0 && <div className="flex shrink-0 flex-wrap items-center gap-3 px-1.5 py-1 text-xs text-brand"><button type="button" title="Show all loaded funding records" onClick={() => setViewAll(v => !v)} className="hover:underline">{viewAll ? "Show Less" : "View All"}</button><button type="button" onClick={exportCsv} className="hover:underline">Export as CSV</button><span className="text-fg-muted">{visible.length} / {updates.length} loaded</span></div>}
  {exportError && <p role="alert" className="px-1.5 text-xs text-error">{exportError}</p>}
 </div>;
}
