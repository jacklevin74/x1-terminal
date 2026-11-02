import { Button, Drawer, DrawerContent } from "@hypeterminal/ui";
import { t } from "@lingui/core/macro";
import { Trans } from "@lingui/react/macro";
import { CaretDownIcon, CheckIcon, SpinnerGapIcon, WarningIcon } from "@phosphor-icons/react";
import { type Ref, useEffect, useState } from "react";
import { FieldLabel } from "@/components/ui/field-label";
import { NumberInput } from "@/components/ui/number-input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { LEVERAGE_SUCCESS_DURATION_MS } from "@/config/time";
import { useAssetLeverage } from "@/hooks/trade/use-asset-leverage";
import { useAutoCloseSuccess } from "@/hooks/ui/use-auto-close-success";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/cn";
import { LeverageSlider } from "./leverage-slider";

const LEVERAGE_INPUT_WIDTH_COMPACT = "w-12";
const LEVERAGE_INPUT_WIDTH_DEFAULT = "w-16";
const LEVERAGE_POPOVER_WIDTH = "w-56";

interface BadgeProps {
	leverage: number;
	onClick?: () => void;
	isLoading?: boolean;
	className?: string;
	ref?: Ref<HTMLButtonElement>;
}

function LeverageBadge({ leverage, onClick, isLoading, className, ref }: BadgeProps) {
	return (
		<Button
			ref={ref}
			variant="secondary"
			intent="neutral"
			size="sm"
			onClick={onClick}
			className={cn("shrink-0", className)}
			aria-label={t`Change leverage`}
		>
			<span className="text-fg-muted">{t`Leverage`}</span>
			<span className={cn("tabular-nums font-medium", isLoading ? "text-fg-muted" : "text-fg")}>{leverage}x</span>
			<CaretDownIcon className="size-3 text-fg-muted" />
		</Button>
	);
}

LeverageBadge.displayName = "LeverageBadge";

interface EditorProps {
	compact: boolean;
	currentLeverage: number;
	pendingLeverage: number | null;
	maxLeverage: number;
	isDirty: boolean;
	isUpdating: boolean;
	updateError: Error | null;
	onLeverageChange: (value: number) => void;
	onConfirm: () => Promise<void>;
	onCancel: () => void;
	onOpenChange: (open: boolean) => void;
}

