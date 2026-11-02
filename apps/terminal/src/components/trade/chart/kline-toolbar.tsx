import { Button, Dropdown } from "@hypeterminal/ui";
import { t } from "@lingui/core/macro";
import { CHART_TYPES, type ChartTypeConfig } from "@/config/chart";
import { FAVORITE_SET, type IntervalConfig, MORE_INTERVALS, STARRED_INTERVALS } from "@/lib/chart/kline-config";
import { cn } from "@/lib/cn";
import { type ChartSource, ChartSourceToggle, type ChartSourceToggleIntentHandlers } from "./chart-source-toggle";
import {
	chartToolbarChipClass,
	chartToolbarDividerClass,
	getChartToolbarChipStateClass,
} from "./chart-toolbar-classes";

interface Props {
	activeInterval: IntervalConfig;
	onIntervalChange: (interval: IntervalConfig) => void;
	activeChartType: ChartTypeConfig;
	onChartTypeChange: (chartType: ChartTypeConfig) => void;
	onChartSourceChange?: (source: ChartSource) => void;
	tradingViewIntentHandlers?: ChartSourceToggleIntentHandlers;
}

const textTriggerClass = "max-md:h-8 text-fg-muted";

export function KlineToolbar({
	activeInterval,
	onIntervalChange,
	activeChartType,
	onChartTypeChange,
	onChartSourceChange,
	tradingViewIntentHandlers,
}: Props) {
	const isNonFavoriteActive = !FAVORITE_SET.has(activeInterval.resolution);

	return (
		<div
			data-chart-toolbar
			className="flex h-8 min-w-0 shrink-0 items-center justify-between gap-2 border-b border-stroke-weak px-3"
		>
			<div className="flex min-w-0 flex-1 items-center gap-1 overflow-x-auto">
				{STARRED_INTERVALS.map((interval) => {
					const isActive = activeInterval.resolution === interval.resolution;
					return (
						<Button
							key={interval.resolution}
							type="button"
							aria-pressed={isActive}
							onClick={() => onIntervalChange(interval)}
							variant="ghost"
							intent="neutral"
							size="xxs"
							className={cn(chartToolbarChipClass, getChartToolbarChipStateClass(isActive))}
						>
							{interval.label}
						</Button>
					);
				})}
				<Dropdown
					trigger={<span className="text-fg">{isNonFavoriteActive ? activeInterval.label : null}</span>}
					items={MORE_INTERVALS.map((interval) => ({
						label: interval.label,
						active: activeInterval.resolution === interval.resolution,
						onSelect: () => onIntervalChange(interval),
					}))}
					align="start"
					size="sm"
					triggerVariant="minimal"
					triggerAriaLabel={t`More intervals`}
					triggerClassName={textTriggerClass}
					className="inline-flex shrink-0"
					popupClassName="min-w-0 w-max"
				/>
				<span className={chartToolbarDividerClass} aria-hidden />
				<Dropdown
					trigger={<span className="text-fg">{activeChartType.label}</span>}
					items={CHART_TYPES.map((ct) => ({
						label: ct.label,
						active: activeChartType.type === ct.type,
						onSelect: () => onChartTypeChange(ct),
					}))}
					align="start"
					size="sm"
					triggerVariant="minimal"
					triggerAriaLabel={t`Chart type`}
					triggerClassName={textTriggerClass}
					className="inline-flex shrink-0"
					popupClassName="min-w-0 w-max"
				/>
			</div>
			{onChartSourceChange && tradingViewIntentHandlers ? (
				<ChartSourceToggle
					value="default"
					onValueChange={onChartSourceChange}
					tradingViewIntentHandlers={tradingViewIntentHandlers}
				/>
			) : null}
		</div>
	);
}
