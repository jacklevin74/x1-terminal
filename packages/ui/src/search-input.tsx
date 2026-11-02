import { MagnifyingGlassIcon, XIcon } from "@phosphor-icons/react";
import { cva, type VariantProps } from "class-variance-authority";
import * as React from "react";
import { DEFAULT_SIZE } from "./config";
import { fieldErrorClass, fieldLabelClass } from "./text-input";
import { cn } from "./utils";

const searchInputVariants = cva(
	[
		"group flex items-center w-full rounded-8 bg-control transition-colors duration-150 motion-reduce:transition-none",
		"data-disabled:cursor-not-allowed",
	],
	{
		variants: {
			size: {
				xxs: "h-6 px-2 gap-1",
				xs: "h-7 px-2 gap-1.5",
				sm: "h-8 max-md:h-10 px-3 gap-2",
				md: "h-9 px-3 gap-2",
				lg: "h-10 px-3 gap-2",
			},
			error: {
				true: "ring-1 ring-inset ring-market-down",
				false:
					"focus-within:bg-control-hover focus-within:ring-1 focus-within:ring-inset focus-within:ring-stroke-control-focus",
			},
		},
		defaultVariants: {
			size: "sm",
			error: false,
		},
	},
);

interface SearchInputProps
	extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "size">,
		VariantProps<typeof searchInputVariants> {
	label?: string;
	helperText?: string;
	errorMessage?: string;
	onClear?: () => void;
}

type SearchInputSize = "xxs" | "xs" | "sm" | "md" | "lg";

const searchIconSizes: Record<SearchInputSize, number> = {
	xxs: 12,
	xs: 12,
	sm: 14,
	md: 14,
	lg: 16,
};

const searchInputTextClasses: Record<SearchInputSize, string> = {
	xxs: "text-xs",
	xs: "text-xs",
	sm: "text-xs max-md:text-base",
	md: "text-xs max-md:text-base",
	lg: "text-sm max-md:text-base",
};

const SearchInput = React.forwardRef<HTMLInputElement, SearchInputProps>(
	(
		{
			className,
			label,
			helperText,
			error,
			errorMessage,
			required,
			disabled,
			size: sizeProp,
			value,
			defaultValue,
			onChange,
			onClear,
			id,
			...props
		},
		ref,
	) => {
		const size = (sizeProp ?? DEFAULT_SIZE) as SearchInputSize;
		const reactId = React.useId();
		const inputId = id ?? reactId;
		const [internalValue, setInternalValue] = React.useState(defaultValue?.toString() ?? "");
		const currentValue = value !== undefined ? value.toString() : internalValue;
		const hasValue = currentValue.length > 0;

		const updateSearchValue = (e: React.ChangeEvent<HTMLInputElement>) => {
			if (value === undefined) {
				setInternalValue(e.target.value);
			}
			onChange?.(e);
		};

		const handleClear = () => {
			if (value === undefined) {
				setInternalValue("");
			}
			onClear?.();
		};

		const iconSize = searchIconSizes[size];

		return (
			<div className={cn("flex flex-col gap-1", className)}>
				{label && (
					<label htmlFor={inputId} className={fieldLabelClass}>
						{label}
						{required && <span> *</span>}
					</label>
				)}
				{helperText && <span className="text-xs text-fg-muted">{helperText}</span>}
				<div data-disabled={disabled || undefined} className={cn(searchInputVariants({ size, error }))}>
					<MagnifyingGlassIcon
						size={iconSize}
						weight="bold"
						className="shrink-0 text-fg-muted group-data-disabled:text-fg-disabled"
					/>
					<input
						ref={ref}
						id={inputId}
						type="search"
						value={currentValue}
						onChange={updateSearchValue}
						disabled={disabled}
						required={required}
						className={cn(
							"flex-1 min-w-0 bg-transparent outline-none",
							"[&::-webkit-search-cancel-button]:hidden [&::-webkit-search-decoration]:hidden",
							searchInputTextClasses[size],
							"text-fg placeholder:text-fg-muted",
							"disabled:text-fg-disabled disabled:placeholder:text-fg-disabled disabled:cursor-not-allowed",
						)}
						{...props}
					/>
					{hasValue && !disabled && (
						<button
							type="button"
							onClick={handleClear}
							tabIndex={-1}
							aria-label="Clear search"
							className="relative shrink-0 cursor-pointer text-fg-muted hover:text-fg transition-colors duration-150 motion-reduce:transition-none after:content-[''] after:absolute after:top-1/2 after:left-1/2 after:-translate-1/2 after:size-11"
						>
							<XIcon size={iconSize} weight="bold" />
						</button>
					)}
				</div>
				{error && errorMessage && <span className={fieldErrorClass}>{errorMessage}</span>}
			</div>
		);
	},
);

SearchInput.displayName = "SearchInput";

export { SearchInput, searchInputVariants };
export type { SearchInputProps };
