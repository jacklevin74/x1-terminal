import {
	Badge,
	Button,
	Modal,
	ModalContent,
	ModalFooter,
	ModalHeader,
	ModalPopup,
	ModalTitle,
	SegmentedControlItem,
	SegmentedControls,
} from "@hypeterminal/ui";
import { t } from "@lingui/core/macro";
import { Trans } from "@lingui/react/macro";
import { CaretDownIcon, CheckIcon, ShieldIcon, SpinnerGapIcon, StackIcon, WarningIcon } from "@phosphor-icons/react";
import { useState } from "react";
import { FieldLabel } from "@/components/ui/field-label";
import { MARGIN_MODE_SUCCESS_DURATION_MS } from "@/config/time";
import { useAutoCloseSuccess } from "@/hooks/ui/use-auto-close-success";
import type { MarginMode } from "@/lib/trade/margin-mode";
import { TradingActionButton } from "../components/trading-action-button";
import { LeverageSlider } from "./leverage-slider";

const MODE_ICONS = { cross: StackIcon, isolated: ShieldIcon } as const;

interface MarginModeToggleProps {
	mode: MarginMode;
	disabled?: boolean;
	onClick?: () => void;
}

export function MarginModeToggle({ mode, disabled, onClick }: MarginModeToggleProps) {
	const label = mode === "cross" ? t`Cross` : t`Isolated`;
	const Icon = MODE_ICONS[mode];

	return (
		<Button
			variant="secondary"
			intent="neutral"
			size="sm"
			onClick={onClick}
			disabled={disabled}
			iconLeft={<Icon className="size-3" />}
			iconRight={<CaretDownIcon className="size-3" />}
			className="min-w-0"
		>
			<span className="truncate">{label}</span>
		</Button>
	);
}

interface Props {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	currentMode: MarginMode;
	currentLeverage: number;
	pendingLeverage: number | null;
	maxLeverage: number;
	onPendingLeverageChange: (value: number) => void;
	hasPosition: boolean;
	isOnlyIsolated: boolean;
	isUpdating: boolean;
	updateError: Error | null;
	showLeverage: boolean;
	onApply: (mode: MarginMode, leverage: number) => Promise<void>;
}

type BodyProps = Omit<Props, "open">;

const MODE_OPTIONS: Array<{
	id: MarginMode;
	label: () => string;
	description: () => string;
	icon: typeof StackIcon;
}> = [
	{
		id: "cross",
		label: () => t`Cross`,
		description: () =>
			t`All cross positions share the same cross margin as collateral. In the event of liquidation, your cross margin balance and any remaining open positions may be forfeited.`,
		icon: StackIcon,
	},
	{
		id: "isolated",
		label: () => t`Isolated`,
		description: () =>
			t`Each position uses only its allocated margin. If the margin ratio reaches 100%, the position is liquidated. Margin can be added or removed individually.`,
		icon: ShieldIcon,
	},
];

export function MarginModeModal({ open, onOpenChange, ...rest }: Props) {
	return (
		<Modal open={open} onOpenChange={onOpenChange}>
			<ModalPopup size="sm">
				<MarginModeModalBody onOpenChange={onOpenChange} {...rest} />
			</ModalPopup>
		</Modal>
	);
}

