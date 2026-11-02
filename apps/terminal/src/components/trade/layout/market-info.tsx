import { useDefaultLayout } from "react-resizable-panels";
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable";
import { APP_PANEL_CLASS, PANEL_LAYOUT } from "@/config/layout";
import { cn } from "@/lib/cn";
import { useSelectedMarketInfo } from "@/lib/hyperliquid";
import { ChartPanel } from "../chart/chart-panel";
import { OrderbookPanel } from "../orderbook/orderbook-panel";

const { id, chart, orderbook } = PANEL_LAYOUT.MARKET;

export function MarketInfo() {
	const { defaultLayout, onLayoutChanged } = useDefaultLayout({ id });
	const { data: market } = useSelectedMarketInfo();
	const orderbookKey = market?.name ?? "default";

	return (
		<div className="h-full min-h-0">
			<ResizablePanelGroup
				orientation="horizontal"
				className="h-full min-h-0"
				defaultLayout={defaultLayout}
				onLayoutChanged={onLayoutChanged}
			>
				<ResizablePanel defaultSize={chart.defaultSize} minSize={chart.minSize}>
					<div className={cn(APP_PANEL_CLASS, "h-full")}>
						<ChartPanel />
					</div>
				</ResizablePanel>
				<ResizableHandle />
				<ResizablePanel defaultSize={orderbook.defaultSize} minSize={orderbook.minSize}>
					<div className={cn(APP_PANEL_CLASS, "h-full")}>
						<OrderbookPanel key={orderbookKey} />
					</div>
				</ResizablePanel>
			</ResizablePanelGroup>
		</div>
	);
}
