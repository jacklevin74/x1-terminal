import { Button, Dropdown, type DropdownItem, Tabs, TabsContent, TabsList, TabsTrigger } from "@hypeterminal/ui";
import { ArrowsClockwiseIcon, ArrowsLeftRightIcon, TrendDownIcon, TrendUpIcon } from "@phosphor-icons/react";
import { useEffect, useMemo, useRef, useState } from "react";
import { FALLBACK_VALUE_PLACEHOLDER } from "@/config/app";
import { UI_TEXT } from "@/config/ui-text";
import { getBaseQuoteFromPairName } from "@/domain/market";
import { cn } from "@/lib/cn";
import { formatNumber, szDecimalsToPriceDecimals } from "@/lib/format";
import { useSelectedMarketInfo, useSubscription } from "@/lib/hyperliquid";
import { toNumber } from "@/lib/trade/numbers";
import { getPriceGroupingKey, getPriceGroupingOptions, processLevels } from "@/lib/trade/orderbook";
import { useGlobalSettings, useGlobalSettingsActions } from "@/stores/use-global-settings-store";
import { OrderbookRow } from "../orderbook/orderbook-row";
import { TradesPanel } from "../orderbook/trades-panel";
import { useOrderbookRows } from "../orderbook/use-orderbook-rows";
import { MobileBottomNavSpacer } from "./mobile-bottom-nav";

const ORDERBOOK_TEXT = UI_TEXT.ORDERBOOK;
const HEADER_TOGGLE_CLASS =
	"-my-2 min-w-0 cursor-pointer truncate py-2 text-right uppercase tracking-micro transition-colors duration-150 hover:text-fg focus-visible:text-fg focus-visible:outline-none motion-reduce:transition-none";

type View = "book" | "trades";

interface MobileBookViewProps {
	className?: string;
}

