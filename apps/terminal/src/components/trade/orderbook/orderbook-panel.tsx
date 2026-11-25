import { useOrderbookSubscription } from "@hypeterminal/hl-react";
import { Dropdown, Tabs, TabsContent, TabsList, TabsTrigger, Tooltip, tooltipUnderlineClass } from "@hypeterminal/ui";
import { t } from "@lingui/core/macro";
import { useMemo, useState } from "react";
import { getBaseQuoteFromPairName, getPercent } from "@/domain/market";
import { formatNumber, szDecimalsToPriceDecimals } from "@/lib/format";
import { useSelectedMarketInfo } from "@/lib/hyperliquid";
import { useRenderCommitTrack } from "@/lib/performance/render-profile";
import { toNumber } from "@/lib/trade/numbers";
import {
	getMaxTotal,
	getPriceGroupingKey,
	getPriceGroupingOptions,
	ORDERBOOK_DEPTH_OPTIONS,
	type OrderbookDepth,
	processLevels,
	withQuoteTotals,
} from "@/lib/trade/orderbook";
import { useGlobalSettings, useGlobalSettingsActions } from "@/stores/use-global-settings-store";
import { OrderbookRow } from "./orderbook-row";
import { TradesPanel } from "./trades-panel";

const BOOK_SLOTS = Array.from({ length: 20 }, (_, slot) => `empty-${slot}`);

const TEXT_TAB = "px-0 data-active:bg-transparent";

const HEADER_ROW_CLASS =
	"grid h-6 shrink-0 grid-cols-3 items-center gap-2 px-3 text-2xs uppercase tracking-micro text-fg-muted";
const HEADER_TOGGLE_CLASS =
	"min-w-0 cursor-pointer truncate text-right uppercase tracking-micro transition-colors duration-150 hover:text-fg focus-visible:text-fg focus-visible:outline-none motion-reduce:transition-none";

