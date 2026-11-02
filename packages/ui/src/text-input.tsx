import { Field } from "@base-ui/react/field";
import { Input } from "@base-ui/react/input";
import { cva, type VariantProps } from "class-variance-authority";
import * as React from "react";
import { DEFAULT_SIZE } from "./config";
import { cn } from "./utils";

const textInputVariants = cva(
	["flex items-center w-full rounded-8 bg-control", "transition-colors duration-150 motion-reduce:transition-none"],
	{
		variants: {
			size: {
				xxs: "h-6 px-2 gap-1",
				xs: "h-7 px-2 gap-1",
				sm: "h-8 max-md:h-10 px-3 gap-2",
				md: "h-9 px-3 gap-2",
				lg: "h-10 px-3 gap-2",
			},
			invalid: {
				true: "ring-1 ring-inset ring-market-down",
				false:
					"focus-within:bg-control-hover focus-within:ring-1 focus-within:ring-inset focus-within:ring-stroke-control-focus",
			},
		},
		defaultVariants: {
			size: "sm",
			invalid: false,
		},
	},
);

const inputTextSizeClasses: Record<"xxs" | "xs" | "sm" | "md" | "lg", string> = {
	xxs: "text-xs",
	xs: "text-xs",
	sm: "text-xs max-md:text-base",
	md: "text-xs max-md:text-base",
	lg: "text-sm max-md:text-base",
};

const fieldLabelClass = "flex gap-1 items-baseline text-xs font-normal text-fg-muted cursor-default";
const fieldErrorClass = "text-xs text-market-down";
const fieldInlineLabelClass = "shrink-0 text-xs font-normal text-fg-muted group-data-disabled:text-fg-disabled";
const fieldSuffixClass = "shrink-0 text-xs font-medium text-fg group-data-disabled:text-fg-disabled";

interface TextInputProps
	extends Omit<React.ComponentPropsWithoutRef<"input">, "prefix" | "size">,
		Omit<VariantProps<typeof textInputVariants>, "invalid"> {
	label?: string;
	hint?: string;
	error?: string;
	invalid?: boolean;
	optional?: boolean;
	prefix?: React.ReactNode;
	inlineLabel?: React.ReactNode;
	suffix?: React.ReactNode;
	iconLeft?: React.ReactNode;
	iconRight?: React.ReactNode;
	size?: "xxs" | "xs" | "sm" | "md" | "lg";
}

const TextInput = React.forwardRef<HTMLInputElement, TextInputProps>(
	(
		{
			className,
			size: sizeProp,
			label,
			hint,
			error,
			invalid,
			required,
			optional,
			disabled,
			prefix,
			inlineLabel,
			suffix,
			iconLeft,
			iconRight,
			name,
			...props
		},
		ref,
	) => {
		const size = sizeProp ?? DEFAULT_SIZE;
		const isInvalid = !!error || !!invalid;

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
				<div
					className={cn(
						textInputVariants({ size, invalid: isInvalid }),
						"group-data-disabled:cursor-not-allowed",
						className,
					)}
				>
					{inlineLabel && <span className={fieldInlineLabelClass}>{inlineLabel}</span>}
					{prefix && <span className="shrink-0 text-fg-muted group-data-disabled:text-fg-disabled">{prefix}</span>}
					{iconLeft && (
						<span className="shrink-0 text-fg-muted group-data-disabled:text-icon-disabled">{iconLeft}</span>
					)}
					<Input
						ref={ref}
						required={required}
						className={cn(
							"flex-1 min-w-0 bg-transparent outline-none",
							inputTextSizeClasses[size],
							inlineLabel && "text-right tabular-nums",
							"font-normal text-fg placeholder:text-fg-muted",
							"data-disabled:text-fg-disabled data-disabled:placeholder:text-fg-disabled data-disabled:cursor-not-allowed",
						)}
						{...props}
					/>
					{suffix && <span className={fieldSuffixClass}>{suffix}</span>}
					{iconRight && (
						<span className="shrink-0 text-fg-muted group-data-disabled:text-icon-disabled">{iconRight}</span>
					)}
				</div>
				{error && (
					<Field.Error match className={fieldErrorClass}>
						{error}
					</Field.Error>
				)}
			</Field.Root>
		);
	},
);
TextInput.displayName = "TextInput";

export { TextInput, textInputVariants, fieldLabelClass, fieldErrorClass, fieldInlineLabelClass, fieldSuffixClass };
export type { TextInputProps };
