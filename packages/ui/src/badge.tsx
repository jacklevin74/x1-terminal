import { cva, type VariantProps } from "class-variance-authority";
import * as React from "react";
import { DEFAULT_SIZE } from "./config";
import { cn } from "./utils";

type BadgeTone = "error" | "warning" | "success" | "information" | "neutral" | "brand";

const badgeVariants = cva(["inline-flex shrink-0 items-center whitespace-nowrap font-medium rounded-4 tabular-nums"], {
	variants: {
		tone: {
			error: "bg-error-soft text-error",
			warning: "bg-warning-soft text-warning",
			success: "bg-success-soft text-success",
			information: "bg-info-soft text-info",
			neutral: "bg-control text-fg-secondary",
			brand: "bg-brand-soft text-brand",
		},
		size: {
			xxs: "h-4 px-1 text-2xs gap-0.5",
			xs: "h-4 px-1 text-xs gap-0.5",
			sm: "h-5 px-1.5 text-xs gap-1",
			md: "h-6 px-2 text-xs gap-1",
			lg: "h-7 px-2 text-sm gap-1.5",
		},
	},
	defaultVariants: {
		tone: "neutral",
		size: "sm",
	},
});

const dotColors: Record<BadgeTone, string> = {
	error: "bg-error",
	warning: "bg-warning",
	success: "bg-success",
	information: "bg-info",
	neutral: "bg-fill",
	brand: "bg-brand",
};

const iconColors: Record<BadgeTone, string> = {
	error: "text-icon-error",
	warning: "text-icon-warning",
	success: "text-icon-success",
	information: "text-icon-info",
	neutral: "text-icon",
	brand: "text-icon-brand",
};

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement>, VariantProps<typeof badgeVariants> {
	tone?: BadgeTone;
	icon?: React.ReactNode;
	dot?: boolean;
}

const Badge = React.forwardRef<HTMLSpanElement, BadgeProps>(
	({ className, tone = "neutral", size: sizeProp, icon, dot, children, ...props }, ref) => {
		const size = sizeProp ?? DEFAULT_SIZE;

		return (
			<span className={cn(badgeVariants({ tone, size, className }))} ref={ref} {...props}>
				{icon && <span className={cn("shrink-0 flex items-center", iconColors[tone])}>{icon}</span>}
				{!icon && dot && <span className={cn("shrink-0 size-2 rounded-full", dotColors[tone])} />}
				{children}
			</span>
		);
	},
);
Badge.displayName = "Badge";

export { Badge, badgeVariants };
export type { BadgeProps, BadgeTone };
