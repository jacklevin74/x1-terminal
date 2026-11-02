import { useLayoutEffect, useRef } from "react";
import { APP_PANEL_CLASS } from "@/config/layout";
import { cn } from "@/lib/cn";
import { useSelectedMarketInfo } from "@/lib/hyperliquid";
import { AccountPanel } from "../tradebox/account-panel";
import { TradePanel } from "../tradebox/trade-panel";

const panelGapPx = 4;

interface Props {
	onDesiredHeightChange?: (heightPx: number) => void;
}

export function TradeSidebar({ onDesiredHeightChange }: Props) {
	const tradeRef = useRef<HTMLDivElement>(null);
	const accountRef = useRef<HTMLDivElement>(null);
	const { data: market } = useSelectedMarketInfo();
	const formKey = market?.name ?? "default";

	useLayoutEffect(() => {
		const trade = tradeRef.current;
		const account = accountRef.current;
		if (!trade || !account) return;
		const tradeEl: HTMLDivElement = trade;
		const accountEl: HTMLDivElement = account;
		function measure() {
			onDesiredHeightChange?.(
				Math.ceil(tradeEl.getBoundingClientRect().height + accountEl.getBoundingClientRect().height + panelGapPx),
			);
		}
		measure();
		const observer = typeof ResizeObserver !== "undefined" ? new ResizeObserver(measure) : null;
		observer?.observe(trade);
		observer?.observe(account);
		window.addEventListener("resize", measure);
		return () => {
			observer?.disconnect();
			window.removeEventListener("resize", measure);
		};
	}, [onDesiredHeightChange]);

	return (
		<div className="flex h-full min-h-0 flex-col gap-1">
			<div ref={tradeRef} className={cn(APP_PANEL_CLASS, "shrink-0")}>
				<TradePanel key={formKey} />
			</div>
			<div className={cn(APP_PANEL_CLASS, "flex-1")}>
				<div ref={accountRef}>
					<AccountPanel />
				</div>
			</div>
		</div>
	);
}
