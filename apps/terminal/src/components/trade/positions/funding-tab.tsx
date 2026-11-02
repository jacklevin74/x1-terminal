import { Button, Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@hypeterminal/ui";
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
import { AccountFilterSelect } from "./account-filter-select";
import { AccountTableToolbar } from "./account-table-toolbar";
import { ConnectPlaceholder } from "./connect-placeholder";
import { LoadingRows } from "./loading-rows";
import { Placeholder } from "./placeholder";
import {
	accountCellClass,
	accountFooterClass,
	accountHeadClass,
	accountInlineErrorClass,
	accountNumCellClass,
	accountNumHeadClass,
	accountRowClass,
	accountTableClass,
	accountTableShellClass,
	accountTabRootClass,
	getAriaSort,
	getMarketValueClass,
} from "./positions-panel-table-styles";
import { SortHeadButton } from "./sort-head-button";

const headings = [
	{ label: "Time", numeric: false },
	{ label: "Market", numeric: false },
	{ label: "Size", numeric: true },
	{ label: "Side", numeric: false },
	{ label: "Payment", numeric: true },
	{ label: "Rate", numeric: true },
];

const dateTimeOptions: Intl.DateTimeFormatOptions = {
	year: "numeric",
	month: "numeric",
	day: "numeric",
	hour: "2-digit",
	minute: "2-digit",
	second: "2-digit",
	hour12: false,
};

const numCellClass = cn(accountCellClass, accountNumCellClass);

function getSideLabel(szi: string): "Long" | "Short" | "Flat" {
	const size = Number(szi);
	if (size > 0) return "Long";
	if (size < 0) return "Short";
	return "Flat";
}

function getSideClass(side: "Long" | "Short" | "Flat"): string {
	if (side === "Long") return "text-market-up";
	if (side === "Short") return "text-market-down";
	return "text-fg-muted";
}

export function FundingTab() {
	const { address, isConnected } = useConnection();
	const { scope } = useExchangeScope();
	const { setSelectedMarket } = useMarketActions();
	const markets = useMarkets();
	const [side, setSide] = useState("");
	const [coin, setCoin] = useState("");
	const [descending, setDescending] = useState(true);
	const [viewAll, setViewAll] = useState(false);
	const [exportError, setExportError] = useState<string | null>(null);
	const { data, status, error } = useSubscription(
		"userFundings",
		{ user: address ?? "0x0" },
		{ enabled: isConnected && !!address },
	);
	const all = data?.fundings ?? [];
	const updates = all
		.filter((f) => (!coin || f.coin === coin) && (!side || (side === "Long" ? Number(f.szi) > 0 : Number(f.szi) < 0)))
		.slice()
		.sort((a, b) => (descending ? b.time - a.time : a.time - b.time));
	const visible = viewAll ? updates : updates.slice(0, 15);
	const coins = [...new Set(all.map((f) => f.coin))];

	function currency(name: string) {
		const market = markets.getMarket(name);
		return market?.kind === "builderPerp" ? (market.quoteToken?.displayName ?? "USDC") : "USDC";
	}

	function exportCsv() {
		setExportError(null);
		try {
			downloadHistoryCsv(
				[
					["Time (UTC)", "Market", "Size", "Side", "Payment", "Currency", "Rate"],
					...updates.map((f) => [
						new Date(f.time).toISOString(),
						f.coin,
						f.szi.replace(/^-/, ""),
						getSideLabel(f.szi),
						f.usdc,
						currency(f.coin),
						f.fundingRate,
					]),
				],
				`funding-history-${address}.csv`,
			);
		} catch {
			setExportError("Could not export funding history. Try again.");
		}
	}

	function handleSideChange(value: string) {
		setSide(value);
		setViewAll(false);
	}

	function handleCoinChange(value: string) {
		setCoin(value);
		setViewAll(false);
	}

	function renderPlaceholder() {
		if (!isConnected) return <ConnectPlaceholder message={t`Connect your wallet to view funding payments.`} />;
		if (status === "subscribing" || status === "idle") return <LoadingRows label={t`Loading funding history...`} />;
		if (status === "error") {
			return (
				<Placeholder variant="error">
					<span>{t`Failed to load funding history.`}</span>
					{error instanceof Error && <span className="text-fg-muted">{error.message}</span>}
				</Placeholder>
			);
		}
		if (!updates.length) {
			return (
				<Placeholder>
					{all.length ? "No funding payments match these filters." : t`No funding payments found.`}
				</Placeholder>
			);
		}
		return null;
	}

	const placeholder = renderPlaceholder();

	return (
		<div className={accountTabRootClass}>
			{isConnected && (
				<AccountTableToolbar tab="funding">
					<AccountFilterSelect
						label="Side"
						ariaLabel="Funding history side filter"
						value={side}
						options={[
							{ value: "Long", label: "Long" },
							{ value: "Short", label: "Short" },
						]}
						onChange={handleSideChange}
					/>
					<AccountFilterSelect
						label="Market"
						ariaLabel="Funding history market filter"
						value={coin}
						options={coins.map((c) => ({ value: c, label: markets.getMarket(c)?.shortName ?? c }))}
						onChange={handleCoinChange}
					/>
				</AccountTableToolbar>
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
											aria-sort={getAriaSort(heading.label === "Time", descending)}
										>
											{heading.label === "Time" ? (
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
								{visible.map((f) => {
									const sideLabel = getSideLabel(f.szi);
									const size = Math.abs(Number(f.szi));
									const market = markets.getMarket(f.coin);
									return (
										<TableRow key={`${f.time}:${f.coin}`} className={accountRowClass}>
											<TableCell className={accountCellClass}>{formatDateTime(f.time, dateTimeOptions)}</TableCell>
											<TableCell className={accountCellClass}>
												<AssetBadge
													appearance="position"
													coin={f.coin}
													side={sideLabel === "Long" ? "buy" : "sell"}
													onClick={() => setSelectedMarket(scope, f.coin)}
													aria-label={`Switch to ${f.coin} market`}
												/>
											</TableCell>
											<TableCell className={numCellClass}>
												{formatToken(size, {
													decimals: markets.getSzDecimals(f.coin),
													symbol: market?.shortName ?? f.coin.split(":").at(-1),
													compact: false,
												})}
											</TableCell>
											<TableCell className={cn(accountCellClass, getSideClass(sideLabel))}>{sideLabel}</TableCell>
											<TableCell className={cn(numCellClass, getMarketValueClass(Number(f.usdc)))}>
												{formatToken(f.usdc, { decimals: 4, symbol: currency(f.coin), compact: false })}
											</TableCell>
											<TableCell className={numCellClass}>
												{formatPercent(f.fundingRate, { decimals: 4, signDisplay: "auto" })}
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
			{isConnected && updates.length > 0 && (
				<div className={accountFooterClass}>
					<Button
						variant="ghost"
						intent="neutral"
						size="xxs"
						title="Show all loaded funding records"
						onClick={() => setViewAll((v) => !v)}
					>
						{viewAll ? "Show Less" : "View All"}
					</Button>
					<Button variant="ghost" intent="neutral" size="xxs" onClick={exportCsv}>
						Export as CSV
					</Button>
					<span className="text-fg-muted">
						{visible.length} / {updates.length} loaded
					</span>
				</div>
			)}
			{exportError && (
				<p role="alert" className={accountInlineErrorClass}>
					{exportError}
				</p>
			)}
		</div>
	);
}
