import { useOrderbookSubscription } from "@hypeterminal/hl-react";
import { Dropdown, Tabs, TabsContent, TabsList, TabsTrigger } from "@hypeterminal/ui";
import { t } from "@lingui/core/macro";
import { BookBookmarkIcon, ListDashesIcon } from "@phosphor-icons/react";
import { useMemo, useState } from "react";
import { getBaseQuoteFromPairName, getPercent } from "@/domain/market";
import { formatNumber, szDecimalsToPriceDecimals } from "@/lib/format";
import { useSelectedMarketInfo } from "@/lib/hyperliquid";
import { useRenderCommitTrack } from "@/lib/performance/render-profile";
import { toNumber } from "@/lib/trade/numbers";
import { getMaxTotal, getPriceGroupingKey, getPriceGroupingOptions, processLevels, withQuoteTotals } from "@/lib/trade/orderbook";
import { useGlobalSettings, useGlobalSettingsActions } from "@/stores/use-global-settings-store";
import { OrderbookRow } from "./orderbook-row";
import { TradesPanel } from "./trades-panel";


export function OrderbookPanel() {
	useRenderCommitTrack("orderbook");
	const [depth, setDepth] = useState<5 | 10 | 15 | 20>(15);
 const fast = true;
 const [selectedOptionKey, setSelectedOptionKey] = useState<string | null>(null);
	const { showOrderbookInQuote } = useGlobalSettings();
	const { setShowOrderbookInQuote } = useGlobalSettingsActions();

	const [tab, setTab] = useState("book");

	const { data: selectedMarket } = useSelectedMarketInfo();
	const markPx = toNumber(selectedMarket?.markPx);
	const priceGroupingOptions = useMemo(() => getPriceGroupingOptions(markPx ?? undefined), [markPx]);
	const selectedOption = useMemo(
		() => priceGroupingOptions.find((option) => option.key === selectedOptionKey) ?? priceGroupingOptions[0] ?? null,
		[priceGroupingOptions, selectedOptionKey],
	);
	const subscriptionParams = useMemo(
		() => ({
			coin: selectedMarket?.name ?? "",
   fast,
			nSigFigs: selectedOption?.nSigFigs ?? 5,
			mantissa: selectedOption?.mantissa,
		}),
		[selectedMarket?.name, selectedOption?.mantissa, selectedOption?.nSigFigs, fast],
	);

 const { data: orderbook, status: orderbookStatus } = useOrderbookSubscription(subscriptionParams, !!selectedMarket?.name && tab === "book");

	const { baseToken, quoteToken } = useMemo(() => {
		if (!selectedMarket) return { baseToken: "", quoteToken: "" };
		return getBaseQuoteFromPairName(selectedMarket.pairName, selectedMarket.kind);
	}, [selectedMarket]);

	const bids = useMemo(
		() => withQuoteTotals(processLevels(orderbook?.levels[0], depth)),
		[orderbook?.levels, depth],
	);
	const asks = useMemo(
		() => withQuoteTotals(processLevels(orderbook?.levels[1], depth)),
		[orderbook?.levels, depth],
	);
	const asksReversed = useMemo(() => {
		const reversed = new Array(depth);
		for (let i = 0; i < depth; i += 1) {
			reversed[i] = asks[depth - 1 - i];
		}
		return reversed;
	}, [asks,depth]);
	const maxTotal = useMemo(() => getMaxTotal(bids, asks), [asks, bids]);
	const spread = orderbook?.spread;
	const spreadPct = getPercent(spread, selectedMarket?.markPx);

	const szDecimals = selectedMarket?.szDecimals ?? 4;
	const priceDecimals = selectedOption?.decimals ?? szDecimalsToPriceDecimals(szDecimals);

	const displayAsset = showOrderbookInQuote ? quoteToken : baseToken;
	const toggleAssetDisplay = () => setShowOrderbookInQuote(!showOrderbookInQuote);



	const dropdownItems = priceGroupingOptions.map((option) => ({
		label: option.label,
		active: option.key === selectedOption?.key,
		onSelect: () => setSelectedOptionKey(getPriceGroupingKey(option)),
	}));

	return (
		<Tabs
			value={tab}
			onValueChange={setTab}
			className="h-full min-h-0 flex flex-col overflow-hidden bg-surface"
			size="sm"
			variant="underline"
		>
			<div className="flex items-center justify-between">
    <label className="order-last shrink-0 px-2 text-2xs text-brand whitespace-nowrap" title="Live fast top of book with refreshed depth at every size.">
     <span className="sr-only">Order book depth per side</span>
     <select aria-label="Order book depth per side" value={depth} onChange={event => setDepth(Number(event.target.value) as 5 | 10 | 15 | 20)} className="bg-surface cursor-pointer py-1 outline-none focus-visible:ring-1 focus-visible:ring-brand">
      <option value={5}>5 levels</option><option value={10}>10 levels</option><option value={15}>15 levels</option><option value={20}>20 levels</option>
     </select>
    </label>
				<TabsList className="w-full min-w-0">
					<TabsTrigger value="book" aria-label={t`Order Book`} icon={<BookBookmarkIcon className="size-3.5" />}>
						{t`Order Book`}
					</TabsTrigger>
					<TabsTrigger value="trades" aria-label={t`Recent Trades`} icon={<ListDashesIcon className="size-3.5" />}>
						{t`Trades`}
					</TabsTrigger>
				</TabsList>
			</div>

			<TabsContent value="book" className="flex-1 min-h-0 mt-0 pt-0 flex flex-col">
				<div className="grid grid-cols-3 gap-1 px-2 py-1.5 items-center text-2xs text-fg-muted uppercase tracking-wider border-b border-stroke-weak shrink-0">
					<div className="min-w-0 flex items-center gap-1">
						{t`Price`}
						<Dropdown
							trigger={
								<span className="text-2xs tabular-nums uppercase tracking-wider">
									{selectedOption?.label ?? priceGroupingOptions[0]?.label ?? "—"}
								</span>
							}
							items={dropdownItems}
							size="xxs"
							align="start"
							triggerVariant="minimal"
							triggerAriaLabel={t`Price grouping`}
							popupClassName="min-w-0 w-max"
						/>
					</div>
					<button
						className="min-w-0 inline-flex items-center justify-end gap-0.5 hover:text-fg truncate"
						type="button"
						onClick={toggleAssetDisplay}
					>
						{t`Size`}
						<span className="text-fg truncate">({displayAsset})</span>
					</button>
					<button
						className="min-w-0 inline-flex items-center justify-end gap-0.5 hover:text-fg truncate"
						type="button"
						onClick={toggleAssetDisplay}
					>
						{t`Total`}
						<span className="text-fg truncate">({displayAsset})</span>
					</button>
				</div>

				<div className="flex-1 min-h-0 flex flex-col overflow-hidden">
					<div className="flex-1 min-h-0 flex flex-col-reverse overflow-y-auto [overflow-anchor:none]" aria-label="Ask levels">
      <div className="flex flex-col shrink-0">
						{
							asksReversed.map((level,index) => level ? (
								<OrderbookRow
									key={`ask-${index}`}
									level={level}
									side="ask"
									maxTotal={maxTotal}
									priceDecimals={priceDecimals}
									showInQuote={showOrderbookInQuote}
									szDecimals={szDecimals}
								/>
							) : <div key={`ask-${index}`} aria-hidden="true" data-book-placeholder="ask" className="h-5 shrink-0" />)}
      </div>
					</div>

					<div
						data-slot="orderbook-spread"
						className="shrink-0 px-2 py-1.5 border-y border-stroke-weak flex items-center justify-between text-xs text-fg"
					>
						<span title={orderbookStatus === "error"?"Connection interrupted; showing last received book":undefined}>{t`Spread`}</span>
						<span className="tabular-nums font-medium text-fg-muted">
							{`${formatNumber(spread, 2)} (${formatNumber(spreadPct, 3)}%)`}
						</span>
					</div>

					<div className="flex-1 min-h-0 flex flex-col overflow-y-auto [overflow-anchor:none]" aria-label="Bid levels">
						{							Array.from({length:depth},(_,index)=>bids[index]).map((level,index) => level ? (
								<OrderbookRow
									key={`bid-${index}`}
									level={level}
									side="bid"
									maxTotal={maxTotal}
									priceDecimals={priceDecimals}
									showInQuote={showOrderbookInQuote}
									szDecimals={szDecimals}
								/>
							) : <div key={`bid-${index}`} aria-hidden="true" data-book-placeholder="bid" className="h-5 shrink-0" />)}
					</div>
				</div>
			</TabsContent>

			<TabsContent value="trades" className="flex-1 min-h-0 mt-0 pt-0 flex flex-col">
				<TradesPanel key={selectedMarket?.name} />
			</TabsContent>
		</Tabs>
	);
}
