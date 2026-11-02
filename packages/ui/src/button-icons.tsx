import { Button as BaseButton } from "@base-ui/react/button";
import { cva, type VariantProps } from "class-variance-authority";
import * as React from "react";
import { DEFAULT_SIZE } from "./config";
import { cn } from "./utils";

const buttonIconVariants = cva(
	[
		"inline-flex items-center justify-center",
		"shrink-0 select-none cursor-pointer",
		"rounded-8",
		"transition-[color,background-color,filter,scale] duration-150 ease-out motion-reduce:transition-none motion-reduce:active:scale-100",
		"active:not-data-disabled:scale-[0.97]",
		"focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-stroke-focus",
		"data-disabled:cursor-not-allowed",
	],
	{
		variants: {
			variant: {
				filled: "hover:brightness-110 active:brightness-95 data-disabled:bg-control data-disabled:text-fg-disabled",
				secondary: "bg-control hover:bg-control-hover active:bg-control-hover data-disabled:text-fg-disabled",
				outline: "bg-control hover:bg-control-hover active:bg-control-hover data-disabled:text-fg-disabled",
				ghost: "bg-transparent hover:bg-control active:bg-control-hover data-disabled:text-fg-disabled",
			},
			intent: {
				brand: "",
				neutral: "",
				error: "",
				inverse: "",
			},
			size: {
				xxs: "size-5 rounded-4 relative before:absolute before:-inset-1.5 before:content-['']",
				xs: "size-6 relative before:absolute before:-inset-1 before:content-['']",
				sm: "size-8 max-md:size-10",
				md: "size-10",
				lg: "size-11",
			},
		},
		compoundVariants: [
			{ variant: "filled", intent: "brand", className: "bg-brand text-fg-inverse" },
			{ variant: "filled", intent: "neutral", className: "bg-fill text-fg-inverse" },
			{ variant: "filled", intent: "error", className: "bg-error text-fg-inverse" },
			{ variant: "filled", intent: "inverse", className: "bg-fill-inverse text-fg" },
			{ variant: ["secondary", "outline", "ghost"], intent: "brand", className: "text-brand" },
			{ variant: ["secondary", "outline", "ghost"], intent: "neutral", className: "text-fg" },
			{ variant: ["secondary", "outline", "ghost"], intent: "error", className: "text-error" },
			{
				variant: ["secondary", "outline", "ghost"],
				intent: "inverse",
				className: "text-fg-inverse hover:bg-fill-inverse-hover active:bg-fill-inverse-press",
			},
		],
		defaultVariants: {
			variant: "filled",
			intent: "brand",
			size: "sm",
		},
	},
);

interface ButtonIconProps
	extends React.ComponentPropsWithoutRef<typeof BaseButton>,
		VariantProps<typeof buttonIconVariants> {
	"aria-label": string;
}

const ButtonIcon = React.forwardRef<HTMLButtonElement, ButtonIconProps>(
	({ className, variant, intent, size: sizeProp, children, ...props }, ref) => {
		const size = sizeProp ?? DEFAULT_SIZE;

		return (
			<BaseButton className={cn(buttonIconVariants({ variant, intent, size, className }))} ref={ref} {...props}>
				{children}
			</BaseButton>
		);
	},
);
ButtonIcon.displayName = "ButtonIcon";

export { ButtonIcon, buttonIconVariants };
export type { ButtonIconProps };
