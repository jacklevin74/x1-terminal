import { Button, Modal, ModalContent, ModalFooter, ModalHeader, ModalPopup, ModalTitle } from "@hypeterminal/ui";
import { t } from "@lingui/core/macro";
import { SpinnerGapIcon } from "@phosphor-icons/react";
import { useState } from "react";
import { toast } from "sonner";
import { InfoRow } from "@/components/ui/info-row";
import { buildPositionTpSlUpdate } from "@/domain/trade/position-tpsl-update";
import { useExchange } from "@/lib/hyperliquid";
import { interpretOrderStatuses } from "@/lib/trade/extract-order-status";
import { useSubmitPlan } from "@/hooks/trade/use-submit-plan";
import { cn } from "@/lib/cn";
import { formatPercent, formatPrice, formatToken, formatUSD } from "@/lib/format";
import { isPositive, toNumber } from "@/lib/trade/numbers";
import { validateSlPrice, validateTpPrice } from "@/lib/trade/tpsl";
import { getValueColorClass } from "@/lib/ui/value-color";
import { AssetDisplay } from "../components/asset-display";
import { TradingActionButton } from "../components/trading-action-button";
import { TpSlSection } from "../tradebox/tp-sl-section";
import type { TpSlPositionData } from "./position-dialog-types";

interface Props {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	position: TpSlPositionData | null;
}

export function PositionTpSlModal({ open, onOpenChange, position }: Props) {
	if (!position) return null;
	return (
		<Modal open={open} onOpenChange={onOpenChange}>
			<ModalPopup size="sm" showClose={false} aria-label={getTpSlModalAriaLabel(position)}>
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
	const [tpPriceInput, setTpPriceInput] = useState(
		position.existingTpPrice ? String(position.existingTpPrice) : "",
	);
	const [slPriceInput, setSlPriceInput] = useState(
		position.existingSlPrice ? String(position.existingSlPrice) : "",
	);
	const [submitError, setSubmitError] = useState<string | null>(null);

	const { submitPlan, isSubmitting: isPlacing } = useSubmitPlan();
 const { mutateAsync: cancelOrders, isPending: isCancelling } = useExchange("cancel");
 const [refreshRequired, setRefreshRequired] = useState(false);
 const isSubmitting = isPlacing || isCancelling;

	const tpPriceNum = toNumber(tpPriceInput);
	const slPriceNum = toNumber(slPriceInput);

	const side = position.isLong ? "buy" : "sell";
	const referencePrice = position.entryPx;
	const size = position.size;

	const hasTp = isPositive(tpPriceNum);
	const hasSl = isPositive(slPriceNum);
	const tpValid = !tpPriceInput.trim() || (hasTp && validateTpPrice(position.markPx, tpPriceNum, side));
	const slValid = !slPriceInput.trim() || (hasSl && validateSlPrice(position.markPx, slPriceNum, side));
	const hasExisting = position.existingTpOrderId !== undefined || position.existingSlOrderId !== undefined;
 const canSubmit = (hasTp || hasSl || hasExisting) && tpValid && slValid && !isSubmitting && !refreshRequired;

	const tpError = !tpValid ? (position.isLong ? t`TP must be above mark price` : t`TP must be below mark price`) : null;
	const slError = !slValid ? (position.isLong ? t`SL must be below mark price` : t`SL must be above mark price`) : null;

	async function handleSubmit() {
		if (!canSubmit) return;

        const update = buildPositionTpSlUpdate({
            assetId:position.assetId,isLong:position.isLong,
            tpPriceNum:hasTp?tpPriceNum:null,slPriceNum:hasSl?slPriceNum:null,
            existingTpOrderId:position.existingTpOrderId,existingSlOrderId:position.existingSlOrderId,
            existingTpPrice:position.existingTpPrice,existingSlPrice:position.existingSlPrice,
        });
        setSubmitError(null);
        let cancelled = false;
        try {
            if(update.cancels.length){
                const result=await cancelOrders({cancels:update.cancels});
                const status=interpretOrderStatuses(result.response?.data?.statuses ?? []);
                if(!status.ok)throw new Error(status.error);
                cancelled = true;
            }
            if(update.orders.length){
                const result=await submitPlan({orders:update.orders,grouping:"positionTpsl"});
                if(!result.ok)throw new Error(result.error);
            }
            onOpenChange(false);
        } catch(error) {
            const message=error instanceof Error?error.message:"Failed to update TP/SL orders";
            setRefreshRequired(true);
            setSubmitError(`${cancelled ? "Previous triggers were cancelled; replacement was not confirmed. " : ""}${message} Close and reopen TP/SL to check current orders before retrying.`);
            toast.error(message);
        }
	}

	const visibleError = submitError;

	return (
		<>
			<ModalHeader>
				<ModalTitle>{t`Manage TP/SL`}</ModalTitle>
				<div className="flex items-center gap-1.5">
					<span
						className={cn("h-4 w-0.5 shrink-0 rounded-full", position.isLong ? "bg-success" : "bg-error")}
						aria-hidden="true"
					/>
					<AssetDisplay coin={position.coin} />
					<span className="text-xs text-fg-muted">· {position.isLong ? t`Long position` : t`Short position`}</span>
				</div>
			</ModalHeader>

			<ModalContent>
				<div className="rounded-8 border border-stroke-weak bg-surface p-3 space-y-1 text-xs">
					<InfoRow
						className="p-0"
						label={t`Size`}
						value={`${formatToken(position.size, position.szDecimals)} ${position.coin}`}
						valueClassName="font-medium"
					/>
					<InfoRow
						className="p-0"
						label={t`Entry Price`}
						value={formatPrice(position.entryPx, { szDecimals: position.szDecimals })}
						valueClassName="font-medium"
					/>
					<InfoRow
						className="p-0"
						label={t`Mark Price`}
						value={formatPrice(position.markPx, { szDecimals: position.szDecimals })}
						valueClassName="font-medium text-warning"
					/>
					<InfoRow
						className="p-0 border-t border-stroke-weak pt-3"
						label={t`Unrealized P&L`}
						value={
							<>
								{formatUSD(position.unrealizedPnl, { signDisplay: "exceptZero" })}
								<span className="font-normal text-fg-muted ml-1">({formatPercent(position.roe, 1)})</span>
							</>
						}
						valueClassName={cn("font-semibold", getValueColorClass(position.unrealizedPnl))}
					/>
				</div>
			</ModalContent>

			<div className="px-4 pb-4">
				<p className="mb-3 text-xs text-fg-muted">Applies to the entire position. Clear a field to remove it. Changed triggers are cancelled before replacement.</p>
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

				{visibleError && (
					<div className="mt-3 px-2 py-1.5 rounded-8 bg-error-soft border border-stroke-error-weak text-xs text-error">
						{visibleError}
					</div>
				)}
			</div>

			<ModalFooter>
				<Button size="sm" variant="ghost" intent="neutral" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
					{t`Cancel`}
				</Button>
				<TradingActionButton onClick={handleSubmit} disabled={!canSubmit} className="min-w-24">
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
