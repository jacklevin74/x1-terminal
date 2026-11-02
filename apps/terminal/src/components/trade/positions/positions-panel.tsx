import { Tabs, TabsContent, TabsList, TabsTrigger } from "@hypeterminal/ui";
import { t } from "@lingui/core/macro";
import { Suspense, useMemo, useState, useTransition } from "react";
import { useConnection } from "wagmi";
import { HL_ALL_DEXS } from "@/config/app";
import { POSITIONS_TABS } from "@/config/trade";
import { useDefaultDexBalances } from "@/hooks/trade/use-account-balances";
import { useSubscription, useUserPositions } from "@/lib/hyperliquid";
import { createLazyComponent } from "@/lib/lazy";
import { useRenderCommitTrack } from "@/lib/performance/render-profile";
import { toNumberOrZero } from "@/lib/trade/numbers";
import { useGlobalSettingsActions, usePositionsActiveTab } from "@/stores/use-global-settings-store";
import { AccountToolbarContext } from "./account-table-toolbar";
import { LoadingRows } from "./loading-rows";

const tabContentClass = "flex min-h-0 flex-1 flex-col pt-0";

const BalancesTab = createLazyComponent(() => import("./balances-tab"), "BalancesTab");
const FundingTab = createLazyComponent(() => import("./funding-tab"), "FundingTab");
const HistoryTab = createLazyComponent(() => import("./history-tab"), "HistoryTab");
const OrdersHistoryTab = createLazyComponent(() => import("./orders-history-tab"), "OrdersHistoryTab");
const OrdersTab = createLazyComponent(() => import("./orders-tab"), "OrdersTab");
const PositionsTab = createLazyComponent(() => import("./positions-tab"), "PositionsTab");
const TwapTab = createLazyComponent(() => import("./twap-tab"), "TwapTab");

export function PositionsPanel() {
	useRenderCommitTrack("positions-table");
	const activeTab = usePositionsActiveTab();
	const [toolbarTarget, setToolbarTarget] = useState<HTMLDivElement | null>(null);
	const { setPositionsActiveTab } = useGlobalSettingsActions();
	const [, startTransition] = useTransition();
	const { address, isConnected } = useConnection();
	const { perpSummary, spotBalances } = useDefaultDexBalances();
	const { positions } = useUserPositions();
	const { data: ordersEvent } = useSubscription(
		"openOrders",
		{ user: address ?? "0x0", dex: HL_ALL_DEXS },
		{ enabled: isConnected && !!address },
	);
	const { data: twapStatesEvent } = useSubscription(
		"twapStates",
		{ user: address ?? "0x0", dex: HL_ALL_DEXS },
		{ enabled: isConnected && !!address },
	);
	const openOrders = ordersEvent?.orders;
	const twapCount = isConnected ? (twapStatesEvent?.states?.length ?? 0) : null;

	function handleTabChange(value: string) {
		startTransition(() => setPositionsActiveTab(value));
	}

	const positionsCount = isConnected ? positions.length : null;

	const ordersCount = isConnected ? (openOrders?.length ?? 0) : null;

	const balancesCount = useMemo(() => {
		if (!isConnected) return null;
		let count = 0;
		const perpAccountValue = toNumberOrZero(perpSummary?.accountValue);
		if (perpAccountValue > 0) count++;
		if (spotBalances.length) {
			for (const b of spotBalances) {
				if (toNumberOrZero(b.total) > 0) count++;
			}
		}
		return count;
	}, [isConnected, perpSummary?.accountValue, spotBalances]);

	function getTabCount(tabValue: string): number | null {
		if (tabValue === "balances") return balancesCount;
		if (tabValue === "positions") return positionsCount;
		if (tabValue === "orders") return ordersCount;
		if (tabValue === "twap") return twapCount;
		return null;
	}

	return (
		<AccountToolbarContext.Provider value={{ target: toolbarTarget, activeTab }}>
			<Tabs value={activeTab} onValueChange={handleTabChange} className="flex h-full min-h-0 flex-col overflow-hidden">
				<div className="flex h-9 shrink-0 items-center gap-3 border-b border-stroke-weak px-3">
					<div className="min-w-0 flex-1 overflow-x-auto scrollbar-none">
						<TabsList className="h-9 min-w-max border-b-0">
							{POSITIONS_TABS.map((tab) => {
								const count = getTabCount(tab.value);
								return (
									<TabsTrigger key={tab.value} value={tab.value}>
										{tab.label}
										{typeof count === "number" ? <span className="tabular-nums text-fg-muted">{count}</span> : null}
									</TabsTrigger>
								);
							})}
						</TabsList>
					</div>
					<div ref={setToolbarTarget} className="min-w-0 max-w-11/20 shrink-0 overflow-x-auto scrollbar-none" />
				</div>
				<TabsContent value="balances" className={tabContentClass}>
					<Suspense fallback={<TabLoadingFallback />}>
						<BalancesTab />
					</Suspense>
				</TabsContent>
				<TabsContent value="positions" className={tabContentClass}>
					<Suspense fallback={<TabLoadingFallback />}>
						<PositionsTab />
					</Suspense>
				</TabsContent>
				<TabsContent value="orders" className={tabContentClass}>
					<Suspense fallback={<TabLoadingFallback />}>
						<OrdersTab />
					</Suspense>
				</TabsContent>
				<TabsContent value="twap" className={tabContentClass}>
					<Suspense fallback={<TabLoadingFallback />}>
						<TwapTab />
					</Suspense>
				</TabsContent>
				<TabsContent value="orders-history" className={tabContentClass}>
					<Suspense fallback={<TabLoadingFallback />}>
						<OrdersHistoryTab />
					</Suspense>
				</TabsContent>
				<TabsContent value="history" className={tabContentClass}>
					<Suspense fallback={<TabLoadingFallback />}>
						<HistoryTab />
					</Suspense>
				</TabsContent>
				<TabsContent value="funding" className={tabContentClass}>
					<Suspense fallback={<TabLoadingFallback />}>
						<FundingTab />
					</Suspense>
				</TabsContent>
			</Tabs>
		</AccountToolbarContext.Provider>
	);
}

function TabLoadingFallback() {
	return <LoadingRows label={t`Loading...`} />;
}
