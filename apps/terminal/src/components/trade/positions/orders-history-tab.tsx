import { Button, Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@hypeterminal/ui";
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
import { AccountFilterSelect } from "./account-filter-select";
import { AccountTableToolbar } from "./account-table-toolbar";
import { ConnectPlaceholder } from "./connect-placeholder";
import { LoadingRows } from "./loading-rows";
import { Placeholder } from "./placeholder";
import {
	accountCellClass,
	accountFooterClass,
	accountHeadClass,
	accountNumCellClass,
	accountNumHeadClass,
	accountRowClass,
	accountTableClass,
	accountTableShellClass,
	accountTabRootClass,
	getAriaSort,
} from "./positions-panel-table-styles";
import { SortHeadButton } from "./sort-head-button";
import { useWithdrawalHistory, WithdrawalLinks } from "./withdrawal-history";

export function OrdersHistoryTab() {
	const { address, isConnected } = useConnection();
	const { scope } = useExchangeScope();
	const { setSelectedMarket } = useMarketActions();
	const markets = useMarkets();
	const [type, setType] = useState("");
	const [side, setSide] = useState("");
	const [coin, setCoin] = useState("");
	const [descending, setDescending] = useState(true);
	const { data, status, error } = useSubscription(
		"userHistoricalOrders",
		{ user: address ?? "0x0" },
		{ enabled: isConnected && !!address },
	);
	const withdrawalHistory = useWithdrawalHistory(isConnected ? address : undefined);
	const all = data?.orderHistory ?? [];
	const orders = all
		.filter(
			(e) =>
				(!type || e.order.orderType === type) && (!side || e.order.side === side) && (!coin || e.order.coin === coin),
		)
		.slice()
		.sort((a, b) => (descending ? b.statusTimestamp - a.statusTimestamp : a.statusTimestamp - b.statusTimestamp))
		.slice(0, MAX_HISTORY_ROWS);
	const withdrawals = withdrawalHistory.rows.filter(
		(row) => (!type || type === "Withdrawal") && !side && (!coin || coin === row.asset),
	);
	const timeline = [
		...orders.map((entry) => ({ kind: "order" as const, time: entry.statusTimestamp, entry })),
		...withdrawals.map((row) => ({ kind: "withdrawal" as const, time: row.time, row })),
	]
		.sort((a, b) => (descending ? b.time - a.time : a.time - b.time))
		.slice(0, MAX_HISTORY_ROWS);
	const filters = [
		{
			label: "Type",
			value: type,
			set: setType,
			values: [...new Set([...all.map((e) => e.order.orderType), "Withdrawal"])],
		},
		{ label: "Side", value: side, set: setSide, values: ["B", "A"] },
		{
			label: "Market",
			value: coin,
			set: setCoin,
			values: [...new Set([...all.map((e) => e.order.coin), ...withdrawalHistory.rows.map((row) => row.asset)])],
		},
	];
	function renderPlaceholder() {
		if (!isConnected) return <ConnectPlaceholder message={t`Connect your wallet to view order history.`} />;
		if (!timeline.length && (status === "subscribing" || status === "idle" || withdrawalHistory.loading)) {
			return <LoadingRows label={t`Loading order history...`} />;
		}
		if (!timeline.length && status === "error") {
			return (
				<Placeholder variant="error">
					<span>{t`Failed to load order history.`}</span>
					{error instanceof Error && <span className="text-fg-muted">{error.message}</span>}
				</Placeholder>
			);
		}
		if (!timeline.length) {
			return (
				<Placeholder>
					{all.length || withdrawalHistory.rows.length
						? "No orders match these filters."
						: "No order or withdrawal history found."}
				</Placeholder>
			);
		}
		return null;
	}

	function getFilterOptionLabel(label: string, value: string): string {
		if (label === "Side") return value === "B" ? "Buy" : "Sell";
		if (label === "Market") return markets.getMarket(value)?.pairName ?? value;
		return value;
	}

	const placeholder = renderPlaceholder();
	const headings = [
		{ label: "Time", numeric: false },
		{ label: "Type", numeric: false },
		{ label: "Market", numeric: false },
		{ label: "Direction", numeric: false },
		{ label: "Size", numeric: true },
		{ label: "Filled Size", numeric: true },
		{ label: "Order Value", numeric: true },
		{ label: "Price", numeric: true },
		{ label: "Reduce Only", numeric: false },
		{ label: "Trigger Conditions", numeric: false },
		{ label: "TP/SL", numeric: false },
		{ label: "Status", numeric: false },
		{ label: "Order ID / Track", numeric: false },
	];

	return (
		<div className={accountTabRootClass}>
			{isConnected && (
				<AccountTableToolbar tab="orders-history">
					{filters.map((f) => (
						<AccountFilterSelect
							key={f.label}
							label={f.label}
							ariaLabel={`Order history ${f.label.toLowerCase()} filter`}
							value={f.value}
							options={f.values.map((v) => ({ value: v, label: getFilterOptionLabel(f.label, v) }))}
							onChange={f.set}
						/>
					))}
				</AccountTableToolbar>
			)}
			<div className={accountTableShellClass}>
				{placeholder ?? (
					<ScrollArea className="min-h-0 w-full flex-1">
						<Table className={accountTableClass}>
							<TableHeader>
								<TableRow>
									{headings.map((heading, i) => (
										<TableHead
											key={heading.label}
											scope="col"
											className={cn(accountHeadClass, heading.numeric && accountNumHeadClass)}
											aria-sort={getAriaSort(i === 0, descending)}
										>
											{i === 0 ? (
												<SortHeadButton
													label={heading.label}
													descending={descending}
													onToggle={() => setDescending((v) => !v)}
												/>
											) : (
												heading.label
											)}
										</TableHead>
									))}
								</TableRow>
							</TableHeader>
							<TableBody>
								{timeline.map((item) => {
									if (item.kind === "withdrawal") {
										const row = item.row;
										return (
											<TableRow key={`withdrawal:${row.id}`} className={accountRowClass}>
												<TableCell className={accountCellClass}>{formatDateTime(row.time, dateTimeOptions)}</TableCell>
												<TableCell className={accountCellClass}>Withdrawal</TableCell>
												<TableCell className={cn(accountCellClass, "font-medium")}>{row.asset}</TableCell>
												<TableCell className={accountCellClass}>
													<span title={row.destination || undefined}>
														To {row.chain}
														{row.destination ? ` · ${row.destination.slice(0, 6)}…${row.destination.slice(-4)}` : ""}
													</span>
												</TableCell>
												<TableCell className={numCellClass}>{row.amount}</TableCell>
												<TableCell className={numCellClass}>--</TableCell>
												<TableCell className={numCellClass}>--</TableCell>
												<TableCell className={numCellClass}>--</TableCell>
												<TableCell className={accountCellClass}>--</TableCell>
												<TableCell className={accountCellClass}>N/A</TableCell>
												<TableCell className={accountCellClass}>--</TableCell>
												<TableCell className={accountCellClass}>{row.status}</TableCell>
												<TableCell className={accountCellClass}>
													<WithdrawalLinks row={row} />
												</TableCell>
											</TableRow>
										);
									}
									const entry = item.entry;
									const order = entry.order;
									const market = markets.getMarket(order.coin);
									const details = orderHistoryDetails(entry, market?.kind === "spot");
									const decimals = markets.getSzDecimals(order.coin);
									const buy = order.side === "B";
									const quote = getQuoteName(market);
									return (
										<TableRow key={`${order.oid}:${entry.statusTimestamp}:${entry.status}`} className={accountRowClass}>
											<TableCell className={accountCellClass}>
												{formatDateTime(entry.statusTimestamp, dateTimeOptions)}
											</TableCell>
											<TableCell className={accountCellClass}>{order.orderType}</TableCell>
											<TableCell className={accountCellClass}>
												<AssetBadge
													appearance="position"
													coin={order.coin}
													side={buy ? "buy" : "sell"}
													onClick={() => setSelectedMarket(scope, order.coin)}
													aria-label={`Switch to ${order.coin} market`}
												/>
											</TableCell>
											<TableCell className={cn(accountCellClass, buy ? "text-market-up" : "text-market-down")}>
												{details.direction}
											</TableCell>
											<TableCell className={numCellClass}>
												{details.size ? formatToken(details.size, decimals) : "--"}
											</TableCell>
											<TableCell className={numCellClass}>
												{details.filled ? formatToken(details.filled, decimals) : "--"}
											</TableCell>
											<TableCell className={numCellClass}>{getOrderValueText(details, quote)}</TableCell>
											<TableCell className={numCellClass}>
												{details.market ? (
													<span
														title="Executes at the available market price."
														className="underline decoration-fg-muted decoration-dashed underline-offset-4"
													>
														Market
													</span>
												) : (
													formatPrice(order.limitPx, { szDecimals: decimals, style: "decimal", compact: false })
												)}
											</TableCell>
											<TableCell className={accountCellClass}>
												{getReduceOnlyText(market?.kind === "spot", order.reduceOnly)}
											</TableCell>
											<TableCell className={accountCellClass}>{details.trigger}</TableCell>
											<TableCell className={accountCellClass}>{details.tpsl}</TableCell>
											<TableCell className={cn(accountCellClass, "capitalize")}>
												{entry.status.replace(/([a-z])([A-Z])/g, "$1 $2")}
											</TableCell>
											<TableCell className={accountCellClass}>{order.oid}</TableCell>
										</TableRow>
									);
								})}
							</TableBody>
						</Table>
						<ScrollBar orientation="horizontal" />
					</ScrollArea>
				)}
			</div>
			{isConnected && withdrawalHistory.error && (
				<div className={accountFooterClass}>
					<span className="text-fg-muted">Withdrawal history unavailable</span>
					<Button
						variant="ghost"
						intent="neutral"
						size="xxs"
						className="max-md:h-8"
						onClick={() => void withdrawalHistory.refresh()}
					>
						Retry
					</Button>
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

function getOrderValueText(details: ReturnType<typeof orderHistoryDetails>, quote: string) {
	if (details.market && details.size) return "Market";
	if (details.value) return formatToken(details.value, { decimals: 2, symbol: quote, compact: false });
	return "--";
}

function getReduceOnlyText(spot: boolean, reduceOnly: boolean | undefined): string {
	if (spot) return "--";
	return reduceOnly ? "Yes" : "No";
}
