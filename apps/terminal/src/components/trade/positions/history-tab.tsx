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
import { AccountFilterSelect } from "./account-filter-select";
import { AccountTableToolbar } from "./account-table-toolbar";
import { ConnectPlaceholder } from "./connect-placeholder";
import { LoadingRows } from "./loading-rows";
import { Placeholder } from "./placeholder";
import {
	accountCellClass,
	accountHeadClass,
	accountNumCellClass,
	accountNumHeadClass,
	accountRowClass,
	accountTableClass,
	accountTableShellClass,
	accountTabRootClass,
	accountTextLinkClass,
	getAriaSort,
	getMarketValueClass,
} from "./positions-panel-table-styles";
import { SortHeadButton } from "./sort-head-button";
import { ToolbarCheckbox } from "./toolbar-checkbox";

export function HistoryTab() {
	const { address, isConnected } = useConnection();
	const { scope } = useExchangeScope();
	const { setSelectedMarket } = useMarketActions();
	const markets = useMarkets();
	const [descending, setDescending] = useState(true);
	const [typeFilter, setTypeFilter] = useState("");
	const [sideFilter, setSideFilter] = useState("");
	const [roleFilter, setRoleFilter] = useState("");
	const [marketFilter, setMarketFilter] = useState("");
	const [aggregate, setAggregate] = useState(true);
	const {
		data: fillsEvent,
		status,
		error,
	} = useSubscription(
		"userFills",
		{ user: address ?? "0x0", aggregateByTime: aggregate },
		{ enabled: isConnected && !!address },
	);
	const allFills = fillsEvent?.fills ?? [];
	const fills = allFills
		.filter(
			(fill) =>
				(!typeFilter || (fill.liquidation ? "Liquidated" : fill.dir) === typeFilter) &&
				(!sideFilter || fill.side === sideFilter) &&
				(!roleFilter || (fill.crossed ? "Taker" : "Maker") === roleFilter) &&
				(!marketFilter || fill.coin === marketFilter),
		)
		.slice()
		.sort((a, b) => (descending ? b.time - a.time : a.time - b.time))
		.slice(0, MAX_HISTORY_ROWS);
	function renderPlaceholder() {
		if (!isConnected) return <ConnectPlaceholder message={t`Connect your wallet to view trade history.`} />;
		if (status === "subscribing" || status === "idle") return <LoadingRows label={t`Loading trade history...`} />;
		if (status === "error") {
			return (
				<Placeholder variant="error">
					<span>{t`Failed to load trade history.`}</span>
					{error instanceof Error && <span className="text-fg-muted">{error.message}</span>}
				</Placeholder>
			);
		}
		if (!fills.length) {
			return <Placeholder>{allFills.length ? "No trades match these filters." : t`No fills found.`}</Placeholder>;
		}
		return null;
	}

	const placeholder = renderPlaceholder();
	const headings = [
		{ label: t`Time`, numeric: false },
		{ label: t`Market`, numeric: false },
		{ label: t`Direction`, numeric: false },
		{ label: t`Price`, numeric: true },
		{ label: t`Size`, numeric: true },
		{ label: t`Trade Value`, numeric: true },
		{ label: t`Fee`, numeric: true },
		{ label: t`Closed PNL`, numeric: true },
	];
	const filters = [
		{
			label: "Type",
			value: typeFilter,
			set: setTypeFilter,
			options: [...new Set(allFills.map((fill) => (fill.liquidation ? "Liquidated" : fill.dir)))].map((v) => ({
				value: v,
				label: v,
			})),
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
			label: "Role",
			value: roleFilter,
			set: setRoleFilter,
			options: [
				{ value: "Maker", label: "Maker" },
				{ value: "Taker", label: "Taker" },
			],
		},
		{
			label: "Market",
			value: marketFilter,
			set: setMarketFilter,
			options: [...new Set(allFills.map((fill) => fill.coin))].map((v) => ({
				value: v,
				label: markets.getMarket(v)?.pairName ?? v,
			})),
		},
	];

	function renderHeadContent(label: string, index: number) {
		if (index === 0) {
			return <SortHeadButton label={label} descending={descending} onToggle={() => setDescending((value) => !value)} />;
		}
		if (index === 7) {
			return (
				<span
					title="Realized PNL reported by Hyperliquid. Trading fees are shown separately."
					className="underline decoration-fg-muted decoration-dashed underline-offset-4"
				>
					{label}
				</span>
			);
		}
		return label;
	}

	return (
		<div className={accountTabRootClass}>
			{isConnected && (
				<AccountTableToolbar tab="history">
					{filters.map((filter) => (
						<AccountFilterSelect
							key={filter.label}
							label={filter.label}
							ariaLabel={`Trade history ${filter.label.toLowerCase()} filter`}
							value={filter.value}
							options={filter.options}
							onChange={filter.set}
						/>
					))}
					<ToolbarCheckbox
						label="Aggregate"
						ariaLabel="Aggregate trade history"
						checked={aggregate}
						onCheckedChange={setAggregate}
					/>
				</AccountTableToolbar>
			)}
			<div className={accountTableShellClass}>
				{placeholder ?? (
					<ScrollArea className="min-h-0 w-full flex-1">
						<Table className={accountTableClass}>
							<TableHeader>
								<TableRow>
									{headings.map((heading, index) => (
										<TableHead
											key={heading.label}
											scope="col"
											className={cn(accountHeadClass, heading.numeric && accountNumHeadClass)}
											aria-sort={getAriaSort(index === 0, descending)}
										>
											{renderHeadContent(heading.label, index)}
										</TableHead>
									))}
								</TableRow>
							</TableHeader>
							<TableBody>
								{fills.map((fill) => {
									const market = markets.getMarket(fill.coin);
									const base =
										market?.kind === "spot"
											? (market.tokensInfo[0]?.displayName ?? market.shortName)
											: (market?.shortName ?? fill.coin.split(":").at(-1) ?? fill.coin);
									const quote = getQuoteName(market);
									const decimals = markets.getSzDecimals(fill.coin);
									const href = getHyperliquidTxUrl(fill.hash);
									const isBuy = fill.side === "B";
									const pnl = Number(fill.closedPnl);
									const tradeValue = new Big(fill.px).times(fill.sz).toString();
									const time = formatDateTime(fill.time, dateTimeOptions);
									return (
										<TableRow key={`${fill.hash}-${fill.tid}`} className={accountRowClass}>
											<TableCell className={accountCellClass}>
												{href ? (
													<a
														href={href}
														target="_blank"
														rel="noopener noreferrer"
														title="View transaction on Hyperliquid"
														className={accountTextLinkClass}
													>
														<span>{time}</span>
														<ArrowSquareOutIcon className="size-3 text-fg-muted" />
													</a>
												) : (
													<span title="Transaction hash unavailable">{time}</span>
												)}
											</TableCell>
											<TableCell className={accountCellClass}>
												<AssetBadge
													appearance="position"
													coin={fill.coin}
													side={isBuy ? "buy" : "sell"}
													onClick={() => setSelectedMarket(scope, fill.coin)}
													aria-label={t`Switch to ${fill.coin} market`}
												/>
											</TableCell>
											<TableCell className={cn(accountCellClass, isBuy ? "text-market-up" : "text-market-down")}>
												{fill.liquidation ? t`Liquidated` : fill.dir}
											</TableCell>
											<TableCell className={numCellClass}>
												{formatPrice(fill.px, { szDecimals: decimals, style: "decimal", compact: false })}
											</TableCell>
											<TableCell className={numCellClass}>
												{formatToken(fill.sz, { decimals, symbol: base, compact: false })}
											</TableCell>
											<TableCell className={numCellClass}>
												{formatToken(tradeValue, { decimals: 2, symbol: quote, compact: false })}
											</TableCell>
											<TableCell className={numCellClass}>
												{formatToken(fill.fee, {
													decimals: fill.feeToken === quote ? 2 : 8,
													symbol: fill.feeToken,
													compact: false,
												})}
											</TableCell>
											<TableCell className={cn(numCellClass, getMarketValueClass(pnl))}>
												<span className="inline-flex items-center gap-1">
													{formatToken(fill.closedPnl, { decimals: 2, symbol: quote, compact: false })}
													{href && pnl !== 0 && (
														<a
															href={href}
															target="_blank"
															rel="noopener noreferrer"
															aria-label="View closed PNL transaction"
															className="inline-flex text-fg-muted transition-colors hover:text-fg"
														>
															<ArrowSquareOutIcon className="size-3" />
														</a>
													)}
												</span>
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
