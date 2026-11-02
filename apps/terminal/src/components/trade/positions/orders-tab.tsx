import { Button, Checkbox, Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@hypeterminal/ui";
import { t } from "@lingui/core/macro";
import { useState } from "react";
import { useConnection } from "wagmi";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { HL_ALL_DEXS } from "@/config/app";
import { cn } from "@/lib/cn";
import { formatDateTime, formatPrice, formatToken } from "@/lib/format";
import { useExchange, useMarkets, useSubscription } from "@/lib/hyperliquid";
import { getOrderValue, isClosePositionOrder, type OpenOrder } from "@/lib/trade/open-orders";
import { orderHistoryDetails } from "@/lib/trade/order-history";
import type { Side } from "@/lib/trade/types";
import { useExchangeScope } from "@/providers/exchange-scope";
import { useMarketActions } from "@/stores/use-market-store";
import { useOrderEntryActions } from "@/stores/use-order-entry-store";
import { AssetBadge } from "../components/asset-badge";
import { AccountFilterSelect } from "./account-filter-select";
import { AccountTableToolbar } from "./account-table-toolbar";
import { ConnectPlaceholder } from "./connect-placeholder";
import { LoadingRows } from "./loading-rows";
import { Placeholder } from "./placeholder";
import {
	accountCellClass,
	accountFilteredEmptyClass,
	accountFooterClass,
	accountHeadActionClass,
	accountHeadClass,
	accountInlineErrorClass,
	accountNumCellClass,
	accountNumHeadClass,
	accountRowClass,
	accountTableClass,
	accountTableShellClass,
	accountTabRootClass,
	getAriaSort,
} from "./positions-panel-table-styles";
import { SortHeadButton } from "./sort-head-button";

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
		if (!isConnected) return <ConnectPlaceholder message={t`Connect your wallet to view open orders.`} />;
		if (status === "subscribing" || status === "idle") return <LoadingRows label={t`Loading open orders...`} />;
		if (status === "error") {
			return (
				<Placeholder variant="error">
					<span>{t`Failed to load open orders.`}</span>
					{error instanceof Error && <span className="text-fg-muted">{error.message}</span>}
				</Placeholder>
			);
		}
		if (openOrders.length === 0) return <Placeholder>{t`No open orders.`}</Placeholder>;
		return null;
	}

	const placeholder = renderPlaceholder();

	const filteredOrders = openOrders
		.filter(
			(order) =>
				(!typeFilter || order.orderType === typeFilter) &&
				(!sideFilter || order.side === sideFilter) &&
				(!marketFilter || order.coin === marketFilter),
		)
		.slice()
		.sort((a, b) =>
			sortValue
				? (descendingValue ? -1 : 1) * ((getOrderValue(a) ?? 0) - (getOrderValue(b) ?? 0))
				: b.timestamp - a.timestamp,
		);
	const visibleOrders = viewAll ? filteredOrders : filteredOrders.slice(0, 15);
	const headings = [
		{ label: "Time", numeric: false },
		{ label: "Type", numeric: false },
		{ label: "Market", numeric: false },
		{ label: "Direction", numeric: false },
		{ label: "Size", numeric: true },
		{ label: "Original Size", numeric: true },
		{ label: "Order Value", numeric: true },
		{ label: "Price", numeric: true },
		{ label: "Reduce Only", numeric: false },
		{ label: "Trigger Conditions", numeric: false },
		{ label: "TP/SL", numeric: false },
	];
	const filters = [
		{
			label: "Type",
			value: typeFilter,
			set: setTypeFilter,
			options: [...new Set(openOrders.map((o) => o.orderType))].map((v) => ({ value: v, label: v })),
		},
		{
			label: "Side",
			value: sideFilter,
			set: setSideFilter,
			options: [
				{ value: "B", label: "Buy" },
				{ value: "A", label: "Sell" },
			],
		},
		{
			label: "Market",
			value: marketFilter,
			set: setMarketFilter,
			options: [...new Set(openOrders.map((o) => o.coin))].map((v) => ({
				value: v,
				label: markets.getMarket(v)?.shortName ?? v,
			})),
		},
	];

	function renderHeadContent(label: string) {
		if (label === "Time") {
			return (
				<span className="inline-flex items-center gap-2">
					<Checkbox
						checked={allSelected}
						indeterminate={someSelected && !allSelected}
						onCheckedChange={handleToggleAll}
						aria-label="Select all orders"
						disabled={!openOrders.length}
					/>
					{label}
				</span>
			);
		}
		if (label === "Order Value") {
			return (
				<SortHeadButton
					label={label}
					descending={descendingValue}
					active={sortValue}
					onToggle={() => {
						setSortValue(true);
						setDescendingValue((v) => !v);
					}}
				/>
			);
		}
		return label;
	}

	return (
		<div className={accountTabRootClass}>
			{isConnected && (
				<AccountTableToolbar tab="orders">
					{selectedCount > 0 && (
						<Button
							variant="secondary"
							intent="neutral"
							size="xs"
							disabled={disableCancelSelected}
							onClick={handleCancelSelected}
						>
							{pendingScopes.has("selected") ? "Canceling…" : `Cancel selected (${selectedCount})`}
						</Button>
					)}
					{filters.map((f) => (
						<AccountFilterSelect
							key={f.label}
							label={f.label}
							ariaLabel={`Open orders ${f.label.toLowerCase()} filter`}
							value={f.value}
							options={f.options}
							onChange={f.set}
						/>
					))}
				</AccountTableToolbar>
			)}
			{actionError && (
				<p role="alert" className={accountInlineErrorClass}>
					{actionError}
				</p>
			)}
			<div className={accountTableShellClass}>
				{placeholder ?? (
					<ScrollArea className="min-h-0 w-full flex-1">
						<Table className={accountTableClass}>
							<TableHeader>
								<TableRow>
									{headings.map((heading) => (
										<TableHead
											key={heading.label}
											scope="col"
											className={cn(accountHeadClass, heading.numeric && accountNumHeadClass)}
											aria-sort={getAriaSort(heading.label === "Order Value" && sortValue, descendingValue)}
										>
											{renderHeadContent(heading.label)}
										</TableHead>
									))}
									<TableHead scope="col" className={cn(accountHeadClass, accountNumHeadClass)}>
										<button
											type="button"
											aria-label="Cancel all orders"
											onClick={handleCancelAll}
											disabled={disableCancelAll}
											className={accountHeadActionClass}
										>
											{pendingScopes.has("all") ? "Canceling…" : "Cancel All"}
										</button>
									</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{visibleOrders.map((order) => {
									const market = markets.getMarket(order.coin);
									const spot = market?.kind === "spot";
									const detail = orderHistoryDetails({ order, status: "open", statusTimestamp: order.timestamp }, spot);
									const quote = getQuoteName(market);
									const decimals = markets.getSzDecimals(order.coin);
									const cancelling = cancellingOids.has(order.oid);
									const buy = order.side === "B";
									const closeOrder = isClosePositionOrder(order);
									return (
										<TableRow key={order.oid} className={accountRowClass}>
											<TableCell className={accountCellClass}>
												<span className="inline-flex items-center gap-2">
													<Checkbox
														checked={validSelectedIds.has(order.oid)}
														onCheckedChange={(value) => handleToggleOrder(order.oid, value)}
														disabled={cancelling}
														aria-label={`Select order ${order.coin}`}
													/>
													{formatDateTime(order.timestamp, dateTimeOptions)}
												</span>
											</TableCell>
											<TableCell className={accountCellClass}>{order.orderType}</TableCell>
											<TableCell className={accountCellClass}>
												<AssetBadge
													appearance="position"
													coin={order.coin}
													side={buy ? "buy" : "sell"}
													onClick={() => handleSelectMarket(order.coin, buy ? "buy" : "sell")}
													aria-label={`Switch to ${order.coin} market`}
												/>
											</TableCell>
											<TableCell className={cn(accountCellClass, buy ? "text-market-up" : "text-market-down")}>
												{detail.direction}
											</TableCell>
											<TableCell className={numCellClass}>
												{closeOrder ? "Close Position" : formatToken(order.sz, decimals)}
											</TableCell>
											<TableCell className={numCellClass}>
												{closeOrder ? "--" : formatToken(order.origSz, decimals)}
											</TableCell>
											<TableCell className={numCellClass}>{getOrderValueText(detail, quote)}</TableCell>
											<TableCell className={numCellClass}>
												{detail.market
													? "Market"
													: formatPrice(order.limitPx, { szDecimals: decimals, style: "decimal", compact: false })}
											</TableCell>
											<TableCell className={accountCellClass}>{getReduceOnlyText(spot, order.reduceOnly)}</TableCell>
											<TableCell className={accountCellClass}>{detail.trigger}</TableCell>
											<TableCell className={accountCellClass}>{detail.tpsl}</TableCell>
											<TableCell className={numCellClass}>
												<Button
													variant="secondary"
													intent="neutral"
													size="xs"
													aria-label="Cancel order"
													onClick={() => handleCancelRow([order])}
													disabled={cancelling}
												>
													{cancelling ? "Canceling…" : "Cancel"}
												</Button>
											</TableCell>
										</TableRow>
									);
								})}
							</TableBody>
						</Table>
						<ScrollBar orientation="horizontal" />
					</ScrollArea>
				)}
			</div>
			{!placeholder && !filteredOrders.length && (
				<p className={accountFilteredEmptyClass}>No open orders match these filters.</p>
			)}
			{!placeholder && filteredOrders.length > 15 && (
				<div className={accountFooterClass}>
					<Button variant="ghost" intent="neutral" size="xxs" onClick={() => setViewAll((v) => !v)}>
						{viewAll ? "Show Less" : "View All"}
					</Button>
					<span className="text-fg-muted">
						{visibleOrders.length} / {filteredOrders.length}
					</span>
				</div>
			)}
		</div>
	);
}

const numCellClass = cn(accountCellClass, accountNumCellClass);

const dateTimeOptions: Intl.DateTimeFormatOptions = {
	year: "numeric",
	month: "numeric",
	day: "numeric",
	hour: "2-digit",
	minute: "2-digit",
	second: "2-digit",
	hour12: false,
};

function getQuoteName(market: ReturnType<ReturnType<typeof useMarkets>["getMarket"]>): string {
	if (market?.kind === "spot") return market.tokensInfo[1]?.displayName ?? "USDC";
	if (market?.kind === "builderPerp") return market.quoteToken?.displayName ?? "USDC";
	return "USDC";
}

function getOrderValueText(detail: ReturnType<typeof orderHistoryDetails>, quote: string) {
	if (detail.market) return "Market";
	if (detail.value) return formatToken(detail.value, { decimals: 2, symbol: quote, compact: false });
	return "--";
}

function getReduceOnlyText(spot: boolean, reduceOnly: boolean | undefined): string {
	if (spot) return "--";
	return reduceOnly ? "Yes" : "No";
}
