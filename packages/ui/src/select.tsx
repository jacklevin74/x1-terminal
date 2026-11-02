import { Field } from "@base-ui/react/field";
import { Select as BaseSelect } from "@base-ui/react/select";
import { CaretDownIcon, CheckIcon } from "@phosphor-icons/react";
import { cva, type VariantProps } from "class-variance-authority";
import * as React from "react";
import { DEFAULT_SIZE } from "./config";
import { menuItemClass, menuPopupClass } from "./dropdown";
import { fieldErrorClass, fieldInlineLabelClass, fieldLabelClass } from "./text-input";
import { cn } from "./utils";

const selectTriggerVariants = cva(
	[
		"group/trigger flex items-center rounded-8 transition-colors duration-150 motion-reduce:transition-none",
		"cursor-pointer select-none outline-none",
		"focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-stroke-focus",
	],
	{
		variants: {
			variant: {
				filled: "w-full bg-control hover:bg-control-hover data-popup-open:bg-control-hover",
				text: "w-auto bg-transparent text-fg hover:text-fg",
			},
			size: {
				xxs: "",
				xs: "",
				sm: "",
				md: "",
				lg: "",
			},
			error: {
				true: "ring-1 ring-inset ring-market-down",
				false: "",
			},
		},
		compoundVariants: [
			{ variant: "filled", size: "xxs", className: "h-6 px-2 gap-1" },
			{ variant: "filled", size: "xs", className: "h-7 px-2 gap-1" },
			{ variant: "filled", size: "sm", className: "h-8 max-md:h-10 px-3 gap-2" },
			{ variant: "filled", size: "md", className: "h-9 px-3 gap-2" },
			{ variant: "filled", size: "lg", className: "h-10 px-3 gap-2" },
			{ variant: "text", className: "h-6 px-1 gap-1" },
		],
		defaultVariants: {
			variant: "filled",
			size: "sm",
			error: false,
		},
	},
);

interface SelectOption {
	value: string;
	label: string;
	disabled?: boolean;
}

interface SelectGroupOption {
	label: string;
	options: SelectOption[];
}

interface SelectProps extends VariantProps<typeof selectTriggerVariants> {
	label?: string;
	inlineLabel?: React.ReactNode;
	helperText?: string;
	placeholder?: string;
	options: (SelectOption | SelectGroupOption)[];
	errorMessage?: string;
	required?: boolean;
	disabled?: boolean;
	className?: string;
	triggerClassName?: string;
	name?: string;
	value?: string | null;
	defaultValue?: string | null;
	onValueChange?: (value: string | null) => void;
	"aria-label"?: string;
}

function isGroupOption(option: SelectOption | SelectGroupOption): option is SelectGroupOption {
	return "options" in option;
}

function findSelectedLabel(
	options: (SelectOption | SelectGroupOption)[],
	value: string | null | undefined,
): string | undefined {
	if (!value) return undefined;
	for (const opt of options) {
		if (isGroupOption(opt)) {
			for (const option of opt.options) {
				if (option.value === value) return option.label;
			}
		} else if (opt.value === value) {
			return opt.label;
		}
	}
	return undefined;
}

const Select = React.forwardRef<HTMLDivElement, SelectProps>(
	(
		{
			className,
			triggerClassName,
			size: sizeProp,
			variant,
			error,
			label,
			inlineLabel,
			helperText,
			placeholder = "Select an option",
			options,
			errorMessage,
			required = false,
			disabled = false,
			name,
			value,
			defaultValue,
			onValueChange,
			"aria-label": ariaLabel,
		},
		ref,
	) => {
		const size = sizeProp ?? DEFAULT_SIZE;
		const selectedLabel = findSelectedLabel(options, value ?? defaultValue);
		const renderItem = (option: SelectOption) => (
			<BaseSelect.Item
				key={option.value}
				value={option.value}
				disabled={option.disabled}
				className={cn(menuItemClass, "justify-between data-selected:font-medium")}
			>
				<BaseSelect.ItemText>{option.label}</BaseSelect.ItemText>
				<BaseSelect.ItemIndicator className="shrink-0 text-fg">
					<CheckIcon size={12} weight="bold" />
				</BaseSelect.ItemIndicator>
			</BaseSelect.Item>
		);

		return (
			<Field.Root className={cn("flex flex-col gap-1", className)} disabled={disabled} name={name} ref={ref}>
				{label && (
					<Field.Label className={cn(fieldLabelClass, "data-disabled:text-fg-disabled")}>
						{label}
						{required && <span> *</span>}
					</Field.Label>
				)}
				{helperText && (
					<Field.Description className="text-xs text-fg-muted data-disabled:text-fg-disabled">
						{helperText}
					</Field.Description>
				)}

				<BaseSelect.Root
					value={value !== undefined ? value : undefined}
					defaultValue={defaultValue !== undefined ? defaultValue : undefined}
					onValueChange={onValueChange ? (val) => onValueChange(val as string | null) : undefined}
					disabled={disabled}
					required={required}
					name={name}
				>
					<BaseSelect.Trigger
						aria-label={ariaLabel}
						className={cn(
							selectTriggerVariants({ variant, size, error }),
							"data-disabled:cursor-not-allowed data-disabled:text-fg-disabled",
							triggerClassName,
						)}
					>
						{inlineLabel && <span className={fieldInlineLabelClass}>{inlineLabel}</span>}
						<BaseSelect.Value
							placeholder={placeholder}
							className={cn(
								"truncate text-xs font-normal",
								variant === "text" ? "text-left" : "flex-1",
								inlineLabel ? "text-right" : "text-left",
								selectedLabel ? "text-fg" : "text-fg-muted",
								"group-data-disabled/trigger:text-fg-disabled",
							)}
						>
							{selectedLabel}
						</BaseSelect.Value>
						<BaseSelect.Icon className="shrink-0 text-fg-muted transition-transform duration-150 group-data-popup-open/trigger:rotate-180 motion-reduce:transition-none">
							<CaretDownIcon size={12} weight="bold" />
						</BaseSelect.Icon>
					</BaseSelect.Trigger>

					<BaseSelect.Portal>
						<BaseSelect.Positioner sideOffset={4} alignItemWithTrigger={false} className="z-[var(--z-dropdown)]">
							<BaseSelect.Popup className={cn(menuPopupClass, "min-w-(--anchor-width)")}>
								{options.map((option) =>
									isGroupOption(option) ? (
										<BaseSelect.Group key={option.label}>
											<BaseSelect.GroupLabel className="flex h-6 items-center px-2 text-2xs font-normal uppercase tracking-micro text-fg-muted select-none">
												{option.label}
											</BaseSelect.GroupLabel>
											{option.options.map(renderItem)}
										</BaseSelect.Group>
									) : (
										renderItem(option)
									),
								)}
							</BaseSelect.Popup>
						</BaseSelect.Positioner>
					</BaseSelect.Portal>
				</BaseSelect.Root>

				{error && errorMessage && <span className={fieldErrorClass}>{errorMessage}</span>}
			</Field.Root>
		);
	},
);
Select.displayName = "Select";

export { Select, selectTriggerVariants };
export type { SelectProps, SelectOption, SelectGroupOption };
