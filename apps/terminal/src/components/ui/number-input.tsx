/**
 * String-based numeric input for the trade UI.
 *
 * This does NOT use `NumberInput` from `@hypeterminal/ui`. The package primitive
 * exposes a `number | null` value via `onValueChange` (built on @base-ui NumberField)
 * and wraps the input in `Field.Root` with label/hint/error slots. The tradebox
 * callers (size/price/TP/SL/leverage/trigger inputs) keep Hyperliquid price/size
 * strings end-to-end: API returns strings with exact decimals, they flow through
 * `onChange(string)` unchanged, are validated for decimal limits, and converted to
 * `Big()` only when math is required. Converting to `number` here would lose
 * precision (HL's sz/px can have up to 8 decimals). See `rules/hyperliquid.md`.
 *
 * The synthetic change event below enables the ArrowUp/ArrowDown keyboard stepper
 * without rewriting every caller's `onChange(e)` handler.
 */
import { Input as BaseInput } from "@base-ui/react/input";
import { CaretDownIcon } from "@phosphor-icons/react";
import type * as React from "react";
import { useCallback, useId } from "react";
import { cn } from "@/lib/cn";
import { inlineLabelTypographyClass, labelTypographyClass } from "./field-label";
import type { InputSize } from "./input";

const fieldBaseStyles =
	"flex w-full min-w-0 items-center gap-2 rounded-8 bg-control tabular-nums transition-[background-color,box-shadow] duration-150 motion-reduce:transition-none";
const fieldFocusStyles =
	"focus-within:bg-control-hover focus-within:ring-1 focus-within:ring-inset focus-within:ring-stroke-control-focus";
const fieldInvalidStyles = "ring-1 ring-inset ring-market-down";

const fieldSizeStyles: Record<InputSize, string> = {
	sm: "h-6 px-2 text-xs",
	default: "h-8 max-md:h-10 px-3 text-xs max-md:text-base",
	lg: "h-9 px-3 text-sm max-md:text-base",
	xl: "h-11 px-3 text-base",
};

const chipStyles =
	"inline-flex h-5 shrink-0 items-center gap-1 rounded-4 bg-control-hover px-1.5 text-xs font-normal text-fg-muted transition-colors hover:text-fg disabled:cursor-not-allowed disabled:text-fg-disabled";

export interface NumberInputChip {
	label: React.ReactNode;
	onClick: () => void;
	ariaLabel?: string;
	active?: boolean;
}

/**
 * Validates numeric input string format.
 * Pattern breakdown:
 *   ^        - start of string
 *   -?       - optional minus sign (only if allowNegative)
 *   \d*      - zero or more digits before decimal
 *   \.?      - optional decimal point (only if allowDecimals)
 *   \d*      - zero or more digits after decimal
 *   $        - end of string
 */
function isValidNumberFormat(value: string, allowDecimals: boolean, allowNegative: boolean): boolean {
	const pattern = allowDecimals
		? allowNegative
			? /^-?\d*\.?\d*$/
			: /^\d*\.?\d*$/
		: allowNegative
			? /^-?\d*$/
			: /^\d*$/;
	return pattern.test(value);
}

function exceedsDecimalLimit(value: string, maxDecimals: number | undefined): boolean {
	if (maxDecimals === undefined) return false;
	const dotIndex = value.indexOf(".");
	return dotIndex !== -1 && value.length - dotIndex - 1 > maxDecimals;
}

interface Props extends Omit<React.ComponentProps<"input">, "type" | "onChange" | "min" | "max" | "step"> {
	inputSize?: InputSize;
	allowDecimals?: boolean;
	allowNegative?: boolean;
	maxAllowedDecimals?: number;
	min?: number;
	max?: number;
	step?: number;
	maxLabel?: React.ReactNode;
	onMaxClick?: () => void;
	suffix?: React.ReactNode;
	onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
	label?: string;
	labelValue?: React.ReactNode;
	onLabelValueClick?: () => void;
	inlineLabel?: React.ReactNode;
	chips?: readonly NumberInputChip[];
	onSuffixClick?: () => void;
	suffixAriaLabel?: string;
	invalid?: boolean;
	error?: React.ReactNode;
}

