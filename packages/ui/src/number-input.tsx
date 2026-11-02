import { Field } from "@base-ui/react/field";
import { NumberField } from "@base-ui/react/number-field";
import { MinusIcon, PlusIcon } from "@phosphor-icons/react";
import type { VariantProps } from "class-variance-authority";
import * as React from "react";
import { DEFAULT_SIZE } from "./config";
import {
	fieldErrorClass,
	fieldInlineLabelClass,
	fieldLabelClass,
	fieldSuffixClass,
	textInputVariants as numberInputVariants,
} from "./text-input";
import { cn } from "./utils";

const stepperButtonClasses = [
	"inline-flex items-center justify-center shrink-0 size-5 rounded-4",
	"text-fg-muted hover:text-fg hover:bg-control-hover",
	"transition-colors duration-150 cursor-pointer select-none",
	"focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-stroke-focus",
	"data-disabled:text-icon-disabled data-disabled:cursor-not-allowed data-disabled:pointer-events-none",
].join(" ");

const inputTextSizeClasses: Record<"xxs" | "xs" | "sm" | "md" | "lg", string> = {
	xxs: "text-xs",
	xs: "text-xs",
	sm: "text-xs max-md:text-base",
	md: "text-xs max-md:text-base",
	lg: "text-sm max-md:text-base",
};

const stepperIconSizes: Record<"xxs" | "xs" | "sm" | "md" | "lg", number> = {
	xxs: 10,
	xs: 12,
	sm: 12,
	md: 14,
	lg: 14,
};

interface NumberInputProps extends Omit<VariantProps<typeof numberInputVariants>, "invalid"> {
	value?: number | null;
	defaultValue?: number | null;
	onValueChange?: (value: number | null, details: NumberField.Root.ChangeEventDetails) => void;
	onValueCommitted?: (value: number | null, details: NumberField.Root.CommitEventDetails) => void;
	min?: number;
	max?: number;
	step?: number | "any";
	smallStep?: number;
	largeStep?: number;
	format?: Intl.NumberFormatOptions;
	locale?: Intl.LocalesArgument;
	allowOutOfRange?: boolean;
	allowWheelScrub?: boolean;
	label?: string;
	hint?: string;
	error?: string;
	invalid?: boolean;
	required?: boolean;
	optional?: boolean;
	disabled?: boolean;
	readOnly?: boolean;
	name?: string;
	id?: string;
	placeholder?: string;
	selectOnFocus?: boolean;
	showStepper?: boolean;
	prefix?: React.ReactNode;
	inlineLabel?: React.ReactNode;
	suffix?: React.ReactNode;
	iconLeft?: React.ReactNode;
	className?: string;
	size?: "xxs" | "xs" | "sm" | "md" | "lg";
	onBlur?: React.FocusEventHandler<HTMLInputElement>;
	onFocus?: React.FocusEventHandler<HTMLInputElement>;
}

const NumberInput = React.forwardRef<HTMLDivElement, NumberInputProps>(
	(
		{
			className,
			size: sizeProp,
			value,
			defaultValue,
			onValueChange,
			onValueCommitted,
			min,
			max,
			step,
			smallStep,
			largeStep,
			format,
			locale,
			allowOutOfRange,
			allowWheelScrub,
			label,
			hint,
			error,
			invalid,
			required,
			optional,
			disabled,
			readOnly,
			name,
			id,
			placeholder,
			selectOnFocus,
			showStepper = false,
			prefix,
			inlineLabel,
			suffix,
			iconLeft,
			onBlur,
			onFocus,
		},
		ref,
	) => {
		const size = sizeProp ?? DEFAULT_SIZE;
		const isInvalid = !!error || !!invalid;
		const stepperSize = stepperIconSizes[size];

		function selectTextOnFocus(e: React.FocusEvent<HTMLInputElement>) {
			if (selectOnFocus) {
				e.target.select();
			}
			onFocus?.(e);
		}

		return (
			<Field.Root className="group flex flex-col gap-1 w-full" disabled={disabled} invalid={isInvalid} name={name}>
				{label && (
					<div className="flex flex-col">
						<Field.Label className={fieldLabelClass}>
							<span className="group-data-disabled:text-fg-disabled">{label}</span>
							{required && <span className="group-data-disabled:text-fg-disabled">*</span>}
							{optional && <span className="group-data-disabled:text-fg-disabled">(optional)</span>}
						</Field.Label>
						{hint && <Field.Description className="text-xs text-fg-muted">{hint}</Field.Description>}
					</div>
				)}
				<NumberField.Root
					ref={ref}
					id={id}
					value={value}
					defaultValue={defaultValue ?? undefined}
					onValueChange={onValueChange}
					onValueCommitted={onValueCommitted}
					min={min}
					max={max}
					step={step}
					smallStep={smallStep}
					largeStep={largeStep}
					format={format}
					locale={locale}
					allowOutOfRange={allowOutOfRange}
					allowWheelScrub={allowWheelScrub}
					required={required}
					disabled={disabled}
					readOnly={readOnly}
					name={name}
				>
					<NumberField.Group
						className={cn(
							numberInputVariants({ size, invalid: isInvalid }),
							"group-data-disabled:cursor-not-allowed",
							className,
						)}
					>
						{showStepper && !readOnly && (
							<NumberField.Decrement className={stepperButtonClasses}>
								<MinusIcon size={stepperSize} weight="bold" />
							</NumberField.Decrement>
						)}
						{inlineLabel && <span className={fieldInlineLabelClass}>{inlineLabel}</span>}
						{prefix && <span className="shrink-0 text-fg-muted group-data-disabled:text-fg-disabled">{prefix}</span>}
						{iconLeft && (
							<span className="shrink-0 text-fg-muted group-data-disabled:text-icon-disabled">{iconLeft}</span>
						)}
						<NumberField.Input
							placeholder={placeholder}
							onFocus={selectTextOnFocus}
							onBlur={onBlur}
							className={cn(
								"flex-1 min-w-0 bg-transparent outline-none tabular-nums",
								inputTextSizeClasses[size],
								inlineLabel && "text-right",
								"font-normal text-fg placeholder:text-fg-muted",
								"data-disabled:text-fg-disabled data-disabled:placeholder:text-fg-disabled data-disabled:cursor-not-allowed",
							)}
						/>
						{suffix && <span className={fieldSuffixClass}>{suffix}</span>}
						{showStepper && !readOnly && (
							<NumberField.Increment className={stepperButtonClasses}>
								<PlusIcon size={stepperSize} weight="bold" />
							</NumberField.Increment>
						)}
					</NumberField.Group>
				</NumberField.Root>
				{error && (
					<Field.Error match className={fieldErrorClass}>
						{error}
					</Field.Error>
				)}
			</Field.Root>
		);
	},
);
NumberInput.displayName = "NumberInput";

export { NumberInput, numberInputVariants };
export type { NumberInputProps };
