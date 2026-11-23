import { APP_PANEL_CLASS } from "@/config/layout";
import { useTradeMode } from "@/hooks/use-trade-mode";
import { cn } from "@/lib/cn";
import { useSelectedMarketInfo } from "@/lib/hyperliquid";
import { AutoTradePanel } from "../auto/auto-trade-panel";
import { TradeModeSwitch } from "../auto/trade-mode-switch";
import { AccountPanel } from "../tradebox/account-panel";
import { TradePanel } from "../tradebox/trade-panel";

export function TradeSidebar() {
	const { data: market } = useSelectedMarketInfo();
	const formKey = market?.name ?? "default";
	const mode = useTradeMode();

	return (
		<div className="flex h-full min-h-0 flex-col gap-1 overflow-y-auto scrollbar-none">
			<div className={cn(APP_PANEL_CLASS, "shrink-0")}>
				<TradeModeSwitch mode={mode} />
				{mode === "auto" ? <AutoTradePanel /> : <TradePanel key={formKey} />}
			</div>
			<div className={cn(APP_PANEL_CLASS, "flex-1")}>
				<AccountPanel />
			</div>
		</div>
	);
}