export function OrderbookPanel() {
	useRenderCommitTrack("orderbook");
	const [depth, setDepth] = useState<OrderbookDepth>(15);
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
		[selectedMarket?.name, selectedOption?.mantissa, selectedOption?.nSigFigs],
	);

	const { data: orderbook } = useOrderbookSubscription(subscriptionParams, !!selectedMarket?.name && tab === "book");

	const { baseToken, quoteToken } = useMemo(() => {
		if (!selectedMarket) return { baseToken: "", quoteToken: "" };
		return getBaseQuoteFromPairName(selectedMarket.pairName, selectedMarket.kind);
	}, [selectedMarket]);

	const bids = useMemo(() => withQuoteTotals(processLevels(orderbook?.levels[0], depth)), [orderbook?.levels, depth]);
	const asks = useMemo(() => withQuoteTotals(processLevels(orderbook?.levels[1], depth)), [orderbook?.levels, depth]);
	const asksReversed = useMemo(() => {
		const reversed = new Array(depth);
		for (let i = 0; i < depth; i += 1) {
			reversed[i] = asks[depth - 1 - i];
		}
		return reversed;
	}, [asks, depth]);
	const maxTotal = useMemo(() => getMaxTotal(bids, asks), [asks, bids]);
	const spread = orderbook?.spread;
	const spreadPct = getPercent(spread, selectedMarket?.markPx);

	const szDecimals = selectedMarket?.szDecimals ?? 4;
	const priceDecimals = selectedOption?.decimals ?? szDecimalsToPriceDecimals(szDecimals);

	const displayAsset = showOrderbookInQuote ? quoteToken : baseToken;
	const toggleAssetDisplay = () => setShowOrderbookInQuote(!showOrderbookInQuote);

	const groupingItems = priceGroupingOptions.map((option) => ({
		label: option.label,
		active: option.key === selectedOption?.key,
		onSelect: () => setSelectedOptionKey(getPriceGroupingKey(option)),
	}));

	const depthItems = ORDERBOOK_DEPTH_OPTIONS.map((option) => ({
		label: option.label,
		active: option.value === depth,
		onSelect: () => setDepth(option.value),
	}));
	const depthLabel = ORDERBOOK_DEPTH_OPTIONS.find((option) => option.value === depth)?.label;

	return (
		<Tabs value={tab} onValueChange={setTab} className="flex h-full min-h-0 flex-col overflow-hidden">
			<TabsList className="shrink-0 gap-4 px-3">
				<TabsTrigger value="book" className={TEXT_TAB}>
					{t`Order Book`}
				</TabsTrigger>
				<TabsTrigger value="trades" className={TEXT_TAB}>
					{t`Trades`}
				</TabsTrigger>
			</TabsList>

			<TabsContent value="book" className="flex min-h-0 flex-1 flex-col pt-0">
				<div className="flex h-6 shrink-0 items-center justify-between gap-2 px-3">
					<Dropdown
						triggerVariant="minimal"
						triggerAriaLabel={t`Price grouping`}
						trigger={<span className="tabular-nums">{selectedOption?.label ?? "—"}</span>}
						items={groupingItems}
						disabled={groupingItems.length === 0}
						align="start"
						triggerClassName="-ml-1 text-fg"
						popupClassName="min-w-28"
					/>
					<Tooltip content={t`Live fast top of book with refreshed depth at every size.`} side="bottom">
						<span className="inline-flex">
							<Dropdown
								triggerVariant="minimal"
								triggerAriaLabel={t`Order book depth per side`}
								trigger={<span className={`tabular-nums ${tooltipUnderlineClass}`}>{depthLabel}</span>}
								items={depthItems}
								align="end"
								triggerClassName="-mr-1 text-fg"
								popupClassName="min-w-28"
							/>
						</span>
					</Tooltip>
				</div>

				<div className={HEADER_ROW_CLASS}>
					<span className="min-w-0 truncate">{t`Price`}</span>
					<button type="button" className={HEADER_TOGGLE_CLASS} onClick={toggleAssetDisplay}>
						{t`Size`} ({displayAsset})
					</button>
					<button type="button" className={HEADER_TOGGLE_CLASS} onClick={toggleAssetDisplay}>
						{t`Total`} ({displayAsset})
					</button>
				</div>

				<div className="flex min-h-0 flex-1 flex-col overflow-hidden">
					<section
						className="flex min-h-0 flex-1 flex-col-reverse overflow-y-auto [overflow-anchor:none]"
						aria-label={t`Ask levels`}
					>
						<div className="flex shrink-0 flex-col">
							{asksReversed.map((level, index) =>
								level ? (
									<OrderbookRow
										key={`ask-${level.price}`}
										level={level}
										side="ask"
										maxTotal={maxTotal}
										priceDecimals={priceDecimals}
										showInQuote={showOrderbookInQuote}
										szDecimals={szDecimals}
									/>
								) : (
									<div
										key={`ask-${BOOK_SLOTS[index]}`}
										data-book-placeholder="ask"
										className="h-5 shrink-0"
										aria-hidden="true"
									/>
								),
							)}
						</div>
					</section>

					<div
						data-slot="orderbook-spread"
						className="flex h-6 shrink-0 items-center justify-between gap-2 bg-band px-3 text-xs"
					>
						<span className="text-fg-muted">{t`Spread`}</span>
						<span className="tabular-nums text-fg-secondary">
							{`${formatNumber(spread, 2)} (${formatNumber(spreadPct, 3)}%)`}
						</span>
					</div>

					<section
						className="flex min-h-0 flex-1 flex-col overflow-y-auto [overflow-anchor:none]"
						aria-label={t`Bid levels`}
					>
						{Array.from({ length: depth }, (_, index) => {
							const level = bids[index];
							return level ? (
								<OrderbookRow
									key={`bid-${level.price}`}
									level={level}
									side="bid"
									maxTotal={maxTotal}
									priceDecimals={priceDecimals}
									showInQuote={showOrderbookInQuote}
									szDecimals={szDecimals}
								/>
							) : (
								<div
									key={`bid-${BOOK_SLOTS[index]}`}
									data-book-placeholder="bid"
									className="h-5 shrink-0"
									aria-hidden="true"
								/>
							);
						})}
					</section>
				</div>
			</TabsContent>

			<TabsContent value="trades" className="flex min-h-0 flex-1 flex-col pt-0">
				<TradesPanel key={selectedMarket?.name} priceDecimals={priceDecimals} />
			</TabsContent>
		</Tabs>
	);
}
