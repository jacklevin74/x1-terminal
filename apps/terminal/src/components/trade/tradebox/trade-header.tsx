import { Button, Dropdown, Tabs, TabsList, TabsTrigger } from "@hypeterminal/ui";
import { t } from "@lingui/core/macro";
import type { OrderType } from "@/config/trade";
import type { SideLabels } from "@/config/ui-text";
import { cn } from "@/lib/cn";
import type { MarketKind } from "@/lib/hyperliquid";
import type { MarginMode } from "@/lib/trade/margin-mode";
import { getAdvancedOrderLabel, getTabsOrderType } from "@/lib/trade/order-types";
import type { Side } from "@/lib/trade/types";
import { SideToggle } from "./side-toggle";

interface Props {
	orderType: OrderType;
	side: Side;
	sideLabels: SideLabels;
	marketKind: MarketKind | undefined;
	onOrderTypeChange: (type: OrderType) => void;
	onSideChange: (side: Side) => void;
	marginMode?: MarginMode;
	leverage?: number;
	onMarginLeverageClick?: () => void;
	isLeveraged?: boolean;
	insetClassName?: string;
}

const moreTriggerClass =
	"h-7 max-md:h-8 gap-1 px-3 text-fg-muted hover:text-fg data-[popup-open]:text-fg focus-visible:outline-offset-2";

export function TradeHeader({
	orderType,
	side,
	sideLabels,
	marketKind,
	onOrderTypeChange,
	onSideChange,
	marginMode,
	leverage,
	onMarginLeverageClick,
	isLeveraged,
	insetClassName,
}: Props) {
	const tabsOrderType = getTabsOrderType(orderType);
	const isAdvanced = tabsOrderType === "advanced";
	const moreLabel = getAdvancedOrderLabel(orderType, t`More`);

	const isSpot = marketKind === "spot";
	const advancedItems = [
		...(!isSpot
			? [
					{
						label: t`Stop Market`,
						active: orderType === "stopMarket",
						onSelect: () => onOrderTypeChange("stopMarket"),
					},
					{
						label: t`Stop Limit`,
						active: orderType === "stopLimit",
						onSelect: () => onOrderTypeChange("stopLimit"),
					},
				]
			: []),
		{ label: t`TWAP`, active: orderType === "twap", onSelect: () => onOrderTypeChange("twap") },
		{ label: t`Scale`, active: orderType === "scale", onSelect: () => onOrderTypeChange("scale") },
	];

	const marginLabel = marginMode === "isolated" ? t`Isolated` : t`Cross`;

	function handleTabChange(value: unknown) {
		if (value === "market" || value === "limit") onOrderTypeChange(value);
	}

	return (
		<div className="flex min-w-0 flex-col">
			<div className={cn("flex h-9 items-center gap-1 border-b border-stroke-weak max-md:h-10", insetClassName)}>
				<Tabs value={tabsOrderType} onValueChange={handleTabChange} className="h-full">
					<TabsList className="h-full max-md:h-full border-b-0">
						<TabsTrigger value="market">{t`Market`}</TabsTrigger>
						<TabsTrigger value="limit">{t`Limit`}</TabsTrigger>
					</TabsList>
				</Tabs>
				<Dropdown
					trigger={
						<span className="inline-grid">
							<span aria-hidden="true" className="invisible col-start-1 row-start-1 font-medium">
								{moreLabel}
							</span>
							<span className="col-start-1 row-start-1">{moreLabel}</span>
						</span>
					}
					items={advancedItems}
					align="start"
					triggerVariant="minimal"
					triggerAriaLabel={t`Order type`}
					triggerClassName={cn(moreTriggerClass, isAdvanced && "bg-control font-medium text-fg")}
				/>
			</div>

			<div className={cn("flex min-w-0 flex-col gap-2 pt-3", insetClassName)}>
				{isLeveraged && (
					<div className="grid grid-cols-2 gap-2">
						<Button variant="secondary" intent="neutral" size="sm" onClick={onMarginLeverageClick}>
							{marginLabel}
						</Button>
						<Button
							variant="secondary"
							intent="neutral"
							size="sm"
							onClick={onMarginLeverageClick}
							className="tabular-nums"
						>
							{leverage ?? 1}x
						</Button>
					</div>
				)}

				<SideToggle side={side} onSideChange={onSideChange} labels={sideLabels} />
			</div>
		</div>
	);
}
