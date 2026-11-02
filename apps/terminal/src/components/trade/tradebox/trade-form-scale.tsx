import { t } from "@lingui/core/macro";
import { NumberInput } from "@/components/ui/number-input";
import { PriceInput } from "@/components/ui/price-input";
import { SCALE_LEVELS_MAX, SCALE_LEVELS_MIN } from "@/config/trade";
import { useOrderEntryActions, useScaleEnd, useScaleLevels, useScaleStart } from "@/stores/use-order-entry-store";

interface Props {
	markPx: number;
	szDecimals: number;
	disabled: boolean;
}

export function TradeFormScale({ markPx, szDecimals, disabled }: Props) {
	const scaleStartPriceInput = useScaleStart();
	const scaleEndPriceInput = useScaleEnd();
	const scaleLevelsNum = useScaleLevels();
	const { setScaleStart, setScaleEnd, setScaleLevels } = useOrderEntryActions();

	return (
		<div className="flex min-w-0 flex-col gap-3">
			<PriceInput
				inlineLabel={t`Start Price`}
				placeholder="0.00"
				value={scaleStartPriceInput}
				onChange={(e) => setScaleStart(e.target.value)}
				onMidClick={setScaleStart}
				midPrice={markPx}
				szDecimals={szDecimals}
				disabled={disabled}
			/>
			<PriceInput
				inlineLabel={t`End Price`}
				placeholder="0.00"
				value={scaleEndPriceInput}
				onChange={(e) => setScaleEnd(e.target.value)}
				onMidClick={setScaleEnd}
				midPrice={markPx}
				szDecimals={szDecimals}
				disabled={disabled}
			/>
			<NumberInput
				inlineLabel={t`Number of Orders`}
				suffix={<span className="font-normal text-fg-muted">{`${SCALE_LEVELS_MIN}–${SCALE_LEVELS_MAX}`}</span>}
				placeholder="4"
				value={String(scaleLevelsNum)}
				onChange={(e) => setScaleLevels(Number(e.target.value) || 4)}
				allowDecimals={false}
				disabled={disabled}
			/>
		</div>
	);
}
