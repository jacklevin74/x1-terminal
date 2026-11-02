import {
	Button,
	Modal,
	ModalContent,
	ModalDescription,
	ModalFooter,
	ModalHeader,
	ModalPopup,
	ModalTitle,
} from "@hypeterminal/ui";
import { t } from "@lingui/core/macro";
import { SpinnerGapIcon } from "@phosphor-icons/react";
import { useState } from "react";
import { toast } from "sonner";
import { InfoRow, InfoRowGroup } from "@/components/ui/info-row";
import { NumberInput } from "@/components/ui/number-input";
import { PriceInput } from "@/components/ui/price-input";
import { buildOrderPlan } from "@/domain/trade/order-intent";
import { useSubmitPlan } from "@/hooks/trade/use-submit-plan";
import { formatPercent, formatPrice, formatToken, formatUSD, szDecimalsToPriceDecimals } from "@/lib/format";
import { useSubscription } from "@/lib/hyperliquid";
import { formatDecimalFloor, isPositive, toNumber } from "@/lib/trade/numbers";
import { TradingActionButton } from "../components/trading-action-button";
import type { LimitClosePositionData } from "./position-dialog-types";
import { getMarketValueClass } from "./positions-panel-table-styles";

interface Props {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	position: LimitClosePositionData | null;
}

export function PositionLimitCloseModal({ open, onOpenChange, position }: Props) {
	if (!position) return null;
	return (
		<Modal open={open} onOpenChange={onOpenChange}>
			<ModalPopup size="sm">
				<PositionLimitCloseModalBody
					key={`${position.assetId}:${open ? "open" : "closed"}`}
					position={position}
					onOpenChange={onOpenChange}
				/>
			</ModalPopup>
		</Modal>
	);
}

interface BodyProps {
	position: LimitClosePositionData;
	onOpenChange: (open: boolean) => void;
}

function PositionLimitCloseModalBody({ position, onOpenChange }: BodyProps) {
	const priceDecimalsInit = szDecimalsToPriceDecimals(position.szDecimals);
	const [priceInput, setPriceInput] = useState(() => position.markPx.toFixed(priceDecimalsInit));
	const [sizeInput, setSizeInput] = useState(() => formatDecimalFloor(position.size, position.szDecimals));
	const [submitError, setSubmitError] = useState<string | null>(null);

	const { submitPlan, isSubmitting } = useSubmitPlan();
	const { data: liveCtxEvent } = useSubscription(
		"activeAssetCtx",
		{ coin: position.coin },
		{ enabled: !!position.coin },
	);
	const liveMarkPx = toNumber(liveCtxEvent?.ctx?.markPx) ?? position.markPx;

	const priceNum = toNumber(priceInput);
	const sizeNum = toNumber(sizeInput);

	const priceValid = isPositive(priceNum);
	const sizeValid = isPositive(sizeNum) && sizeNum !== null && sizeNum <= position.size;
	const canSubmit = priceValid && sizeValid && !isSubmitting;

	const estimatedPnl =
		priceNum && sizeNum
			? position.isLong
				? (priceNum - position.entryPx) * sizeNum
				: (position.entryPx - priceNum) * sizeNum
			: null;

	async function handleSubmit() {
		if (!canSubmit || priceNum === null || sizeNum === null) return;

		const plan = buildOrderPlan({
			kind: "limitClose",
			assetId: position.assetId,
			size: sizeNum,
			szDecimals: position.szDecimals,
			isLong: position.isLong,
			price: priceNum,
		});

		setSubmitError(null);
		const result = await submitPlan(plan);
		if (result.ok) {
			toast.success(t`Limit close order placed` + (position.coin ? ` — ${position.coin}` : ""));
			onOpenChange(false);
		} else {
			const message = result.error || t`Failed to place limit close order`;
			setSubmitError(message);
			toast.error(message);
		}
	}

	function handleMaxSize() {
		setSizeInput(formatDecimalFloor(position.size, position.szDecimals));
	}

	const priceDecimals = szDecimalsToPriceDecimals(position.szDecimals);
	const sizeExceeds = sizeNum !== null && sizeNum > position.size;

	return (
		<>
			<ModalHeader>
				<ModalTitle>{t`Limit Close`}</ModalTitle>
				<ModalDescription>
					{position.isLong ? t`${position.coin} long position` : t`${position.coin} short position`}
				</ModalDescription>
			</ModalHeader>

			<ModalContent className="flex flex-col gap-4">
				<InfoRowGroup className="rounded-8 bg-surface px-3 py-1">
					<InfoRow label={t`Size`} value={`${formatToken(position.size, position.szDecimals)} ${position.coin}`} />
					<InfoRow label={t`Entry Price`} value={formatPrice(position.entryPx, { szDecimals: position.szDecimals })} />
					<InfoRow label={t`Mark Price`} value={formatPrice(liveMarkPx, { szDecimals: position.szDecimals })} />
					<InfoRow
						label={t`Unrealized P&L`}
						value={
							<>
								{formatUSD(position.unrealizedPnl, { signDisplay: "exceptZero" })}{" "}
								<span className="text-fg-muted">({formatPercent(position.roe, 1)})</span>
							</>
						}
						valueClassName={getMarketValueClass(position.unrealizedPnl)}
					/>
				</InfoRowGroup>

				<div className="flex flex-col gap-2">
					<PriceInput
						inlineLabel={t`Price`}
						value={priceInput}
						onChange={(e) => setPriceInput(e.target.value)}
						onMidClick={setPriceInput}
						placeholder="0.00"
						maxAllowedDecimals={priceDecimals}
						midPrice={liveMarkPx}
						szDecimals={position.szDecimals}
						className="w-full"
					/>
					<NumberInput
						inlineLabel={t`Size`}
						suffix={position.coin}
						maxLabel={t`Max`}
						onMaxClick={handleMaxSize}
						value={sizeInput}
						onChange={(e) => setSizeInput(e.target.value)}
						placeholder="0.00"
						maxAllowedDecimals={position.szDecimals}
						error={sizeExceeds ? t`Size exceeds position` : undefined}
						className="w-full"
					/>
				</div>

				<InfoRowGroup>
					<InfoRow label={t`Available`} value={`${formatToken(position.size, position.szDecimals)} ${position.coin}`} />
					{estimatedPnl !== null && (
						<InfoRow
							label={t`Est. P&L at Limit`}
							value={formatUSD(estimatedPnl, { signDisplay: "exceptZero" })}
							valueClassName={getMarketValueClass(estimatedPnl)}
						/>
					)}
				</InfoRowGroup>

				{submitError && (
					<p role="alert" className="text-xs text-market-down">
						{submitError}
					</p>
				)}
			</ModalContent>

			<ModalFooter className="grid grid-cols-2 pt-0">
				<Button
					variant="secondary"
					intent="neutral"
					size="md"
					className="w-full"
					onClick={() => onOpenChange(false)}
					disabled={isSubmitting}
				>
					{t`Cancel`}
				</Button>
				<TradingActionButton
					onClick={handleSubmit}
					disabled={!canSubmit}
					size="md"
					intent={position.isLong ? "down" : "up"}
					className="w-full"
				>
					{isSubmitting ? (
						<>
							<SpinnerGapIcon className="size-3.5 animate-spin" />
							{t`Submitting...`}
						</>
					) : (
						t`Place Limit Close`
					)}
				</TradingActionButton>
			</ModalFooter>
		</>
	);
}
