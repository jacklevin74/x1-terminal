import { Button } from "@hypeterminal/ui";
import { t } from "@lingui/core/macro";
import { cn } from "@/lib/cn";
import {
	chartToolbarChipClass,
	chartToolbarDividerClass,
	getChartToolbarChipStateClass,
} from "./chart-toolbar-classes";

export type ChartSource = "default" | "tradingview";

export type ChartSourceToggleIntentHandlers = {
	onMouseEnter?: () => void;
	onFocus?: () => void;
	onPointerDown?: () => void;
	onTouchStart?: () => void;
};

interface Props {
	value: ChartSource;
	onValueChange: (value: ChartSource) => void;
	tradingViewIntentHandlers: ChartSourceToggleIntentHandlers;
	className?: string;
}

export function ChartSourceToggle({ value, onValueChange, tradingViewIntentHandlers, className }: Props) {
	function handleDefaultClick() {
		onValueChange("default");
	}

	function handleTradingViewClick() {
		onValueChange("tradingview");
	}

	return (
		<div className={cn("inline-flex shrink-0 items-center gap-1", className)}>
			<Button
				type="button"
				aria-pressed={value === "default"}
				onClick={handleDefaultClick}
				variant="ghost"
				intent="neutral"
				size="xxs"
				className={cn(chartToolbarChipClass, getChartToolbarChipStateClass(value === "default"))}
			>
				{t`Default`}
			</Button>
			<span className={chartToolbarDividerClass} aria-hidden />
			<Button
				type="button"
				aria-pressed={value === "tradingview"}
				onClick={handleTradingViewClick}
				{...tradingViewIntentHandlers}
				variant="ghost"
				intent="neutral"
				size="xxs"
				className={cn(chartToolbarChipClass, getChartToolbarChipStateClass(value === "tradingview"))}
			>
				{t`TradingView`}
			</Button>
		</div>
	);
}
