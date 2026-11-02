/**
 * Bare controlled input for the trade UI.
 *
 * This wraps `@base-ui/react/input` rather than `TextInput` from `@hypeterminal/ui`
 * because `TextInput` is a full form field (wraps the input in `Field.Root` with
 * label/hint/error slots). The trade UI needs a stripped-down input whose class
 * string composes directly with `cn()` at the callsite, with a tighter `sm` size
 * and tabular-num spacing for price/size entry. Do not replace with `TextInput`.
 */
import { Input as BaseInput } from "@base-ui/react/input";
import type * as React from "react";
import { cn } from "@/lib/cn";

type InputSize = "sm" | "default" | "lg" | "xl";
type InputProps = Omit<React.ComponentProps<typeof BaseInput>, "className"> & {
	inputSize?: InputSize;
	className?: string;
};

const inputBaseStyles = [
	"text-fg placeholder:text-fg-muted selection:bg-sel",
	"min-w-0 rounded-8 bg-control px-3 tabular-nums",
	"transition-[color,background-color,box-shadow] outline-none",
	"disabled:cursor-not-allowed disabled:text-fg-disabled disabled:placeholder:text-fg-disabled",
	"focus-visible:bg-control-hover focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-stroke-control-focus",
	"aria-invalid:ring-1 aria-invalid:ring-inset aria-invalid:ring-market-down",
].join(" ");

const inputSizeStyles: Record<InputSize, string> = {
	sm: "h-6 px-2 text-xs",
	default: "h-8 max-md:h-10 text-xs max-md:text-base",
	lg: "h-9 text-sm max-md:text-base",
	xl: "h-11 text-base",
};

function getInputClassName(inputSize: InputSize, className?: string) {
	return cn(inputBaseStyles, inputSizeStyles[inputSize], className);
}

function Input({ className, type, inputSize = "default", ...props }: InputProps) {
	return (
		<BaseInput
			type={type}
			data-slot="input"
			data-size={inputSize}
			className={cn("w-full", getInputClassName(inputSize, className))}
			{...props}
		/>
	);
}

export { Input, inputBaseStyles, inputSizeStyles, getInputClassName };
export type { InputSize };
