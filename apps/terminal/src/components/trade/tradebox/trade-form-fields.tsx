import { Button, Checkbox, Slider, Tooltip } from "@hypeterminal/ui";
import { t } from "@lingui/core/macro";
import { useId, useState } from "react";
import { useConnection } from "wagmi";
import { Collapse } from "@/components/ui/collapse";
import { InfoRow, InfoRowGroup } from "@/components/ui/info-row";
import { NumberInput } from "@/components/ui/number-input";
import { PriceInput } from "@/components/ui/price-input";
import { FALLBACK_VALUE_PLACEHOLDER } from "@/config/app";
import { ORDER_MIN_NOTIONAL_USD, SIZE_PERCENT_OPTIONS } from "@/config/trade";
import { getSliderValue } from "@/domain/trade/order/size";
import { useOrderEntryData } from "@/hooks/trade/use-order-entry-data";
import { formatToken } from "@/lib/format";
import { useSelectedMarketInfo } from "@/lib/hyperliquid";
import { formatDecimalFloor, isPositive, toNumber, toNumberOrZero } from "@/lib/trade/numbers";
import {
	canUseTpSl as canUseTpSlForOrder,
	isScaleOrderType,
	isTriggerOrderType,
	isTwapOrderType,
	usesLimitPrice as usesLimitPriceForOrder,
	usesTriggerPrice as usesTriggerPriceForOrder,
} from "@/lib/trade/order-types";
import { getValueColorClass } from "@/lib/ui/value-color";
import {
	useLimitPrice,
	useOrderEntryActions,
	useOrderSide,
	useOrderSize,
	useOrderType,
	useReduceOnly,
	useSizeMode,
	useTpSlEnabled,
	useTriggerPrice,
} from "@/stores/use-order-entry-store";
import { TradeFormScale } from "./trade-form-scale";
import { TradeFormTif } from "./trade-form-tif";
import { TradeFormTpSl } from "./trade-form-tp-sl";
import { TradeFormTwap } from "./trade-form-twap";

interface Props {
	price: number;
	positionSize: number;
	swapTargetToken: string | null;
	onSizeModeToggle: () => void;
	onSizePercentApply: (pct: number) => void;
	onDepositClick: () => void;
	onSwapClick: () => void;
}

