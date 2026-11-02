import { t } from "@lingui/core/macro";
import { useMemo } from "react";
import { NumberInput } from "@/components/ui/number-input";
import { SL_QUICK_PERCENT_OPTIONS, TP_QUICK_PERCENT_OPTIONS } from "@/config/trade";
import { getRiskRewardRatio } from "@/domain/market";
import { cn } from "@/lib/cn";
import { formatUSD, szDecimalsToPriceDecimals } from "@/lib/format";
import { isPositive, toNumber } from "@/lib/trade/numbers";
import { calculateEstimatedPnl, calculateSlPrice, calculateTpPrice, formatRiskRewardRatio } from "@/lib/trade/tpsl";
import { PriceInputWithPercent } from "./price-input-with-percent";

interface Props {
	side: "buy" | "sell";
	referencePrice: number;
	size: number;
	szDecimals?: number;
	tpPrice: string;
	slPrice: string;
	onTpPriceChange: (value: string) => void;
	onSlPriceChange: (value: string) => void;
	tpError?: string | null;
	slError?: string | null;
	disabled?: boolean;
	compact?: boolean;
}

export function TpSlSection({
	side,
	referencePrice,
	size,
	szDecimals,
	tpPrice,
	slPrice,
	onTpPriceChange,
	onSlPriceChange,
	tpError,
	slError,
	disabled,
	compact,
}: Props) {
	const tpPriceNum = toNumber(tpPrice);
	const slPriceNum = toNumber(slPrice);

	const tpPnl = useMemo(() => {
		if (!isPositive(tpPriceNum) || !isPositive(referencePrice) || !isPositive(size)) return null;
		return calculateEstimatedPnl({ referencePrice, side, size }, tpPriceNum);
	}, [tpPriceNum, referencePrice, side, size]);

	const slPnl = useMemo(() => {
		if (!isPositive(slPriceNum) || !isPositive(referencePrice) || !isPositive(size)) return null;
		return calculateEstimatedPnl({ referencePrice, side, size }, slPriceNum);
	}, [slPriceNum, referencePrice, side, size]);

	const riskRewardRatio = useMemo(() => getRiskRewardRatio(tpPnl, slPnl), [tpPnl, slPnl]);

	const riskRewardDisplay = useMemo(() => {
		if (riskRewardRatio === null || tpPnl === null || slPnl === null) return null;
		const rrDisplay = formatRiskRewardRatio(riskRewardRatio);
		if (!rrDisplay) return null;
		return { rrDisplay, tpPnl, slPnl };
	}, [riskRewardRatio, tpPnl, slPnl]);

	const priceDecimals = szDecimalsToPriceDecimals(szDecimals ?? 4);

	function handleTpPercentClick(percent: number) {
		const price = calculateTpPrice(referencePrice, side, percent, priceDecimals);
		if (price) onTpPriceChange(price);
	}

	function handleSlPercentClick(percent: number) {
		const price = calculateSlPrice(referencePrice, side, percent, priceDecimals);
		if (price) onSlPriceChange(price);
	}

	if (compact) {
		return (
			<div className="grid grid-cols-2 gap-2">
				<NumberInput
					inlineLabel={t`TP Price`}
					placeholder="0.00"
					aria-label={t`Take Profit`}
					value={tpPrice}
					onChange={(e) => onTpPriceChange(e.target.value)}
					invalid={!!tpError}
					error={tpError || undefined}
					disabled={disabled}
				/>
				<NumberInput
					inlineLabel={t`SL Price`}
					placeholder="0.00"
					aria-label={t`Stop Loss`}
					value={slPrice}
					onChange={(e) => onSlPriceChange(e.target.value)}
					invalid={!!slError}
					error={slError || undefined}
					disabled={disabled}
				/>
			</div>
		);
	}

	return (
		<div className="flex min-w-0 flex-col gap-3">
			<PriceInputWithPercent
				label={t`TP Price`}
				value={tpPrice}
				onChange={onTpPriceChange}
				percentOptions={TP_QUICK_PERCENT_OPTIONS}
				onPercentClick={handleTpPercentClick}
				pnlValue={tpPnl}
				error={tpError}
				disabled={disabled}
				referencePrice={referencePrice}
			/>

			<PriceInputWithPercent
				label={t`SL Price`}
				value={slPrice}
				onChange={onSlPriceChange}
				percentOptions={SL_QUICK_PERCENT_OPTIONS}
				onPercentClick={handleSlPercentClick}
				pnlValue={slPnl}
				error={slError}
				disabled={disabled}
				referencePrice={referencePrice}
			/>

			{riskRewardDisplay && (
				<div className="flex flex-col gap-1">
					<div className="flex min-h-6 items-center justify-between text-xs">
						<span className="text-fg-muted">{t`Risk/Reward`}</span>
						<span
							className={cn(
								"font-medium tabular-nums",
								riskRewardDisplay.rrDisplay.isFavorable ? "text-market-up" : "text-warning",
							)}
						>
							{riskRewardDisplay.rrDisplay.label}
						</span>
					</div>
					<div className="flex h-1 gap-0.5 overflow-hidden rounded-full">
						<div
							className="rounded-full bg-market-down"
							style={{
								width: `${(riskRewardDisplay.rrDisplay.risk / (riskRewardDisplay.rrDisplay.risk + riskRewardDisplay.rrDisplay.reward)) * 100}%`,
							}}
						/>
						<div className="flex-1 rounded-full bg-market-up" />
					</div>
					<div className="flex min-h-6 items-center justify-between text-xs tabular-nums">
						<span className="text-market-down">
							{formatUSD(riskRewardDisplay.slPnl, { signDisplay: "exceptZero" })}
						</span>
						<span className="text-market-up">{formatUSD(riskRewardDisplay.tpPnl, { signDisplay: "exceptZero" })}</span>
					</div>
				</div>
			)}
		</div>
	);
}
