import { useEffect } from "react";
import { DEFAULT_MARKET_NAME } from "@/config/app";
import { DEFAULT_SELECTED_MARKETS } from "@/config/markets";
import type { ExchangeScope } from "@/domain/market";
import { useMarketsInfo } from "@/lib/hyperliquid/hooks/useMarketsInfo";
import { useExchangeScope } from "@/providers/exchange-scope";
import { useMarketActions, useSelectedMarket } from "@/stores/use-market-store";

export const MARKET_FALLBACK_DELAY_MS = 4000;

/**
 * Pure: the market to switch to when `selected` can't be resolved once the market list has loaded, or null to keep it.
 * The scope default first (BTC for all/perp), then BTC; never a market that doesn't resolve either.
 */
export function fallbackMarket(
	scope: ExchangeScope,
	selected: string,
	hasMarket: (name: string) => boolean,
	listLoaded: boolean,
): string | null {
	if (!listLoaded || hasMarket(selected)) return null;
	for (const name of [DEFAULT_SELECTED_MARKETS[scope], DEFAULT_MARKET_NAME]) {
		if (name && name !== selected && hasMarket(name)) return name;
	}
	return null;
}

/**
 * A persisted selection that no longer resolves (delisted, other network, stale cache) left the trade view blank:
 * no header, no order book, no chart. After the market list has loaded, wait a moment, then fall back to a default.
 */
export function useSelectedMarketFallback(delayMs = MARKET_FALLBACK_DELAY_MS) {
	const { scope } = useExchangeScope();
	const selected = useSelectedMarket();
	const { getMarketInfo, isLoading, markets } = useMarketsInfo();
	const { setSelectedMarket } = useMarketActions();
	const listLoaded = !isLoading && markets.length > 0;
	const resolved = !!getMarketInfo(selected);

	useEffect(() => {
		if (!listLoaded || resolved) return;
		const timer = setTimeout(() => {
			const next = fallbackMarket(scope, selected, (n) => !!getMarketInfo(n), listLoaded);
			if (next) setSelectedMarket(scope, next);
		}, delayMs);
		return () => clearTimeout(timer);
	}, [listLoaded, resolved, scope, selected, getMarketInfo, setSelectedMarket, delayMs]);
}