export function NumberInput({
	className,
	inputSize = "default",
	allowDecimals = true,
	allowNegative = false,
	maxAllowedDecimals,
	min,
	max,
	step = 1,
	maxLabel,
	onMaxClick,
	suffix,
	value,
	onChange,
	onKeyDown,
	disabled,
	label,
	labelValue,
	onLabelValueClick,
	inlineLabel,
	chips,
	onSuffixClick,
	suffixAriaLabel,
	invalid,
	error,
	id,
	...props
}: Props) {
	const generatedId = useId();
	const inputId = id ?? generatedId;
	const ariaInvalid = props["aria-invalid"];
	const isInvalid = invalid === true || error != null || ariaInvalid === true || ariaInvalid === "true";
	const effectiveAllowDecimals = allowDecimals && (maxAllowedDecimals === undefined || maxAllowedDecimals > 0);
	const hasMax = maxLabel != null && onMaxClick != null;

	const createSyntheticEvent = useCallback(
		(input: HTMLInputElement, newValue: string): React.ChangeEvent<HTMLInputElement> => {
			const nativeEvent = new Event("change", { bubbles: true });
			Object.defineProperty(nativeEvent, "target", { writable: false, value: { ...input, value: newValue } });
			return {
				...nativeEvent,
				target: { ...input, value: newValue } as EventTarget & HTMLInputElement,
				currentTarget: { ...input, value: newValue } as EventTarget & HTMLInputElement,
				nativeEvent,
				isDefaultPrevented: () => false,
				isPropagationStopped: () => false,
				persist: () => {},
			} as React.ChangeEvent<HTMLInputElement>;
		},
		[],
	);

	const handleKeyDown = useCallback(
		(e: React.KeyboardEvent<HTMLInputElement>) => {
			if (e.key === "ArrowUp" || e.key === "ArrowDown") {
				e.preventDefault();
				const input = e.currentTarget;
				const currentValue = parseFloat(input.value) || 0;
				const delta = e.key === "ArrowUp" ? step : -step;
				let newValue = currentValue + delta;

				if (min !== undefined && newValue < min) newValue = min;
				if (max !== undefined && newValue > max) newValue = max;
				if (!allowNegative && newValue < 0) newValue = 0;

				const newValueStr = effectiveAllowDecimals ? String(newValue) : String(Math.round(newValue));
				const syntheticEvent = createSyntheticEvent(input, newValueStr);
				onChange?.(syntheticEvent);
				onKeyDown?.(e);
				return;
			}

			const allowedKeys = ["Backspace", "Delete", "Tab", "Escape", "Enter", "ArrowLeft", "ArrowRight", "Home", "End"];

			if (allowedKeys.includes(e.key)) {
				onKeyDown?.(e);
				return;
			}

			if ((e.ctrlKey || e.metaKey) && ["a", "c", "v", "x", "z"].includes(e.key.toLowerCase())) {
				onKeyDown?.(e);
				return;
			}

			const isDigit = /^[0-9]$/.test(e.key);
			const isDecimal = e.key === "." && effectiveAllowDecimals;
			const isMinus = e.key === "-" && allowNegative;

			if (!isDigit && !isDecimal && !isMinus) {
				e.preventDefault();
				return;
			}

			const inputValue = e.currentTarget.value;
			const selectionStart = e.currentTarget.selectionStart ?? 0;

			if (isDecimal && inputValue.includes(".")) {
				e.preventDefault();
				return;
			}

			if (isMinus && (selectionStart !== 0 || inputValue.includes("-"))) {
				e.preventDefault();
				return;
			}

			onKeyDown?.(e);
		},
		[effectiveAllowDecimals, allowNegative, min, max, step, onChange, onKeyDown, createSyntheticEvent],
	);

	const validateInputValue = useCallback(
		(e: React.ChangeEvent<HTMLInputElement>) => {
			const inputValue = e.target.value;

			const isIntermediateState =
				inputValue === "" ||
				inputValue === "-" ||
				(effectiveAllowDecimals && (inputValue === "." || inputValue === "-."));

			if (isIntermediateState) {
				onChange?.(e);
				return;
			}

			if (!isValidNumberFormat(inputValue, effectiveAllowDecimals, allowNegative)) return;
			if (exceedsDecimalLimit(inputValue, maxAllowedDecimals)) return;

			onChange?.(e);
		},
		[effectiveAllowDecimals, allowNegative, maxAllowedDecimals, onChange],
	);

	const field = (
		<div
			data-slot="number-input-field"
			data-disabled={disabled || undefined}
			className={cn(
				fieldBaseStyles,
				fieldSizeStyles[inputSize],
				isInvalid ? fieldInvalidStyles : fieldFocusStyles,
				disabled && "cursor-not-allowed text-fg-disabled",
				className,
			)}
		>
			{inlineLabel != null && (
				<label
					htmlFor={inputId}
					className={cn(inlineLabelTypographyClass, "shrink-0 whitespace-nowrap", disabled && "text-fg-disabled")}
				>
					{inlineLabel}
				</label>
			)}
			<BaseInput
				type="text"
				inputMode={effectiveAllowDecimals ? "decimal" : "numeric"}
				data-slot="input"
				data-size={inputSize}
				id={inputId}
				value={value}
				disabled={disabled}
				aria-invalid={isInvalid || undefined}
				className={cn(
					"h-full w-full min-w-0 flex-1 bg-transparent text-fg outline-none placeholder:text-fg-muted",
					"disabled:cursor-not-allowed disabled:text-fg-disabled disabled:placeholder:text-fg-disabled",
					inlineLabel != null && "text-right",
				)}
				onKeyDown={handleKeyDown}
				onChange={validateInputValue}
				{...props}
			/>
			{chips?.map((chip, index) => (
				<button
					// biome-ignore lint/suspicious/noArrayIndexKey: chips are a static, ordered list
					key={index}
					type="button"
					onClick={chip.onClick}
					disabled={disabled}
					aria-label={chip.ariaLabel}
					className={cn(chipStyles, chip.active && "text-fg")}
				>
					{chip.label}
				</button>
			))}
			{hasMax && (
				<button type="button" onClick={onMaxClick} disabled={disabled} className={chipStyles}>
					{maxLabel}
				</button>
			)}
			{suffix != null && onSuffixClick != null && (
				<button
					type="button"
					onClick={onSuffixClick}
					disabled={disabled}
					aria-label={suffixAriaLabel}
					className="inline-flex shrink-0 items-center gap-1 whitespace-nowrap text-xs font-medium text-fg transition-colors hover:text-fg-secondary disabled:cursor-not-allowed disabled:text-fg-disabled"
				>
					{suffix}
					<CaretDownIcon className="size-3 text-fg-muted" weight="bold" />
				</button>
			)}
			{suffix != null && onSuffixClick == null && (
				<span className="shrink-0 whitespace-nowrap text-xs font-medium text-fg">{suffix}</span>
			)}
		</div>
	);

	const errorText = error != null && error !== false && <p className="mt-1 text-xs text-market-down">{error}</p>;

	if (!label) {
		if (!errorText) return field;
		return (
			<div className="w-full">
				{field}
				{errorText}
			</div>
		);
	}

	return (
		<div>
			<div className="mb-1.5 flex items-center justify-between">
				<label htmlFor={inputId} className={labelTypographyClass}>
					{label}
				</label>
				{labelValue != null && onLabelValueClick ? (
					<button
						type="button"
						onClick={onLabelValueClick}
						disabled={disabled}
						className="text-xs text-fg-muted tabular-nums hover:text-fg transition-colors cursor-pointer disabled:pointer-events-none"
					>
						{labelValue}
					</button>
				) : labelValue != null ? (
					<span className="text-xs text-fg-muted tabular-nums">{labelValue}</span>
				) : null}
			</div>
			{field}
			{errorText}
		</div>
	);
}
