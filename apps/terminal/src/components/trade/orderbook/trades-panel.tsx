import { t } from "@lingui/core/macro";
import { ArrowSquareOutIcon } from "@phosphor-icons/react";
import { memo, useMemo } from "react";
import { getBaseQuoteFromPairName } from "@/domain/market";
import { cn } from "@/lib/cn";
import { getHyperliquidTxUrl as getExplorerTxUrl } from "@/lib/explorer";
import { formatNumber } from "@/lib/format";
import { useSelectedMarketInfo, useSubscription } from "@/lib/hyperliquid";
import { toNumber } from "@/lib/trade/numbers";
import { getDefaultBookPriceDecimals } from "@/lib/trade/orderbook";
import { type ProcessedTrade, processTrades } from "@/lib/trade/trades";
import { useGlobalSettings, useGlobalSettingsActions } from "@/stores/use-global-settings-store";

const STATE_CLASS = "flex flex-1 items-center justify-center px-3 py-6 text-xs text-fg-muted";

interface TradeRowProps {
	trade: ProcessedTrade;
	szDecimals: number;
	priceDecimals: number;
	showInQuote: boolean;
}

const TradeRow = memo(function TradeRow({ trade, szDecimals, priceDecimals, showInQuote }: TradeRowProps) {
	const sizeDisplay = showInQuote ? formatNumber(trade.price * trade.size, 2) : formatNumber(trade.size, szDecimals);

	return (
		<a
			href={getExplorerTxUrl(trade.hash)}
			target="_blank"
			rel="noopener noreferrer"
			className={cn(
				"grid h-5 shrink-0 grid-cols-[4fr_3fr_3fr] items-center gap-2 px-3 text-xs font-normal tabular-nums hover:bg-control/50 focus-visible:bg-control/50 focus-visible:outline-none",
				trade.side === "buy" ? "trade-row-buy" : "trade-row-sell",
			)}
		>
			<div className="flex min-w-0 items-center gap-1 text-fg-secondary">
				<span className="truncate">{trade.time}</span>
				<ArrowSquareOutIcon className="size-3 shrink-0 text-fg-muted" aria-hidden="true" />
			</div>
			<div className={cn("truncate text-right", trade.side === "buy" ? "text-market-up" : "text-market-down")}>
				{formatNumber(trade.price, priceDecimals)}
			</div>
			<div className="truncate text-right text-fg-secondary">{sizeDisplay}</div>
		</a>
	);
});

interface Props {
	priceDecimals?: number;
}

export function TradesPanel({ priceDecimals }: Props) {
	const { data: selectedMarket } = useSelectedMarketInfo();
	const subscriptionCoin = selectedMarket?.name ?? "";
	const params = useMemo(() => ({ coin: subscriptionCoin }), [subscriptionCoin]);
	const {
		data: trades,
		status,
		error,
	} = useSubscription("trades", params, {
		enabled: !!selectedMarket && !!subscriptionCoin,
	});
	const { showOrderbookInQuote } = useGlobalSettings();
	const { setShowOrderbookInQuote } = useGlobalSettingsActions();

	const { baseToken, quoteToken } = useMemo(() => {
		if (!selectedMarket) return { baseToken: "", quoteToken: "" };
		return getBaseQuoteFromPairName(selectedMarket.pairName, selectedMarket.kind);
	}, [selectedMarket]);

	const szDecimals = selectedMarket?.szDecimals ?? 4;
	const resolvedPriceDecimals =
		priceDecimals ?? getDefaultBookPriceDecimals(toNumber(selectedMarket?.markPx) ?? undefined, szDecimals);
	const processed = useMemo(() => processTrades(trades ?? []), [trades]);
	const displayAsset = showOrderbookInQuote ? quoteToken : baseToken;
	const toggleAssetDisplay = () => setShowOrderbookInQuote(!showOrderbookInQuote);

	function renderBody() {
		if (status === "error") {
			return <div className={STATE_CLASS}>{error instanceof Error ? error.message : t`Failed to load trades.`}</div>;
		}
		if (processed.length === 0) {
			return <div className={STATE_CLASS}>{t`Waiting for trades...`}</div>;
		}
		return (
			<div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
				{processed.map((trade) => (
					<TradeRow
						key={trade.id}
						trade={trade}
						szDecimals={szDecimals}
						priceDecimals={resolvedPriceDecimals}
						showInQuote={showOrderbookInQuote}
					/>
				))}
			</div>
		);
	}

	return (
		<div className="flex min-h-0 flex-1 flex-col">
			<div className="grid h-6 shrink-0 grid-cols-[4fr_3fr_3fr] items-center gap-2 px-3 text-2xs uppercase tracking-micro text-fg-muted">
				<span className="min-w-0 truncate">{t`Time`}</span>
				<span className="min-w-0 truncate text-right">{t`Price`}</span>
				<button
					type="button"
					onClick={toggleAssetDisplay}
					className="min-w-0 cursor-pointer truncate text-right uppercase tracking-micro transition-colors duration-150 hover:text-fg focus-visible:text-fg focus-visible:outline-none motion-reduce:transition-none"
				>
					{t`Size`} ({displayAsset})
				</button>
			</div>
			{renderBody()}
		</div>
	);
}