export function TradeFormFields({
	price,
	positionSize,
	swapTargetToken,
	onSizeModeToggle,
	onSizePercentApply,
	onDepositClick,
	onSwapClick,
}: Props) {
	const sizeFieldId = useId();
	const [isDraggingSlider, setIsDraggingSlider] = useState(false);
	const [dragSliderValue, setDragSliderValue] = useState(0);
	const [percentInput, setPercentInput] = useState<string | null>(null);

	const { isConnected } = useConnection();
	const { data: market } = useSelectedMarketInfo();

	const side = useOrderSide();
	const sizeMode = useSizeMode();
	const sizeInput = useOrderSize();
	const orderType = useOrderType();
	const limitPriceInput = useLimitPrice();
	const triggerPriceInput = useTriggerPrice();
	const reduceOnly = useReduceOnly();
	const tpSlEnabled = useTpSlEnabled();

	const markPx = toNumberOrZero(market?.markPx);

	const {
		isSpotMarket,
		baseToken,
		capabilities,
		availableBalance,
		availableBalanceToken,
		maxSize,
		sizeValue,
		orderValue,
		sizeModeLabel,
		szDecimals,
	} = useOrderEntryData({ market, side, markPx, sizeMode, sizeInput });

	const { setSize, setLimitPrice, setTriggerPrice, setReduceOnly, setTpSlEnabled } = useOrderEntryActions();

	const isFormDisabled = !isConnected || availableBalance <= 0;

	const triggerOrder = isTriggerOrderType(orderType);
	const twapOrder = isTwapOrderType(orderType);
	const scaleOrder = isScaleOrderType(orderType);
	const usesLimitPrice = usesLimitPriceForOrder(orderType);
	const usesTriggerPrice = usesTriggerPriceForOrder(orderType);
	const canUseTpSl = canUseTpSlForOrder(orderType);
	const showTif = orderType === "limit" || orderType === "scale";

	const triggerPriceNum = toNumber(triggerPriceInput);
	const sizeHasError = (sizeValue > maxSize && maxSize > 0) || (orderValue > 0 && orderValue < ORDER_MIN_NOTIONAL_USD);

	const sliderValue = isDraggingSlider ? dragSliderValue : getSliderValue(sizeValue, maxSize);

	function handleSizePercentApply(pct: number) {
		if (maxSize <= 0) return;
		onSizePercentApply(pct);
	}

	function formatAvailableBalance(): string {
		if (!isConnected) return FALLBACK_VALUE_PLACEHOLDER;
		const isBaseToken = isSpotMarket && side === "sell";
		const decimals = isBaseToken ? szDecimals : 2;
		return formatToken(availableBalance, { decimals, symbol: availableBalanceToken ?? undefined });
	}

	const sliderDisabled = isFormDisabled || maxSize <= 0;
	const percentDisplay = percentInput ?? formatPercentValue(sliderValue);

	function handlePercentInputChange(value: string) {
		setPercentInput(value);
		const pct = Number(value);
		if (value === "" || Number.isNaN(pct)) return;
		handleSizePercentApply(Math.min(100, Math.max(0, pct)));
	}

	return (
		<div className="flex min-w-0 flex-col gap-3">
			<InfoRowGroup>
				<InfoRow
					label={
						<Tooltip content={t`Balance available to trade`} side="top" underline>
							<span>{t`Available`}</span>
						</Tooltip>
					}
					value={
						<span className="inline-flex items-center gap-2">
							{isConnected ? (
								<span className={getValueColorClass(availableBalance)}>{formatAvailableBalance()}</span>
							) : null}
							{isConnected && swapTargetToken ? (
								<Button variant="link" intent="brand" size="xxs" onClick={onSwapClick}>
									{t`Swap`}
								</Button>
							) : null}
							{isConnected && availableBalance <= 0 ? (
								<Button variant="link" intent="brand" size="xxs" onClick={onDepositClick}>
									{t`Deposit`}
								</Button>
							) : null}
						</span>
					}
				/>
				{!isSpotMarket && positionSize !== 0 ? (
					<InfoRow
						label={
							<Tooltip content={t`Your current open position on this market`} side="top" underline>
								<span>{t`Position`}</span>
							</Tooltip>
						}
						value={`${positionSize > 0 ? "+" : ""}${formatDecimalFloor(positionSize, szDecimals)} ${baseToken}`}
						valueClassName={getValueColorClass(positionSize)}
					/>
				) : null}
			</InfoRowGroup>

			<Collapse open={usesTriggerPrice} className="-mt-3" contentClassName="pt-3">
				<PriceInput
					inlineLabel={t`Trigger Price`}
					placeholder="0.00"
					value={triggerPriceInput}
					onChange={(e) => setTriggerPrice(e.target.value)}
					onMidClick={setTriggerPrice}
					midPrice={markPx}
					szDecimals={szDecimals}
					invalid={!isPositive(triggerPriceNum) && sizeValue > 0}
					disabled={isFormDisabled}
				/>
			</Collapse>

			<Collapse open={usesLimitPrice} className="-mt-3" contentClassName="pt-3">
				<PriceInput
					inlineLabel={t`Limit Price`}
					placeholder="0.00"
					value={limitPriceInput}
					onChange={(e) => setLimitPrice(e.target.value)}
					onMidClick={setLimitPrice}
					midPrice={markPx}
					szDecimals={szDecimals}
					invalid={!price && sizeValue > 0}
					disabled={isFormDisabled}
				/>
			</Collapse>

			<div className="flex min-w-0 flex-col gap-1">
				<NumberInput
					id={sizeFieldId}
					inlineLabel={t`Size`}
					placeholder="0.00"
					value={sizeInput}
					onChange={(e) => setSize(e.target.value)}
					maxAllowedDecimals={szDecimals}
					suffix={sizeModeLabel}
					onSuffixClick={isFormDisabled ? undefined : onSizeModeToggle}
					suffixAriaLabel={t`Toggle size mode`}
					invalid={sizeHasError}
					disabled={isFormDisabled}
				/>
				{sizeValue > 0 ? (
					<span className="self-end text-xs text-fg-muted tabular-nums">
						≈{" "}
						{sizeMode === "base"
							? `${formatToken(orderValue, 2)} USD`
							: `${formatDecimalFloor(sizeValue, szDecimals)} ${baseToken}`}
					</span>
				) : null}
			</div>

			<div className="flex min-w-0 items-center gap-3">
				<Slider
					className="min-w-0 flex-1"
					value={[sliderValue]}
					onValueChange={(v) => {
						const val = Array.isArray(v) ? v[0] : v;
						setIsDraggingSlider(true);
						setDragSliderValue(val);
					}}
					onValueCommitted={(v) => {
						const val = Array.isArray(v) ? v[0] : v;
						setIsDraggingSlider(false);
						handleSizePercentApply(val);
					}}
					max={100}
					step={0.1}
					tone={side === "buy" ? "up" : "down"}
					marks={SIZE_PERCENT_OPTIONS}
					onMarkSelect={handleSizePercentApply}
					disabled={sliderDisabled}
					aria-label={t`Size percentage`}
				/>
				<NumberInput
					className="w-20 shrink-0"
					placeholder="0"
					value={percentDisplay}
					onChange={(e) => handlePercentInputChange(e.target.value)}
					onBlur={() => setPercentInput(null)}
					maxAllowedDecimals={1}
					min={0}
					max={100}
					suffix="%"
					aria-label={t`Size percentage`}
					disabled={sliderDisabled}
				/>
			</div>

			<Collapse open={scaleOrder} className="-mt-3" contentClassName="pt-3">
				<TradeFormScale markPx={markPx} szDecimals={szDecimals} disabled={isFormDisabled} />
			</Collapse>

			<Collapse open={twapOrder} className="-mt-3" contentClassName="pt-3">
				<TradeFormTwap disabled={isFormDisabled} />
			</Collapse>

			{(capabilities.hasReduceOnly || (capabilities.hasTpSl && canUseTpSl) || showTif) && (
				<div className="flex min-w-0 flex-col gap-3">
					<div className="flex min-h-6 flex-wrap items-center gap-x-4 gap-y-2">
						{capabilities.hasReduceOnly && (
							<Checkbox
								aria-label={t`Reduce Only`}
								checked={triggerOrder || reduceOnly}
								onCheckedChange={(checked) => setReduceOnly(checked === true)}
								disabled={isFormDisabled || triggerOrder}
								label={t`Reduce Only`}
							/>
						)}
						{capabilities.hasTpSl && canUseTpSl && (
							<Checkbox
								aria-label={t`Take Profit / Stop Loss`}
								checked={tpSlEnabled}
								onCheckedChange={(checked) => setTpSlEnabled(checked === true)}
								disabled={isFormDisabled}
								label={t`TP/SL`}
							/>
						)}
						{showTif && <TradeFormTif orderType={orderType} disabled={isFormDisabled} />}
					</div>

					<Collapse open={capabilities.hasTpSl && canUseTpSl && tpSlEnabled} className="-mt-3" contentClassName="pt-3">
						<TradeFormTpSl referencePrice={price} size={sizeValue} szDecimals={szDecimals} disabled={isFormDisabled} />
					</Collapse>
				</div>
			)}
		</div>
	);
}

function formatPercentValue(value: number): string {
	if (value <= 0) return "";
	return String(Math.round(value));
}