function MarginModeModalBody({
	onOpenChange,
	currentMode,
	currentLeverage,
	pendingLeverage,
	maxLeverage,
	onPendingLeverageChange,
	hasPosition,
	isOnlyIsolated,
	isUpdating,
	updateError,
	showLeverage,
	onApply,
}: BodyProps) {
	const [selectedMode, setSelectedMode] = useState<MarginMode>(currentMode);
	const { showSuccess, trigger: triggerAutoClose } = useAutoCloseSuccess(
		() => onOpenChange(false),
		MARGIN_MODE_SUCCESS_DURATION_MS,
	);

	const displayLeverage = pendingLeverage ?? currentLeverage;

	const modeDirty = selectedMode !== currentMode;
	const leverageDirty = pendingLeverage !== null && pendingLeverage !== currentLeverage;
	const isDirty = modeDirty || leverageDirty;
	const cannotSwitch = hasPosition && selectedMode === "isolated" && currentMode === "cross";

	async function handleConfirm(): Promise<void> {
		if (!isDirty || cannotSwitch) return;
		const lev = pendingLeverage ?? currentLeverage;
		try {
			await onApply(selectedMode, lev);
			triggerAutoClose();
		} catch {}
	}

	function handleCancel() {
		onOpenChange(false);
	}

	const selectedModeDescription = MODE_OPTIONS.find((o) => o.id === selectedMode)?.description();

	function handleModeChange(value: string) {
		if (value === "cross" || value === "isolated") setSelectedMode(value);
	}

	return (
		<>
			<ModalHeader>
				<ModalTitle>
					<Trans>Margin & leverage</Trans>
				</ModalTitle>
			</ModalHeader>

			<ModalContent className="flex flex-col gap-4">
				<div className="flex flex-col gap-2">
					<FieldLabel>
						<Trans>Margin mode</Trans>
					</FieldLabel>
					<SegmentedControls value={selectedMode} onValueChange={handleModeChange} fullWidth disabled={isUpdating}>
						{MODE_OPTIONS.map((option) => {
							const Icon = option.icon;
							return (
								<SegmentedControlItem
									key={option.id}
									value={option.id}
									disabled={isOnlyIsolated && option.id === "cross"}
									icon={<Icon className="size-3.5" />}
								>
									{option.label()}
									{currentMode === option.id && (
										<Badge tone="neutral" size="sm" className="ml-1 text-2xs uppercase tracking-micro">
											<Trans>Current</Trans>
										</Badge>
									)}
								</SegmentedControlItem>
							);
						})}
					</SegmentedControls>
					{selectedModeDescription && <p className="text-xs text-pretty text-fg-muted">{selectedModeDescription}</p>}
				</div>

				{showLeverage && maxLeverage > 1 && (
					<div className="flex flex-col gap-2 border-t border-stroke-weak pt-4">
						<div className="flex min-h-6 items-center justify-between">
							<FieldLabel>
								<Trans>Leverage</Trans>
							</FieldLabel>
							<div className="flex items-center gap-1 tabular-nums">
								{leverageDirty && <span className="text-xs text-fg-muted">{currentLeverage}× →</span>}
								<span className="text-base font-medium text-fg">{displayLeverage}×</span>
							</div>
						</div>
						<LeverageSlider
							value={displayLeverage}
							onChange={onPendingLeverageChange}
							max={maxLeverage}
							disabled={isUpdating}
						/>
					</div>
				)}

				{cannotSwitch && (
					<div className="flex items-start gap-2 rounded-8 bg-warning-soft p-3">
						<WarningIcon className="mt-0.5 size-3.5 shrink-0 text-warning" />
						<p className="text-xs text-warning">
							<Trans>Cannot switch to Isolated mode with an open position. Close your position first.</Trans>
						</p>
					</div>
				)}

				{updateError && (
					<div className="flex items-start gap-2 rounded-8 bg-error-soft p-3 text-xs text-market-down">
						<WarningIcon className="mt-0.5 size-3.5 shrink-0" />
						<span className="min-w-0 flex-1">{updateError.message || t`Update failed`}</span>
					</div>
				)}
			</ModalContent>

			<ModalFooter>
				{!showSuccess && (
					<Button variant="secondary" intent="neutral" size="md" onClick={handleCancel} disabled={isUpdating}>
						<Trans>Cancel</Trans>
					</Button>
				)}
				{showSuccess ? (
					<output className="inline-flex h-9 items-center gap-1.5 px-4 text-sm font-medium text-market-up">
						<CheckIcon className="size-4" weight="bold" />
						<Trans>Updated</Trans>
					</output>
				) : (
					<TradingActionButton
						onClick={handleConfirm}
						disabled={!isDirty || isUpdating || cannotSwitch}
						size="md"
						iconLeft={isUpdating ? <SpinnerGapIcon className="size-4 animate-spin" /> : undefined}
					>
						<Trans>Confirm</Trans>
					</TradingActionButton>
				)}
			</ModalFooter>
		</>
	);
}
