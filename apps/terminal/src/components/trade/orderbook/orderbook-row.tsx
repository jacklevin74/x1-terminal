import { memo } from "react";
import { cn } from "@/lib/cn";
import { formatNumber } from "@/lib/format";
import type { BookLevel } from "@/lib/trade/orderbook";
import { useOrderbookActions } from "@/stores/use-orderbook-actions-store";

interface Props {
	level: BookLevel;
	side: "ask" | "bid";
	maxTotal: number;
	priceDecimals: number;
	showInQuote?: boolean;
	szDecimals: number;
}

function OrderbookRowComponent({ level, side, maxTotal, priceDecimals, showInQuote = false, szDecimals }: Props) {
	const { setSelectedPrice } = useOrderbookActions();
	const depthPct = maxTotal > 0 ? (level.total / maxTotal) * 100 : 0;
	const isAsk = side === "ask";

	const sizeValue = showInQuote ? level.size * level.price : level.size;
	const totalValue = showInQuote ? level.total * level.price : level.total;

	const displayDecimals = showInQuote ? 2 : szDecimals;
	const sizeText = formatNumber(sizeValue, { decimals: displayDecimals, compact: true });
	const totalText = formatNumber(totalValue, { decimals: displayDecimals, compact: true });

	return (
		<div className="group relative h-5 shrink-0 cursor-pointer transition-colors duration-150 hover:bg-control/50 motion-reduce:transition-none">
			<div
				className={cn("pointer-events-none absolute inset-y-0 right-0", isAsk ? "depth-bar-ask" : "depth-bar-bid")}
				style={{ width: `${depthPct}%` }}
			/>
			<div className="relative z-10 grid h-full grid-cols-3 items-center gap-2 px-3 text-xs font-normal tabular-nums">
				<button
					type="button"
					onClick={() => setSelectedPrice(level.price)}
					className={cn(
						"cursor-pointer truncate text-left focus-visible:underline focus-visible:outline-none",
						isAsk ? "text-market-down" : "text-market-up",
					)}
				>
					{formatNumber(level.price, priceDecimals)}
				</button>
				<div className="truncate text-right text-fg-secondary">{sizeText}</div>
				<div className="truncate text-right text-fg-secondary">{totalText}</div>
			</div>
		</div>
	);
}

function areEqual(prev: Props, next: Props): boolean {
	return (
		prev.side === next.side &&
		prev.maxTotal === next.maxTotal &&
		prev.priceDecimals === next.priceDecimals &&
		prev.showInQuote === next.showInQuote &&
		prev.szDecimals === next.szDecimals &&
		prev.level.price === next.level.price &&
		prev.level.size === next.level.size &&
		prev.level.total === next.level.total
	);
}

export const OrderbookRow = memo(OrderbookRowComponent, areEqual);
