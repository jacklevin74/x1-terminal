import { Tabs } from "@base-ui/react/tabs";
import { cva, type VariantProps } from "class-variance-authority";
import * as React from "react";
import { DEFAULT_SIZE } from "./config";
import { cn } from "./utils";

type SegmentedControlSize = "xxs" | "xs" | "sm" | "md" | "lg";
type SegmentedControlTone = "neutral" | "up" | "down";

const SegmentedControlsContext = React.createContext<{
	size: SegmentedControlSize;
	fullWidth: boolean;
	disabled: boolean;
	tone: SegmentedControlTone;
}>({
	size: "sm",
	fullWidth: false,
	disabled: false,
	tone: "neutral",
});

const indicatorToneClasses: Record<SegmentedControlTone, string> = {
	neutral: "bg-control-hover",
	up: "bg-market-up",
	down: "bg-market-down",
};

const activeItemToneClasses: Record<SegmentedControlTone, string> = {
	neutral: "data-active:text-fg data-active:font-medium",
	up: "data-active:text-background data-active:font-semibold",
	down: "data-active:text-background data-active:font-semibold",
};

const segmentedControlsVariants = cva(["inline-flex items-center", "bg-control rounded-8 p-0.5"], {
	variants: {
		fullWidth: {
			true: "w-full",
		},
	},
	defaultVariants: {
		fullWidth: false,
	},
});

const segmentedControlItemVariants = cva(
	[
		"relative inline-flex items-center justify-center",
		"rounded-6 font-normal text-fg-muted",
		"cursor-pointer select-none whitespace-nowrap",
		"transition-colors duration-150 motion-reduce:transition-none",
		"hover:text-fg",
		"focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-stroke-focus",
		"data-disabled:text-fg-disabled data-disabled:cursor-not-allowed",
	],
	{
		variants: {
			size: {
				xxs: "h-5 px-2 text-xs gap-1",
				xs: "h-6 px-2 text-xs gap-1",
				sm: "h-7 max-md:h-9 px-3 text-xs gap-1",
				md: "h-8 px-3 text-xs gap-1",
				lg: "h-9 px-4 text-sm gap-1.5",
			},
		},
		defaultVariants: {
			size: "sm",
		},
	},
);

interface SegmentedControlsProps
	extends Omit<React.HTMLAttributes<HTMLDivElement>, "defaultValue" | "onChange" | "children" | "className">,
		VariantProps<typeof segmentedControlsVariants> {
	value?: string;
	defaultValue?: string;
	onValueChange?: (value: string) => void;
	size?: SegmentedControlSize;
	tone?: SegmentedControlTone;
	disabled?: boolean;
	className?: string;
	indicatorClassName?: string;
	children: React.ReactNode;
}

const SegmentedControls = React.forwardRef<HTMLDivElement, SegmentedControlsProps>(
	(
		{
			className,
			indicatorClassName,
			value,
			defaultValue,
			onValueChange,
			size: sizeProp,
			tone = "neutral",
			fullWidth,
			disabled = false,
			children,
			...props
		},
		ref,
	) => {
		const size = (sizeProp ?? DEFAULT_SIZE) as SegmentedControlSize;

		return (
			<SegmentedControlsContext.Provider value={{ size, fullWidth: !!fullWidth, disabled, tone }}>
				<Tabs.Root value={value} defaultValue={defaultValue} onValueChange={onValueChange}>
					<Tabs.List
						ref={ref}
						className={cn("relative overflow-hidden", segmentedControlsVariants({ fullWidth, className }))}
						{...props}
					>
						<Tabs.Indicator
							className={cn(
								"absolute inset-y-0.5 rounded-6 transition-[left,width,background-color] duration-200 ease-in-out motion-reduce:transition-none",
								indicatorToneClasses[tone],
								indicatorClassName,
							)}
							style={{
								left: "var(--active-tab-left)",
								width: "var(--active-tab-width)",
							}}
						/>
						{children}
					</Tabs.List>
				</Tabs.Root>
			</SegmentedControlsContext.Provider>
		);
	},
);
SegmentedControls.displayName = "SegmentedControls";

interface SegmentedControlItemProps extends React.ComponentPropsWithoutRef<typeof Tabs.Tab> {
	icon?: React.ReactNode;
}

const SegmentedControlItem = React.forwardRef<HTMLButtonElement, SegmentedControlItemProps>(
	({ className, icon, disabled: itemDisabled, children, ...props }, ref) => {
		const { size, fullWidth, disabled: groupDisabled, tone } = React.useContext(SegmentedControlsContext);

		return (
			<Tabs.Tab
				ref={ref}
				disabled={groupDisabled || itemDisabled}
				className={cn(
					segmentedControlItemVariants({ size }),
					activeItemToneClasses[tone],
					fullWidth && "flex-1",
					className,
				)}
				{...props}
			>
				{icon}
				<span className="inline-grid">
					<span
						aria-hidden="true"
						className="invisible col-start-1 row-start-1 inline-flex items-center gap-1 font-semibold"
					>
						{children}
					</span>
					<span className="col-start-1 row-start-1 inline-flex items-center justify-center gap-1">{children}</span>
				</span>
			</Tabs.Tab>
		);
	},
);
SegmentedControlItem.displayName = "SegmentedControlItem";

export { SegmentedControls, SegmentedControlItem, segmentedControlsVariants, segmentedControlItemVariants };
export type { SegmentedControlsProps, SegmentedControlItemProps, SegmentedControlTone };
