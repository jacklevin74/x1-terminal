import { CheckIcon, XIcon } from "@phosphor-icons/react";
import { cva, type VariantProps } from "class-variance-authority";
import * as React from "react";
import { DEFAULT_SIZE } from "./config";
import { cn } from "./utils";

const tagVariants = cva(
	[
		"inline-flex items-center font-normal select-none",
		"rounded-4 whitespace-nowrap",
		"transition-colors duration-150 motion-reduce:transition-none",
		"data-disabled:text-fg-disabled data-disabled:cursor-not-allowed",
	],
	{
		variants: {
			variant: {
				filled: "bg-control text-fg",
				outline: "bg-control text-fg",
			},
			size: {
				xxs: "h-4 px-1 gap-1 text-xs",
				xs: "h-5 px-1.5 gap-1 text-xs",
				sm: "h-5 px-2 gap-1 text-xs",
				md: "h-6 px-2 gap-1.5 text-xs",
				lg: "h-7 px-3 gap-1.5 text-sm",
			},
		},
		defaultVariants: {
			variant: "filled",
			size: "sm",
		},
	},
);

const iconSizes: Record<string, number> = {
	xxs: 10,
	xs: 12,
	sm: 12,
	md: 16,
	lg: 20,
};

interface TagProps extends React.HTMLAttributes<HTMLSpanElement>, VariantProps<typeof tagVariants> {
	selected?: boolean;
	disabled?: boolean;
	onDismiss?: () => void;
}

const Tag = React.forwardRef<HTMLSpanElement, TagProps>(
	({ className, variant, size: sizeProp, selected, disabled, onDismiss, children, ...props }, ref) => {
		const size = sizeProp ?? DEFAULT_SIZE;
		const iconSize = iconSizes[size ?? "md"];

		return (
			<span
				className={cn(tagVariants({ variant, size }), selected && "bg-control-hover text-fg", className)}
				ref={ref}
				data-disabled={disabled ? "" : undefined}
				{...props}
			>
				{selected && <CheckIcon size={iconSize} weight="bold" />}
				{children}
				{onDismiss && (
					<button
						type="button"
						onClick={(e) => {
							e.stopPropagation();
							if (!disabled) onDismiss();
						}}
						className={cn(
							"relative inline-flex items-center justify-center shrink-0",
							"text-fg-muted hover:text-fg transition-colors motion-reduce:transition-none",
							"after:content-[''] after:absolute after:top-1/2 after:left-1/2 after:-translate-1/2 after:size-11",
							disabled && "pointer-events-none",
						)}
						aria-label="Remove"
						tabIndex={disabled ? -1 : 0}
					>
						<XIcon size={iconSize} weight="bold" />
					</button>
				)}
			</span>
		);
	},
);
Tag.displayName = "Tag";

export { Tag, tagVariants };
export type { TagProps };