export function MobileBookView({ className }: MobileBookViewProps) {
	const [view, setView] = useState<View>("book");
	const [visibleRows, rowsRef] = useOrderbookRows();
	const [selectedOptionKey, setSelectedOptionKey] = useState<string | null>(null);
	const { showOrderbookInQuote } = useGlobalSettings();
	const { setShowOrderbookInQuote } = useGlobalSettingsActions();

	const { data: selectedMarket } = useSelectedMarketInfo();
	const name = selectedMarket?.name ?? "";
	const szDecimals = selectedMarket?.szDecimals ?? 4;
	const referencePrice = toNumber(selectedMarket?.markPx) ?? undefined;
	const priceGroupingOptions = useMemo(() => getPriceGroupingOptions(referencePrice), [referencePrice]);
	const selectedOption = useMemo(
		() => priceGroupingOptions.find((option) => option.key === selectedOptionKey) ?? priceGroupingOptions[0] ?? null,
		[priceGroupingOptions, selectedOptionKey],
	);
	const priceDecimals = selectedOption?.decimals ?? szDecimalsToPriceDecimals(szDecimals);

	const { data: book, status: bookStatus } = useSubscription(
		"l2Book",
		{
			coin: name,
			nSigFigs: selectedOption?.nSigFigs ?? 5,
			mantissa: selectedOption?.mantissa,
		},
		{
			enabled: view === "book" && !!selectedMarket && !!name,
		},
	);

	const bids = useMemo(() => processLevels(book?.levels[0]), [book?.levels]);
	const asks = useMemo(() => processLevels(book?.levels[1]), [book?.levels]);

	const maxTotal = useMemo(() => {
		const totals = [...asks, ...bids].map((r) => r.total);
		return totals.length > 0 ? Math.max(...totals) : 0;
	}, [asks, bids]);

	const bestBid = bids[0]?.price;
	const bestAsk = asks[0]?.price;
	const mid = useMemo(() => {
		if (!Number.isFinite(bestBid) || !Number.isFinite(bestAsk)) return undefined;
		return (bestBid + bestAsk) / 2;
	}, [bestBid, bestAsk]);

	const [midDirection, setMidDirection] = useState<"up" | "down" | "flat">("flat");
	const lastMidRef = useRef<number | undefined>(undefined);

	useEffect(() => {
		if (typeof mid !== "number" || !Number.isFinite(mid)) return;
		const last = lastMidRef.current;
		if (typeof last === "number" && Number.isFinite(last)) {
			if (mid > last) setMidDirection("up");
			else if (mid < last) setMidDirection("down");
			else setMidDirection("flat");
		}
		lastMidRef.current = mid;
	}, [mid]);

	const spread = useMemo(() => {
		if (!Number.isFinite(bestBid) || !Number.isFinite(bestAsk)) return undefined;
		return bestAsk - bestBid;
	}, [bestAsk, bestBid]);

	const spreadPct = useMemo(() => {
		if (
			typeof spread !== "number" ||
			typeof mid !== "number" ||
			!Number.isFinite(spread) ||
			!Number.isFinite(mid) ||
			mid === 0
		) {
			return undefined;
		}
		return (spread / mid) * 100;
	}, [spread, mid]);

	const { baseToken, quoteToken } = useMemo(() => {
		if (!selectedMarket) return { baseToken: "", quoteToken: "" };
		return getBaseQuoteFromPairName(selectedMarket.pairName, selectedMarket.kind);
	}, [selectedMarket]);

	const hasMid = typeof mid === "number" && Number.isFinite(mid);
	const hasSpread =
		typeof spread === "number" &&
		Number.isFinite(spread) &&
		typeof spreadPct === "number" &&
		Number.isFinite(spreadPct);
	const displayUnit = showOrderbookInQuote ? quoteToken : baseToken;

	function toggleDisplayUnit() {
		setShowOrderbookInQuote(!showOrderbookInQuote);
	}

	return (
		<Tabs
			value={view}
			onValueChange={(value) => setView(value as View)}
			className={cn("flex flex-col h-full min-h-0 bg-surface", className)}
		>
			<TabsList className="shrink-0 px-3">
				<TabsTrigger value="book">{ORDERBOOK_TEXT.BOOK_LABEL}</TabsTrigger>
				<TabsTrigger value="trades">{ORDERBOOK_TEXT.TRADES_LABEL}</TabsTrigger>
			</TabsList>

			<TabsContent value="book" className="flex-1 min-h-0 flex flex-col overflow-hidden pt-0">
				<div className="shrink-0 h-8 px-3 flex items-center justify-between gap-2">
					<Dropdown
						triggerVariant="minimal"
						triggerAriaLabel="Price grouping"
						trigger={<span className="tabular-nums">{selectedOption?.label ?? FALLBACK_VALUE_PLACEHOLDER}</span>}
						align="start"
						triggerClassName="h-8 -ml-1 text-fg"
						popupClassName="min-w-28"
						items={priceGroupingOptions.map(
							(option): DropdownItem => ({
								label: option.label,
								active: option.key === selectedOption?.key,
								onSelect: () => setSelectedOptionKey(getPriceGroupingKey(option)),
							}),
						)}
					/>
					<Button
						variant="ghost"
						intent="neutral"
						size="sm"
						onClick={toggleDisplayUnit}
						aria-label="Toggle display units"
						iconRight={<ArrowsLeftRightIcon className="size-3 text-fg-muted" />}
						className="-mr-2 gap-1 font-normal"
					>
						{displayUnit || FALLBACK_VALUE_PLACEHOLDER}
					</Button>
				</div>

				<div className="shrink-0 grid h-6 grid-cols-3 items-center gap-2 px-3 text-2xs uppercase tracking-micro text-fg-muted">
					<span className="truncate">{ORDERBOOK_TEXT.HEADER_PRICE}</span>
					<button type="button" onClick={toggleDisplayUnit} className={HEADER_TOGGLE_CLASS}>
						{ORDERBOOK_TEXT.HEADER_SIZE} ({displayUnit})
					</button>
					<button type="button" onClick={toggleDisplayUnit} className={HEADER_TOGGLE_CLASS}>
						{ORDERBOOK_TEXT.HEADER_TOTAL} ({displayUnit})
					</button>
				</div>

				<div ref={rowsRef} className="flex-1 min-h-0 flex flex-col overflow-hidden">
					{bookStatus !== "error" && asks.length > 0 ? (
						<div className="flex-1 flex flex-col justify-end overflow-hidden">
							{asks
								.slice(0, visibleRows)
								.reverse()
								.map((level) => (
									<OrderbookRow
										key={`ask-${level.price}`}
										level={level}
										side="ask"
										maxTotal={maxTotal}
										priceDecimals={priceDecimals}
										showInQuote={showOrderbookInQuote}
										szDecimals={szDecimals}
									/>
								))}
						</div>
					) : (
						<div className="flex-1 flex items-center justify-center px-3">
							{bookStatus === "error" ? (
								<span className="text-xs text-market-down">{ORDERBOOK_TEXT.FAILED}</span>
							) : (
								<span className="flex items-center gap-2 text-xs text-fg-muted">
									<ArrowsClockwiseIcon className="size-4 animate-spin motion-reduce:animate-none" />
									{ORDERBOOK_TEXT.WAITING}
								</span>
							)}
						</div>
					)}

					<div
						data-slot="orderbook-spread"
						className="shrink-0 h-6 px-3 flex items-center justify-between gap-3 bg-band text-xs"
					>
						<span className={cn("flex items-center gap-1 font-medium tabular-nums", getMidColorClass(midDirection))}>
							{hasMid ? formatNumber(mid, 2) : FALLBACK_VALUE_PLACEHOLDER}
							{midDirection === "up" && <TrendUpIcon className="size-3" />}
							{midDirection === "down" && <TrendDownIcon className="size-3" />}
						</span>
						<span className="flex items-center gap-2">
							<span className="text-fg-muted">{ORDERBOOK_TEXT.SPREAD_LABEL}</span>
							<span className="tabular-nums text-fg-secondary">
								{hasSpread ? `${formatNumber(spread, 2)} (${formatNumber(spreadPct, 3)}%)` : FALLBACK_VALUE_PLACEHOLDER}
							</span>
						</span>
					</div>

					{bookStatus !== "error" && bids.length > 0 ? (
						<div className="flex-1 flex flex-col overflow-hidden">
							{bids.slice(0, visibleRows).map((level) => (
								<OrderbookRow
									key={`bid-${level.price}`}
									level={level}
									side="bid"
									maxTotal={maxTotal}
									priceDecimals={priceDecimals}
									showInQuote={showOrderbookInQuote}
									szDecimals={szDecimals}
								/>
							))}
						</div>
					) : (
						<div className="flex-1" />
					)}
				</div>
			</TabsContent>

			<TabsContent value="trades" className="flex-1 min-h-0 flex flex-col pt-0">
				<TradesPanel key={name} priceDecimals={priceDecimals} />
			</TabsContent>

			<MobileBottomNavSpacer />
		</Tabs>
	);
}

function getMidColorClass(direction: "up" | "down" | "flat"): string {
	if (direction === "up") return "text-market-up";
	if (direction === "down") return "text-market-down";
	return "text-fg";
}
