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
import { buildOrderPlan } from "@/domain/trade/order-intent";
import { useSubmitPlan } from "@/hooks/trade/use-submit-plan";
import { cn } from "@/lib/cn";
import { formatPercent, formatPrice, formatToken, formatUSD, szDecimalsToPriceDecimals } from "@/lib/format";
import { isPositive, toNumber } from "@/lib/trade/numbers";
import { validateSlPrice, validateTpPrice } from "@/lib/trade/tpsl";
import { AssetDisplay } from "../components/asset-display";
import { TradingActionButton } from "../components/trading-action-button";
import { TpSlSection } from "../tradebox/tp-sl-section";
import type { TpSlPositionData } from "./position-dialog-types";
import { getMarketValueClass } from "./positions-panel-table-styles";

interface Props {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	position: TpSlPositionData | null;
}

export function PositionTpSlModal({ open, onOpenChange, position }: Props) {
	if (!position) return null;
	return (
		<Modal open={open} onOpenChange={onOpenChange}>
			<ModalPopup size="sm" aria-label={getTpSlModalAriaLabel(position)}>
				<PositionTpSlModalBody
					key={`${position.assetId}:${open ? "open" : "closed"}`}
					position={position}
					onOpenChange={onOpenChange}
				/>
			</ModalPopup>
		</Modal>
	);
}

interface BodyProps {
	position: TpSlPositionData;
	onOpenChange: (open: boolean) => void;
}

function PositionTpSlModalBody({ position, onOpenChange }: BodyProps) {
	const decimals = szDecimalsToPriceDecimals(position.szDecimals);
	const [tpPriceInput, setTpPriceInput] = useState(
		position.existingTpPrice ? position.existingTpPrice.toFixed(decimals) : "",
	);
	const [slPriceInput, setSlPriceInput] = useState(
		position.existingSlPrice ? position.existingSlPrice.toFixed(decimals) : "",
	);
	const [submitError, setSubmitError] = useState<string | null>(null);

	const { submitPlan, isSubmitting } = useSubmitPlan();

	const tpPriceNum = toNumber(tpPriceInput);
	const slPriceNum = toNumber(slPriceInput);

	const side = position.isLong ? "buy" : "sell";
	const referencePrice = position.entryPx;
	const size = position.size;

	const hasTp = isPositive(tpPriceNum);
	const hasSl = isPositive(slPriceNum);
	const tpValid = !hasTp || validateTpPrice(referencePrice, tpPriceNum, side);
	const slValid = !hasSl || validateSlPrice(referencePrice, slPriceNum, side);
	const canSubmit = (hasTp || hasSl) && tpValid && slValid && !isSubmitting;

	const tpError = hasTp && !tpValid ? (position.isLong ? t`TP must be above entry` : t`TP must be below entry`) : null;
	const slError = hasSl && !slValid ? (position.isLong ? t`SL must be below entry` : t`SL must be above entry`) : null;

	async function handleSubmit() {
		if (!canSubmit) return;

		const plan = buildOrderPlan({
			kind: "positionTpsl",
			assetId: position.assetId,
			isLong: position.isLong,
			tpPriceNum: hasTp ? tpPriceNum : null,
			slPriceNum: hasSl ? slPriceNum : null,
		});

		if (plan.errors.length > 0) return;

		setSubmitError(null);
		const result = await submitPlan(plan);
		if (result.ok) {
			onOpenChange(false);
		} else {
			const message = result.error || t`Failed to update TP/SL orders`;
			setSubmitError(message);
			toast.error(message);
		}
	}

	return (
		<>
			<ModalHeader>
				<ModalTitle>{t`Manage TP/SL`}</ModalTitle>
				<ModalDescription className="flex items-center gap-1">
					<AssetDisplay
						coin={position.coin}
						hideIcon
						nameClassName={cn("font-medium", position.isLong ? "text-market-up" : "text-market-down")}
					/>
					<span>· {position.isLong ? t`Long position` : t`Short position`}</span>
				</ModalDescription>
			</ModalHeader>

			<ModalContent className="flex flex-col gap-4">
				<InfoRowGroup className="rounded-8 bg-surface px-3 py-1">
					<InfoRow label={t`Size`} value={`${formatToken(position.size, position.szDecimals)} ${position.coin}`} />
					<InfoRow label={t`Entry Price`} value={formatPrice(position.entryPx, { szDecimals: position.szDecimals })} />
					<InfoRow label={t`Mark Price`} value={formatPrice(position.markPx, { szDecimals: position.szDecimals })} />
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

				<TpSlSection
					side={side}
					referencePrice={referencePrice}
					size={size}
					szDecimals={position.szDecimals}
					tpPrice={tpPriceInput}
					slPrice={slPriceInput}
					onTpPriceChange={setTpPriceInput}
					onSlPriceChange={setSlPriceInput}
					tpError={tpError}
					slError={slError}
				/>

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
				<TradingActionButton onClick={handleSubmit} disabled={!canSubmit} size="md" className="w-full">
					{isSubmitting ? (
						<>
							<SpinnerGapIcon className="size-3.5 animate-spin" />
							{t`Submitting...`}
						</>
					) : (
						t`Confirm`
					)}
				</TradingActionButton>
			</ModalFooter>
		</>
	);
}

function getTpSlModalAriaLabel(position: TpSlPositionData): string {
	if (position.isLong) return t`Manage TP/SL for ${position.coin} long position`;
	return t`Manage TP/SL for ${position.coin} short position`;
}