function LeverageEditor({
	compact,
	currentLeverage,
	pendingLeverage,
	maxLeverage,
	isDirty,
	isUpdating,
	updateError,
	onLeverageChange,
	onConfirm,
	onCancel,
	onOpenChange,
}: EditorProps) {
	const displayValue = pendingLeverage ?? currentLeverage;
	const [inputValue, setInputValue] = useState(String(displayValue));
	const { showSuccess, trigger: triggerAutoClose } = useAutoCloseSuccess(
		() => onOpenChange(false),
		LEVERAGE_SUCCESS_DURATION_MS,
	);

	useEffect(() => {
		setInputValue(String(displayValue));
	}, [displayValue]);

	function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
		const raw = e.target.value;
		setInputValue(raw);

		const num = Number.parseInt(raw, 10);
		if (!Number.isNaN(num) && num >= 1 && num <= maxLeverage) {
			onLeverageChange(num);
		}
	}

	function handleInputBlur() {
		const num = Number.parseInt(inputValue, 10);
		if (Number.isNaN(num) || num < 1) {
			onLeverageChange(1);
			setInputValue("1");
		} else if (num > maxLeverage) {
			onLeverageChange(maxLeverage);
			setInputValue(String(maxLeverage));
		}
	}

	async function handleConfirm() {
		try {
			await onConfirm();
			triggerAutoClose();
		} catch {
			/* handled by hook */
		}
	}

	function handleCancel() {
		onCancel();
		onOpenChange(false);
	}

	return (
		<div className={compact ? "space-y-3" : "space-y-4"}>
			<div className="flex items-center justify-between">
				<FieldLabel>
					<Trans>Leverage</Trans>
				</FieldLabel>
				<div className="flex items-center gap-1">
					<NumberInput
						value={inputValue}
						onChange={handleInputChange}
						onBlur={handleInputBlur}
						disabled={isUpdating}
						allowDecimals={false}
						min={1}
						max={maxLeverage}
						inputSize={compact ? "sm" : "default"}
						className={cn(
							"text-center font-medium tabular-nums",
							compact ? LEVERAGE_INPUT_WIDTH_COMPACT : LEVERAGE_INPUT_WIDTH_DEFAULT,
						)}
					/>
					<span className="text-xs text-fg-muted">x</span>
				</div>
			</div>

			<LeverageSlider value={displayValue} onChange={onLeverageChange} max={maxLeverage} disabled={isUpdating} />

			{updateError && (
				<div
					className={cn(
						"flex items-center gap-2 rounded-8 bg-error-soft text-xs text-market-down",
						compact ? "p-2" : "p-3",
					)}
				>
					<WarningIcon className="size-3.5 shrink-0" />
					<span className={compact ? "truncate" : undefined}>{updateError.message || t`Update failed`}</span>
				</div>
			)}

			{showSuccess && (
				<div
					className={cn(
						"flex items-center justify-center gap-2 rounded-8 bg-success-soft text-xs text-market-up",
						compact ? "p-2" : "p-3",
					)}
				>
					<CheckIcon className="size-3.5" />
					<Trans>Updated</Trans>
				</div>
			)}

			{updateError && (
				<div className="flex gap-2">
					<Button
						variant="secondary"
						intent="neutral"
						size={compact ? "sm" : "md"}
						className="flex-1"
						onClick={handleCancel}
					>
						<Trans>Cancel</Trans>
					</Button>
					<Button
						variant="filled"
						intent="neutral"
						size={compact ? "sm" : "md"}
						onClick={handleConfirm}
						disabled={isUpdating}
						className="flex-1"
					>
						{isUpdating && <SpinnerGapIcon className="size-4 animate-spin" />}
						<Trans>Retry</Trans>
					</Button>
				</div>
			)}

			{!updateError && compact && (
				<Button
					variant="filled"
					intent="neutral"
					size="sm"
					onClick={handleConfirm}
					disabled={!isDirty || isUpdating || showSuccess}
					className="w-full"
				>
					{isUpdating && <SpinnerGapIcon className="size-3 animate-spin" />}
					<Trans>Confirm</Trans>
				</Button>
			)}

			{!updateError && !compact && (
				<Button
					variant="filled"
					intent="neutral"
					size="md"
					onClick={handleConfirm}
					disabled={!isDirty || isUpdating || showSuccess}
					className="w-full"
				>
					{isUpdating && <SpinnerGapIcon className="size-4 animate-spin" />}
					<Trans>Confirm</Trans>
				</Button>
			)}
		</div>
	);
}

interface Props {
	className?: string;
}

export function LeverageControl({ className }: Props) {
	const isMobile = useIsMobile();
	const [open, setOpen] = useState(false);

	const {
		currentLeverage,
		pendingLeverage,
		maxLeverage,
		displayLeverage,
		isDirty,
		isUpdating,
		updateError,
		subscriptionStatus,
		setPendingLeverage,
		confirmLeverage,
		resetPending,
	} = useAssetLeverage();

	function handleOpenChange(newOpen: boolean) {
		if (!newOpen) {
			resetPending();
		}
		setOpen(newOpen);
	}

	const isLoading = subscriptionStatus === "loading";

	const editorProps = {
		currentLeverage,
		pendingLeverage,
		maxLeverage,
		isDirty,
		isUpdating,
		updateError,
		onLeverageChange: setPendingLeverage,
		onConfirm: confirmLeverage,
		onCancel: resetPending,
		onOpenChange: handleOpenChange,
	};

	if (isMobile) {
		return (
			<>
				<LeverageBadge
					leverage={displayLeverage}
					onClick={() => setOpen(true)}
					isLoading={isLoading}
					className={className}
				/>
				<Drawer side="bottom" open={open} onOpenChange={handleOpenChange}>
					<DrawerContent className="p-4">
						<LeverageEditor {...editorProps} compact={false} />
					</DrawerContent>
				</Drawer>
			</>
		);
	}

	return (
		<Popover open={open} onOpenChange={handleOpenChange}>
			<PopoverTrigger asChild>
				<LeverageBadge leverage={displayLeverage} isLoading={isLoading} className={className} />
			</PopoverTrigger>
			<PopoverContent align="end" className={LEVERAGE_POPOVER_WIDTH}>
				<LeverageEditor {...editorProps} compact />
			</PopoverContent>
		</Popover>
	);
}

export { useAssetLeverage };
