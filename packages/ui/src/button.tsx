import { Button as BaseButton } from "@base-ui/react/button";
import { cva, type VariantProps } from "class-variance-authority";
import * as React from "react";
import { DEFAULT_SIZE } from "./config";
import { cn } from "./utils";

const buttonVariants = cva(
	[
		"inline-flex shrink-0 items-center justify-center gap-2",
		"select-none cursor-pointer whitespace-nowrap",
		"rounded-8",
		"transition-[color,background-color,filter,scale] duration-150 ease-out motion-reduce:transition-none motion-reduce:active:scale-100",
		"focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-stroke-focus",
		"data-disabled:cursor-not-allowed",
	],
	{
		variants: {
			variant: {
				filled: "active:not-data-disabled:scale-[0.97]",
				secondary: "bg-control active:not-data-disabled:scale-[0.97]",
				outline: "bg-control active:not-data-disabled:scale-[0.97]",
				ghost: "bg-transparent active:not-data-disabled:scale-[0.97]",
				link: "bg-transparent underline underline-offset-4",
			},
			intent: {
				brand: "",
				neutral: "",
				error: "",
				inverse: "",
				up: "",
				down: "",
			},
			size: {
				xxs: "h-5 px-1.5 text-xs font-normal gap-1 rounded-4",
				xs: "h-7 px-3 text-xs font-medium gap-1",
				sm: "h-8 px-3 text-xs font-medium gap-1.5",
				md: "h-9 max-md:h-11 px-4 text-sm font-semibold",
				lg: "h-11 px-6 text-sm font-semibold",
			},
		},
		compoundVariants: [
			{
				variant: "filled",
				className:
					"hover:brightness-110 active:brightness-95 data-disabled:bg-control data-disabled:text-fg-disabled data-disabled:brightness-100",
			},
			{ variant: "filled", intent: "brand", className: "bg-brand text-fg-inverse" },
			{ variant: "filled", intent: "neutral", className: "bg-fill text-fg-inverse" },
			{ variant: "filled", intent: "error", className: "bg-error text-fg-inverse" },
			{ variant: "filled", intent: "inverse", className: "bg-fill-inverse text-fg" },
			{ variant: "filled", intent: "up", className: "bg-market-up text-background" },
			{ variant: "filled", intent: "down", className: "bg-market-down text-background" },

			{
				variant: ["secondary", "outline"],
				className:
					"hover:bg-control-hover active:bg-control-hover data-disabled:bg-control data-disabled:text-fg-disabled",
			},
			{ variant: ["secondary", "outline", "ghost"], size: ["md", "lg"], className: "text-xs font-medium" },
			{ variant: ["secondary", "outline"], intent: "brand", className: "text-brand" },
			{ variant: ["secondary", "outline"], intent: "neutral", className: "text-fg" },
			{ variant: ["secondary", "outline"], intent: "error", className: "text-error" },
			{ variant: ["secondary", "outline"], intent: "up", className: "text-market-up" },
			{ variant: ["secondary", "outline"], intent: "down", className: "text-market-down" },
			{
				variant: ["secondary", "outline"],
				intent: "inverse",
				className: "bg-fill-inverse text-fg hover:bg-fill-inverse active:bg-fill-inverse hover:brightness-125",
			},

			{
				variant: "ghost",
				className:
					"hover:bg-control active:bg-control-hover data-disabled:bg-transparent data-disabled:text-fg-disabled",
			},
			{ variant: "ghost", intent: "brand", className: "text-brand" },
			{ variant: "ghost", intent: "neutral", className: "text-fg" },
			{ variant: "ghost", intent: "error", className: "text-error" },
			{ variant: "ghost", intent: "up", className: "text-market-up" },
			{ variant: "ghost", intent: "down", className: "text-market-down" },
			{
				variant: "ghost",
				intent: "inverse",
				className: "text-fg-inverse hover:bg-fill-inverse-hover active:bg-fill-inverse-press",
			},

			{ variant: "link", className: "h-auto px-0 hover:brightness-125 data-disabled:text-fg-disabled" },
			{ variant: "link", intent: "brand", className: "text-brand" },
			{ variant: "link", intent: "neutral", className: "text-fg" },
			{ variant: "link", intent: "error", className: "text-error" },
			{ variant: "link", intent: "inverse", className: "text-fg-inverse" },
			{ variant: "link", intent: "up", className: "text-market-up" },
			{ variant: "link", intent: "down", className: "text-market-down" },
		],
		defaultVariants: {
			variant: "filled",
			intent: "brand",
			size: "sm",
		},
	},
);

const iconPaddingLeft: Record<string, string> = {
	xxs: "pl-1",
	xs: "pl-2",
	sm: "pl-2",
	md: "pl-3",
	lg: "pl-5",
};

const iconPaddingRight: Record<string, string> = {
	xxs: "pr-1",
	xs: "pr-2",
	sm: "pr-2",
	md: "pr-3",
	lg: "pr-5",
};

interface ButtonProps extends React.ComponentPropsWithoutRef<typeof BaseButton>, VariantProps<typeof buttonVariants> {
	iconLeft?: React.ReactNode;
	iconRight?: React.ReactNode;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
	({ className, variant, intent, size: sizeProp, iconLeft, iconRight, children, ...props }, ref) => {
		const size = sizeProp ?? DEFAULT_SIZE;

		return (
			<BaseButton
				className={cn(
					buttonVariants({ variant, intent, size, className }),
					iconLeft && iconPaddingLeft[size],
					iconRight && iconPaddingRight[size],
				)}
				ref={ref}
				{...props}
			>
				{iconLeft}
				{children}
				{iconRight}
			</BaseButton>
		);
	},
);
Button.displayName = "Button";

export { Button, buttonVariants };
export type { ButtonProps };
