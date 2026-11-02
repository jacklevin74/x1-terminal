import { Switch } from "@base-ui/react/switch";
import { cva, type VariantProps } from "class-variance-authority";
import * as React from "react";
import { DEFAULT_SIZE } from "./config";
import { cn } from "./utils";

const toggleVariants = cva(
	[
		"relative inline-flex shrink-0 cursor-pointer items-center rounded-full p-0.5",
		"max-md:before:absolute max-md:before:-inset-y-1.5 max-md:before:inset-x-0 max-md:before:content-['']",
		"transition-colors duration-150 motion-reduce:transition-none",
		"focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-stroke-focus",
		"data-unchecked:bg-control data-unchecked:hover:bg-control-hover",
		"data-checked:bg-brand",
		"data-disabled:cursor-not-allowed data-disabled:bg-control data-disabled:hover:bg-control",
		"before:content-[''] before:absolute before:top-1/2 before:left-1/2 before:-translate-1/2 before:min-w-11 before:min-h-11",
	],
	{
		variants: {
			size: {
				xxs: "h-4 w-7",
				xs: "h-5 w-9",
				sm: "h-6 w-11",
				md: "h-8 w-14",
				lg: "h-10 w-18",
			},
		},
		defaultVariants: {
			size: "sm",
		},
	},
);

const labelTextSizeClasses: Record<"xxs" | "xs" | "sm" | "md" | "lg", string> = {
	xxs: "text-xs",
	xs: "text-xs",
	sm: "text-xs",
	md: "text-sm",
	lg: "text-base",
};

const thumbVariants = cva(
	[
		"pointer-events-none block rounded-full",
		"data-unchecked:bg-fg-muted data-checked:bg-background data-disabled:bg-fg-disabled",
		"transition-[translate,background-color] duration-150 motion-reduce:transition-none",
	],
	{
		variants: {
			size: {
				xxs: "size-3 data-checked:translate-x-3",
				xs: "size-4 data-checked:translate-x-4",
				sm: "size-5 data-checked:translate-x-5",
				md: "size-7 data-checked:translate-x-6",
				lg: "size-9 data-checked:translate-x-8",
			},
		},
		defaultVariants: {
			size: "sm",
		},
	},
);

interface ToggleProps
	extends Omit<React.ComponentPropsWithoutRef<typeof Switch.Root>, "className">,
		VariantProps<typeof toggleVariants> {
	className?: string;
	label?: React.ReactNode;
}

const Toggle = React.forwardRef<HTMLButtonElement, ToggleProps>(
	({ className, size: sizeProp, label, disabled, ...props }, ref) => {
		const size = sizeProp ?? DEFAULT_SIZE;

		const track = (
			<Switch.Root
				ref={ref}
				disabled={disabled}
				className={cn(toggleVariants({ size }), !label && className)}
				{...props}
			>
				<Switch.Thumb className={cn(thumbVariants({ size }))} />
			</Switch.Root>
		);

		if (!label) return track;

		return (
			<label
				className={cn(
					"inline-flex items-center gap-3 select-none",
					disabled ? "cursor-not-allowed" : "cursor-pointer",
					className,
				)}
			>
				{track}
				<span className={cn("font-normal", labelTextSizeClasses[size], disabled ? "text-fg-disabled" : "text-fg")}>
					{label}
				</span>
			</label>
		);
	},
);
Toggle.displayName = "Toggle";

export { Toggle, toggleVariants, thumbVariants };
export type { ToggleProps };
