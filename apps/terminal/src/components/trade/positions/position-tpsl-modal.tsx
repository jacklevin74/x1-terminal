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
import { buildPositionTpSlUpdate } from "@/domain/trade/position-tpsl-update";
import { useSubmitPlan } from "@/hooks/trade/use-submit-plan";
import { cn } from "@/lib/cn";
import { formatPercent, formatPrice, formatToken, formatUSD } from "@/lib/format";
import { useExchange } from "@/lib/hyperliquid";
import { interpretOrderStatuses } from "@/lib/trade/extract-order-status";
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
	const [tpPriceInput, setTpPriceInput] = useState(position.existingTpPrice ? String(position.existingTpPrice) : "");
	const [slPriceInput, setSlPriceInput] = useState(position.existingSlPrice ? String(position.existingSlPrice) : "");
	const [submitError, setSubmitError] = useState<string | null>(null);
	const [tpEditing, setTpEditing] = useState(position.existingTpOrderId === undefined);
	const [slEditing, setSlEditing] = useState(position.existingSlOrderId === undefined);
	const [tpRemoved, setTpRemoved] = useState(false);
	const [slRemoved, setSlRemoved] = useState(false);
	const existingTpOrderId = tpRemoved ? undefined : position.existingTpOrderId;
	const existingSlOrderId = slRemoved ? undefined : position.existingSlOrderId;
	const existingTpPrice = tpRemoved ? undefined : position.existingTpPrice;
	const existingSlPrice = slRemoved ? undefined : position.existingSlPrice;

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
	const hasExisting = existingTpOrderId !== undefined || existingSlOrderId !== undefined;
	const canSubmit = (hasTp || hasSl || hasExisting) && tpValid && slValid && !isSubmitting && !refreshRequired;

	const tpError = !tpValid ? (position.isLong ? t`TP must be above mark price` : t`TP must be below mark price`) : null;
	const slError = !slValid ? (position.isLong ? t`SL must be below mark price` : t`SL must be above mark price`) : null;

	async function handleRemove(leg: "tp" | "sl") {
		const oid = leg === "tp" ? existingTpOrderId : existingSlOrderId;
		if (oid === undefined) return;
		try {
			const result = await cancelOrders({ cancels: [{ a: position.assetId, o: oid }] });
			const status = interpretOrderStatuses(result.response?.data?.statuses ?? []);
			if (!status.ok) throw new Error(status.error);
			toast.success(leg === "tp" ? t`Take profit removed` : t`Stop loss removed`);
			if (leg === "tp") {
				setTpRemoved(true);
				setTpPriceInput("");
				setTpEditing(true);
			} else {
				setSlRemoved(true);
				setSlPriceInput("");
				setSlEditing(true);
			}
		} catch (error) {
			toast.error(error instanceof Error ? error.message : t`Failed to remove trigger`);
		}
	}

	async function handleSubmit() {
		if (!canSubmit) return;

		const update = buildPositionTpSlUpdate({
			assetId: position.assetId,
			isLong: position.isLong,
			tpPriceNum: hasTp ? tpPriceNum : null,
			slPriceNum: hasSl ? slPriceNum : null,
			existingTpOrderId,
			existingSlOrderId,
			existingTpPrice,
			existingSlPrice,
		});
		setSubmitError(null);
		let cancelled = false;
		try {
			if (update.cancels.length) {
				const result = await cancelOrders({ cancels: update.cancels });
				const status = interpretOrderStatuses(result.response?.data?.statuses ?? []);
				if (!status.ok) throw new Error(status.error);
				cancelled = true;
			}
			if (update.orders.length) {
				const result = await submitPlan({ orders: update.orders, grouping: "positionTpsl" });
				if (!result.ok) throw new Error(result.error);
			}
			onOpenChange(false);
		} catch (error) {
			const message = error instanceof Error ? error.message : "Failed to update TP/SL orders";
			setRefreshRequired(true);
			setSubmitError(
				`${cancelled ? "Previous triggers were cancelled; replacement was not confirmed. " : ""}${message} Close and reopen TP/SL to check current orders before retrying.`,
			);
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
					<span>{position.isLong ? t`long position` : t`short position`}</span>
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

				{(!tpEditing || !slEditing) && (
					<InfoRowGroup className="rounded-8 bg-surface px-3 py-1">
						{!tpEditing && (
							<TriggerRow
								label={t`Take Profit`}
								text={position.isLong ? t`Price above ${tpPriceInput}` : t`Price below ${tpPriceInput}`}
								disabled={isSubmitting}
								onEdit={() => setTpEditing(true)}
								onRemove={() => handleRemove("tp")}
							/>
						)}
						{!slEditing && (
							<TriggerRow
								label={t`Stop Loss`}
								text={position.isLong ? t`Price below ${slPriceInput}` : t`Price above ${slPriceInput}`}
								disabled={isSubmitting}
								onEdit={() => setSlEditing(true)}
								onRemove={() => handleRemove("sl")}
							/>
						)}
					</InfoRowGroup>
				)}
				<p className="text-xs text-fg-muted">{t`Applies to the entire position.`}</p>
				<TpSlSection
					hideTp={!tpEditing}
					hideSl={!slEditing}
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

interface TriggerRowProps {
	label: string;
	text: string;
	disabled: boolean;
	onEdit: () => void;
	onRemove: () => void;
}

function TriggerRow({ label, text, disabled, onEdit, onRemove }: TriggerRowProps) {
	return (
		<InfoRow
			label={label}
			value={
				<span className="flex items-center gap-3">
					<span>{text}</span>
					<button type="button" className="text-fg-muted hover:text-fg" onClick={onEdit} disabled={disabled}>
						{t`Edit`}
					</button>
					<button type="button" className="text-fg-muted hover:text-fg" onClick={onRemove} disabled={disabled}>
						{t`Remove`}
					</button>
				</span>
			}
		/>
	);
}

function getTpSlModalAriaLabel(position: TpSlPositionData): string {
	if (position.isLong) return t`Manage TP/SL for ${position.coin} long position`;
	return t`Manage TP/SL for ${position.coin} short position`;
}
