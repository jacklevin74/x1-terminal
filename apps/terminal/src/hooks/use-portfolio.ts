import { useQueries } from "@tanstack/react-query";
import { useState } from "react";
import { zeroAddress } from "viem";
import { HL_ALL_DEXS } from "@/config/app";
import { useTradingAccount } from "@/hooks/use-trading-account";
import { infoQueryOptions, useHyperliquid, useInfo, useSubscription } from "@/lib/hyperliquid";
import { mapAccount, mapHistory, mapRows } from "@/lib/portfolio/map";
import type { PortfolioData } from "@/lib/portfolio/model";

const REFRESH_MS = 30_000;
const FUNDING_WINDOW_MS = 24 * 60 * 60 * 1000;

export function usePortfolio(viewAddress?: `0x${string}`): { address: `0x${string}` | undefined; data: PortfolioData } {
	const { address, isConnected } = useTradingAccount();
	const own = isConnected && address ? address : undefined;
	const user = viewAddress ?? own;
	const enabled = !!user;
	const u = user ?? zeroAddress;
	const live = { enabled, refetchInterval: REFRESH_MS };
	const [fundingStart] = useState(() => Date.now() - FUNDING_WINDOW_MS);
	const { info } = useHyperliquid();

	const portfolio = useInfo("portfolio", { user: u }, live);
	const main = useInfo("clearinghouseState", { user: u }, live);
	const dexs = useInfo("perpDexs", undefined, { enabled, staleTime: 300_000 });
	const builderDexs = (dexs.data ?? []).flatMap((d) => (d?.name ? [d.name] : []));
	const builders = useQueries({
		queries: builderDexs.map((dex) => ({
			...infoQueryOptions(info, "clearinghouseState", { user: u, dex }),
			...live,
		})),
	});
	const spot = useInfo("spotClearinghouseState", { user: u }, live);
	const spotMeta = useInfo("spotMetaAndAssetCtxs", undefined, live);
	const fills = useInfo("userFills", { user: u }, live);
	const funding = useInfo("userFunding", { user: u, startTime: fundingStart }, live);
	const ledger = useInfo("userNonFundingLedgerUpdates", { user: u, startTime: 0 }, live);
	const openOrders = useInfo("frontendOpenOrders", { user: u, dex: HL_ALL_DEXS }, live);
	const orderHistory = useInfo("historicalOrders", { user: u }, live);
	const twaps = useSubscription("twapStates", { user: u, dex: HL_ALL_DEXS }, { enabled });

	const builderStates = builders.flatMap((q) => (q.data ? [q.data] : []));
	const states = main.data ? [main.data, ...builderStates] : [];
	const src = {
		address: u,
		now: Date.now(),
		portfolio: portfolio.data,
		states,
		spot: spot.data,
		spotMeta: spotMeta.data,
		fills: fills.data,
		funding: funding.data,
		ledger: ledger.data,
		openOrders: openOrders.data,
		orderHistory: orderHistory.data,
		twaps: twaps.data?.states,
	};
	const summaryLoading = main.isPending || spot.isPending;

	return {
		address: user,
		data: {
			history: mapHistory(portfolio.data),
			account: mapAccount(src),
			rows: mapRows(src),
			loading: {
				summary: summaryLoading || portfolio.isPending,
				chart: portfolio.isPending,
				balances: summaryLoading,
				positions: main.isPending,
				orders: openOrders.isPending,
				twap: !twaps.data,
				history: fills.isPending,
				funding: funding.isPending,
				"orders-history": orderHistory.isPending,
				ledger: ledger.isPending,
			},
			failed: {
				balances: (main.isError && !main.data) || (spot.isError && !spot.data),
				positions: main.isError && !main.data,
				orders: openOrders.isError && !openOrders.data,
				twap: twaps.status === "error",
				history: fills.isError && !fills.data,
				funding: funding.isError && !funding.data,
				"orders-history": orderHistory.isError && !orderHistory.data,
				ledger: ledger.isError && !ledger.data,
			},
		},
	};
}
