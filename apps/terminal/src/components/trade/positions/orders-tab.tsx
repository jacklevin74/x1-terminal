import { AccountTableToolbar } from "./account-table-toolbar";
import {
	Checkbox,
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@hypeterminal/ui";
import { t } from "@lingui/core/macro";
import { useState } from "react";
import { useConnection } from "wagmi";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { HL_ALL_DEXS } from "@/config/app";
import { cn } from "@/lib/cn";
import { formatDateTime, formatPrice, formatToken } from "@/lib/format";
import { useExchange, useMarkets, useSubscription } from "@/lib/hyperliquid";
import {
	getOrderValue,
	isClosePositionOrder,
	type OpenOrder,
} from "@/lib/trade/open-orders";
import type { Side } from "@/lib/trade/types";
import { useExchangeScope } from "@/providers/exchange-scope";
import { useMarketActions } from "@/stores/use-market-store";
import { useOrderEntryActions } from "@/stores/use-order-entry-store";
import { AssetBadge } from "../components/asset-badge";
import { Placeholder } from "./placeholder";
import { positionViewRowClass, positionViewBodyClass, positionViewCellClass, positionViewHeadClass, positionsPanelTableLayoutClass, positionViewHeaderClass, positionsPanelTableShellClass, positionsPanelTabRootClass } from "./positions-panel-table-styles";
import { orderHistoryDetails } from "@/lib/trade/order-history";

type CancelScope = "row" | "selected" | "all";

export function OrdersTab() {
	const { address, isConnected } = useConnection();
	const { scope } = useExchangeScope();
	const { setSelectedMarket } = useMarketActions();
	const { setSide } = useOrderEntryActions();

	function handleSelectMarket(name: string, side: Side) {
		setSelectedMarket(scope, name);
		setSide(side);
	}
	const {
		data: openOrdersEvent,
		status,
		error,
	} = useSubscription(
		"openOrders",
		{ user: address ?? "0x0", dex: HL_ALL_DEXS },
		{ enabled: isConnected && !!address },
	);
	const markets = useMarkets();
	const [typeFilter, setTypeFilter] = useState("");
 const [sideFilter, setSideFilter] = useState("");
 const [marketFilter, setMarketFilter] = useState("");
 const [sortValue, setSortValue] = useState(false);
 const [descendingValue, setDescendingValue] = useState(true);
 const [viewAll, setViewAll] = useState(false);
 const [selectedOrderIds, setSelectedOrderIds] = useState<Set<number>>(() => new Set());
	const [cancellingOids, setCancellingOids] = useState<Set<number>>(() => new Set());
	const [pendingScopes, setPendingScopes] = useState<Set<CancelScope>>(() => new Set());

	const { mutate: cancelOrders, error: cancelError, reset: resetCancelError } = useExchange("cancel");

	const openOrders = openOrdersEvent?.orders ?? [];

	const openIds = new Set(openOrders.map((order) => order.oid));
	const validSelectedIds = new Set<number>();
	for (const id of selectedOrderIds) {
		if (openIds.has(id)) validSelectedIds.add(id);
	}

	const selectedCount = validSelectedIds.size;
	const allSelected = selectedCount > 0 && selectedCount === openOrders.length;
	const someSelected = selectedCount > 0 && selectedCount < openOrders.length;

	function handleToggleAll(value: boolean | "indeterminate") {
		if (value === true) {
			setSelectedOrderIds(new Set(openOrders.map((order) => order.oid)));
		} else {
			setSelectedOrderIds(new Set());
		}
	}

	function handleToggleOrder(orderId: number, value: boolean | "indeterminate") {
		setSelectedOrderIds((prev) => {
			const next = new Set(prev);
			if (value === true) {
				next.add(orderId);
			} else {
				next.delete(orderId);
			}
			return next;
		});
	}

	function handleCancel(ordersToCancel: OpenOrder[], nextScope: CancelScope) {
		if (ordersToCancel.length === 0) return;

		const fresh = ordersToCancel.filter((order) => !cancellingOids.has(order.oid));
		if (fresh.length === 0) return;

		const cancels = fresh.reduce<{ a: number; o: number }[]>((acc, order) => {
			const assetId = markets.getAssetId(order.coin);
			if (typeof assetId !== "number") return acc;
			acc.push({ a: assetId, o: order.oid });
			return acc;
		}, []);

		if (cancels.length === 0) return;

		const oids = fresh.map((order) => order.oid);
		setCancellingOids((prev) => {
			const next = new Set(prev);
			for (const oid of oids) next.add(oid);
			return next;
		});
		setPendingScopes((prev) => {
			const next = new Set(prev);
			next.add(nextScope);
			return next;
		});
		resetCancelError();
		cancelOrders(
			{ cancels },
			{
				onSuccess: () => {
					setSelectedOrderIds((prev) => {
						const next = new Set(prev);
						for (const order of fresh) {
							next.delete(order.oid);
						}
						return next;
					});
				},
				onSettled: () => {
					setCancellingOids((prev) => {
						const next = new Set(prev);
						for (const oid of oids) next.delete(oid);
						return next;
					});
					setPendingScopes((prev) => {
						const next = new Set(prev);
						next.delete(nextScope);
						return next;
					});
				},
			},
		);
	}

	function handleCancelRow(ordersToCancel: OpenOrder[]) {
		handleCancel(ordersToCancel, "row");
	}

	function handleCancelSelected() {
		const ordersToCancel = openOrders.filter((order) => validSelectedIds.has(order.oid));
		handleCancel(ordersToCancel, "selected");
	}

	function handleCancelAll() {
		handleCancel(openOrders, "all");
	}

	const disableCancelSelected = pendingScopes.has("selected") || selectedCount === 0;
	const disableCancelAll = pendingScopes.has("all") || openOrders.length === 0;
	const actionError = cancelError?.message;

	function renderPlaceholder() {
		if (!isConnected) return <Placeholder>{t`Connect your wallet to view open orders.`}</Placeholder>;
		if (status === "subscribing" || status === "idle") return <Placeholder>{t`Loading open orders...`}</Placeholder>;
		if (status === "error") {
			return (
				<Placeholder variant="error">
					<span>{t`Failed to load open orders.`}</span>
					{error instanceof Error && <span className="mt-1 text-xs text-fg-muted">{error.message}</span>}
				</Placeholder>
			);
		}
		if (openOrders.length === 0) return <Placeholder>{t`No open orders.`}</Placeholder>;
		return null;
	}

	const placeholder = renderPlaceholder();

 const filteredOrders = openOrders.filter(order => (!typeFilter || order.orderType === typeFilter) && (!sideFilter || order.side === sideFilter) && (!marketFilter || order.coin === marketFilter)).slice().sort((a, b) => sortValue ? (descendingValue ? -1 : 1) * ((getOrderValue(a) ?? 0) - (getOrderValue(b) ?? 0)) : b.timestamp - a.timestamp);
 const visibleOrders = viewAll ? filteredOrders : filteredOrders.slice(0, 15);
 const headings = ["Time", "Type", "Market", "Direction", "Size", "Original Size", "Order Value", "Price", "Reduce Only", "Trigger Conditions", "TP/SL", "Cancel All"];
 return <div className={positionsPanelTabRootClass}>
  {isConnected && <AccountTableToolbar tab="orders">
   {selectedCount > 0 && <button type="button" className="text-brand disabled:opacity-40" disabled={disableCancelSelected} onClick={handleCancelSelected}>{pendingScopes.has("selected") ? "Canceling…" : `Cancel selected (${selectedCount})`}</button>}
   {[{ label: "Type", value: typeFilter, set: setTypeFilter, values: [...new Set(openOrders.map(o => o.orderType))] }, { label: "Side", value: sideFilter, set: setSideFilter, values: ["B", "A"] }, { label: "Market", value: marketFilter, set: setMarketFilter, values: [...new Set(openOrders.map(o => o.coin))] }].map(f => <select key={f.label} aria-label={`Open orders ${f.label.toLowerCase()} filter`} value={f.value} onChange={e => f.set(e.target.value)} className="bg-surface py-1 text-fg outline-none"><option value="">{f.label}</option>{f.values.map(v => <option key={v} value={v}>{f.label === "Side" ? v === "B" ? "Buy" : "Sell" : f.label === "Market" ? markets.getMarket(v)?.shortName ?? v : v}</option>)}</select>)}
  </AccountTableToolbar>}
  {actionError && <p role="alert" className="px-1.5 py-1 text-xs text-error">{actionError}</p>}
  <div className={positionsPanelTableShellClass}>{placeholder ?? <ScrollArea className="min-h-0 w-full flex-1"><Table className={positionsPanelTableLayoutClass}>
   <TableHeader className={positionViewHeaderClass}><TableRow className="border-0">{headings.map((heading, i) => <TableHead key={heading} scope="col" size="dense" className={cn(positionViewHeadClass, "pr-5")} aria-sort={i === 6 && sortValue ? descendingValue ? "descending" : "ascending" : undefined}>
    {i === 0 ? <span className="inline-flex items-center gap-1"><Checkbox checked={allSelected} indeterminate={someSelected && !allSelected} onCheckedChange={handleToggleAll} aria-label="Select all orders" disabled={!openOrders.length} />{heading}</span> : i === 6 ? <button type="button" onClick={() => { setSortValue(true); setDescendingValue(v => !v); }} className="inline-flex gap-1 hover:text-fg">{heading}<span aria-hidden="true">{sortValue && !descendingValue ? "⌃" : "⌄"}</span></button> : i === 11 ? <button type="button" aria-label="Cancel all orders" onClick={handleCancelAll} disabled={disableCancelAll} className="text-brand disabled:opacity-40">{pendingScopes.has("all") ? "Canceling…" : heading}</button> : heading}
   </TableHead>)}</TableRow></TableHeader>
   <TableBody className={positionViewBodyClass}>{visibleOrders.map(order => {
    const market = markets.getMarket(order.coin); const spot = market?.kind === "spot"; const detail = orderHistoryDetails({ order, status: "open", statusTimestamp: order.timestamp }, spot);
    const quote = spot ? market.tokensInfo[1]?.displayName ?? "USDC" : market?.kind === "builderPerp" ? market.quoteToken?.displayName ?? "USDC" : "USDC";
    const decimals = markets.getSzDecimals(order.coin); const cell = cn(positionViewCellClass, "pr-5"); const cancelling = cancellingOids.has(order.oid); const buy = order.side === "B";
    return <TableRow key={order.oid} className={positionViewRowClass}>
     <TableCell size="dense" className={cell}><span className="inline-flex items-center gap-1"><Checkbox checked={validSelectedIds.has(order.oid)} onCheckedChange={value => handleToggleOrder(order.oid, value)} disabled={cancelling} aria-label={`Select order ${order.coin}`} />{formatDateTime(order.timestamp, { year: "numeric", month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false })}</span></TableCell>
     <TableCell size="dense" className={cell}>{order.orderType}</TableCell>
     <TableCell size="dense" className={cell}><AssetBadge appearance="position" coin={order.coin} side={buy ? "buy" : "sell"} onClick={() => handleSelectMarket(order.coin, buy ? "buy" : "sell")} aria-label={`Switch to ${order.coin} market`} /></TableCell>
     <TableCell size="dense" className={cn(cell, buy ? "text-success" : "text-error")}>{detail.direction}</TableCell>
     <TableCell size="dense" className={cell}>{isClosePositionOrder(order) ? "Close Position" : formatToken(order.sz, decimals)}</TableCell>
     <TableCell size="dense" className={cell}>{isClosePositionOrder(order) ? "--" : formatToken(order.origSz, decimals)}</TableCell>
     <TableCell size="dense" className={cell}>{detail.market ? "Market" : detail.value ? formatToken(detail.value, { decimals: 2, symbol: quote, compact: false }) : "--"}</TableCell>
     <TableCell size="dense" className={cell}>{detail.market ? "Market" : formatPrice(order.limitPx, { szDecimals: decimals, style: "decimal", compact: false })}</TableCell>
     <TableCell size="dense" className={cell}>{spot ? "--" : order.reduceOnly ? "Yes" : "No"}</TableCell><TableCell size="dense" className={cell}>{detail.trigger}</TableCell><TableCell size="dense" className={cell}>{detail.tpsl}</TableCell>
     <TableCell size="dense" className={cell}><button type="button" aria-label="Cancel order" onClick={() => handleCancelRow([order])} disabled={cancelling} className="text-brand hover:underline disabled:opacity-40">{cancelling ? "Canceling…" : "Cancel"}</button></TableCell>
    </TableRow>;
   })}</TableBody>
  </Table><ScrollBar orientation="horizontal" /></ScrollArea>}</div>
  {!placeholder && filteredOrders.length > 15 && <div className="shrink-0 px-1.5 py-1 text-xs text-brand"><button type="button" onClick={() => setViewAll(v => !v)} className="hover:underline">{viewAll ? "Show Less" : "View All"}</button></div>}
  {!placeholder && !filteredOrders.length && <p className="px-1.5 py-3 text-xs text-fg-muted">No open orders match these filters.</p>}
 </div>;
}
