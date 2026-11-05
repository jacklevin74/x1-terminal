import { ClientOnly } from "@tanstack/react-router";
import { Suspense, useCallback, useState } from "react";
import { useDefaultLayout } from "react-resizable-panels";
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable";
import {
	APP_PANEL_CLASS,
	APP_PANEL_GAP_CLASS,
	APP_PANEL_INSET_CLASS,
	APP_PANEL_PADDING_X_CLASS,
	PANEL_LAYOUT,
} from "@/config/layout";
import { cn } from "@/lib/cn";
import { useSelectedMarketInfo } from "@/lib/hyperliquid";
import { createLazyComponent } from "@/lib/lazy";
import { useExchangeScope } from "@/providers/exchange-scope";
import { useMarketActions } from "@/stores/use-market-store";
import { TokenSelector } from "../chart/token-selector";
import { FavoritesStrip } from "../header/favorites-strip";
import { MarketOverview } from "../market-overview";

const AnalysisSection = createLazyComponent(() => import("./analysis-section"), "AnalysisSection");
const TradeSidebar = createLazyComponent(() => import("./trade-sidebar"), "TradeSidebar");

const { id, analysis, sidebar } = PANEL_LAYOUT.MAIN;

export function MainWorkspace() {
	const { defaultLayout, onLayoutChanged } = useDefaultLayout({ id });
	const { data: selectedMarket } = useSelectedMarketInfo();
	const { scope } = useExchangeScope();
	const { setSelectedMarket } = useMarketActions();
	const [marketBodyMinHeightPx, setMarketBodyMinHeightPx] = useState<number>(PANEL_LAYOUT.ANALYSIS.minHeightPx);
	const [sidebarMinHeightPx, setSidebarMinHeightPx] = useState(0);
	const sharedMinHeightPx = Math.max(marketBodyMinHeightPx, sidebarMinHeightPx);

	const handleAnalysisHeightChange = useCallback((heightPx: number) => {
		setMarketBodyMinHeightPx(Math.max(PANEL_LAYOUT.ANALYSIS.minHeightPx, Math.ceil(heightPx)));
	}, []);

	function handleMarketChange(marketName: string) {
		setSelectedMarket(scope, marketName);
	}

	return (
		<div className={cn("flex-1 flex flex-col bg-background", APP_PANEL_GAP_CLASS, APP_PANEL_INSET_CLASS)}>
			<div className={cn(APP_PANEL_CLASS, APP_PANEL_PADDING_X_CLASS, "shrink-0")}>
				<FavoritesStrip />
				<div className="flex h-12 min-w-0 items-center gap-6">
					<TokenSelector selectedMarket={selectedMarket} onValueChange={handleMarketChange} />
					<div className="min-w-0 flex-1 overflow-x-auto scrollbar-none">
						<MarketOverview />
					</div>
				</div>
			</div>
			<ResizablePanelGroup
				className="h-auto flex-1 basis-0"
				defaultLayout={defaultLayout}
				onLayoutChanged={onLayoutChanged}
				style={{ minHeight: sharedMinHeightPx }}
			>
				<ResizablePanel defaultSize={analysis.defaultSize} minSize={analysis.minSize}>
					<div className="h-full min-h-0">
						<Suspense fallback={<PanelSkeleton />}>
							<ClientOnly fallback={<PanelSkeleton />}>
								<AnalysisSection onDesiredHeightChange={handleAnalysisHeightChange} />
							</ClientOnly>
						</Suspense>
					</div>
				</ResizablePanel>
				<ResizableHandle withHandle />
				<ResizablePanel defaultSize={sidebar.defaultSize} minSize={sidebar.minSize}>
					<Suspense fallback={<SidebarSkeleton />}>
						<TradeSidebar onDesiredHeightChange={setSidebarMinHeightPx} />
					</Suspense>
				</ResizablePanel>
			</ResizablePanelGroup>
		</div>
	);
}

function PanelSkeleton() {
	return <div className={cn(APP_PANEL_CLASS, "h-full animate-pulse")} />;
}

function SidebarSkeleton() {
	return (
		<div className={cn(APP_PANEL_CLASS, "h-full space-y-3 p-3")}>
			<div className="h-8 rounded-8 bg-control animate-pulse" />
			<div className="h-24 rounded-8 bg-control animate-pulse" />
			<div className="h-48 rounded-8 bg-control animate-pulse" />
			<div className="h-20 rounded-8 bg-control animate-pulse" />
		</div>
	);
}
