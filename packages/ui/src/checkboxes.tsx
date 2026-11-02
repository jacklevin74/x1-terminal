import { Checkbox as BaseCheckbox } from "@base-ui/react/checkbox";
import { CheckboxGroup as BaseCheckboxGroup } from "@base-ui/react/checkbox-group";
import { CheckIcon, MinusIcon } from "@phosphor-icons/react";
import { cva, type VariantProps } from "class-variance-authority";
import * as React from "react";
import { DEFAULT_SIZE } from "./config";
import { cn } from "./utils";

const checkboxVariants = cva(
	[
		"relative inline-flex items-center justify-center shrink-0",
		"rounded-4 bg-control",
		"transition-colors duration-150 motion-reduce:transition-none",
		"not-data-checked:not-data-indeterminate:hover:bg-control-hover",
		"focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-stroke-focus",
		"data-checked:bg-brand data-indeterminate:bg-brand",
		"data-disabled:cursor-not-allowed data-checked:data-disabled:bg-control data-indeterminate:data-disabled:bg-control",
		"after:content-[''] after:absolute after:top-1/2 after:left-1/2 after:-translate-1/2 after:size-11",
	],
	{
		variants: {
			size: {
				xxs: "size-3",
				xs: "size-3.5",
				sm: "size-4",
				md: "size-5",
				lg: "size-6",
			},
			error: {
				true: "ring-1 ring-inset ring-market-down",
				false: "",
			},
		},
		defaultVariants: {
			size: "sm",
			error: false,
		},
	},
);

const iconSizeMap = {
	xxs: 10,
	xs: 10,
	sm: 12,
	md: 14,
	lg: 16,
} as const;

interface CheckboxProps
	extends Omit<React.ComponentPropsWithoutRef<typeof BaseCheckbox.Root>, "className">,
		VariantProps<typeof checkboxVariants> {
	className?: string;
	label?: React.ReactNode;
	description?: React.ReactNode;
	errorMessage?: string;
}

const Checkbox = React.forwardRef<HTMLElement, CheckboxProps>(
	({ className, size: sizeProp, error, label, description, errorMessage, disabled, indeterminate, ...props }, ref) => {
		const size = sizeProp ?? DEFAULT_SIZE;
		const iconSize = iconSizeMap[size ?? "md"];

		return (
			<label
				className={cn(
					"inline-flex items-start gap-2 select-none",
					disabled ? "cursor-not-allowed" : "cursor-pointer",
					className,
				)}
			>
				<BaseCheckbox.Root
					ref={ref}
					disabled={disabled}
					indeterminate={indeterminate}
					className={cn(checkboxVariants({ size, error }))}
					{...props}
				>
					<BaseCheckbox.Indicator className="flex items-center justify-center text-fg-inverse in-data-disabled:text-fg-muted">
						{indeterminate ? <MinusIcon size={iconSize} weight="bold" /> : <CheckIcon size={iconSize} weight="bold" />}
					</BaseCheckbox.Indicator>
				</BaseCheckbox.Root>
				{(label || description || (error && errorMessage)) && (
					<span className="flex flex-col gap-1">
						{label && (
							<span className={cn("text-xs font-normal", disabled ? "text-fg-disabled" : "text-fg")}>{label}</span>
						)}
						{description && <span className="text-xs text-fg-muted">{description}</span>}
						{error && errorMessage && <span className="text-xs text-market-down">{errorMessage}</span>}
					</span>
				)}
			</label>
		);
	},
);
Checkbox.displayName = "Checkbox";

interface CheckboxGroupProps extends React.ComponentPropsWithoutRef<typeof BaseCheckboxGroup> {
	label?: string;
}

const CheckboxGroup = React.forwardRef<HTMLDivElement, CheckboxGroupProps>(
	({ className, label, children, ...props }, ref) => (
		<BaseCheckboxGroup ref={ref} className={cn("flex flex-col gap-3", className)} {...props}>
			{label && <span className="text-xs font-medium text-fg">{label}</span>}
			{children}
		</BaseCheckboxGroup>
	),
);
CheckboxGroup.displayName = "CheckboxGroup";

export { Checkbox, checkboxVariants, CheckboxGroup };
export type { CheckboxProps, CheckboxGroupProps };
