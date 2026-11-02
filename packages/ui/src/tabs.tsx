import { Tabs } from "@base-ui/react/tabs";
import { cva } from "class-variance-authority";
import * as React from "react";
import { DEFAULT_SIZE } from "./config";
import { cn } from "./utils";

type TabsSize = "xxs" | "xs" | "sm" | "md" | "lg";
type TabsVariant = "underline" | "pills";

const TabsContext = React.createContext<{
	size: TabsSize;
	variant: TabsVariant;
	fullWidth: boolean;
	disabled: boolean;
}>({
	size: "sm",
	variant: "pills",
	fullWidth: false,
	disabled: false,
});

interface TabsRootProps extends React.ComponentPropsWithoutRef<typeof Tabs.Root> {
	size?: TabsSize;
	variant?: TabsVariant;
	fullWidth?: boolean;
	disabled?: boolean;
}

const TabsRoot = React.forwardRef<HTMLDivElement, TabsRootProps>(
	({ size: sizeProp, variant = "pills", fullWidth = false, disabled = false, children, className, ...props }, ref) => {
		const size = (sizeProp ?? DEFAULT_SIZE) as TabsSize;

		return (
			<TabsContext.Provider value={{ size, variant, fullWidth, disabled }}>
				<Tabs.Root ref={ref} className={className} {...props}>
					{children}
				</Tabs.Root>
			</TabsContext.Provider>
		);
	},
);
TabsRoot.displayName = "Tabs";

const tabsListVariants = cva("relative flex items-center", {
	variants: {
		variant: {
			underline: "border-b border-stroke-weak",
			pills: "h-9 max-md:h-10 gap-1 border-b border-stroke-weak",
		},
	},
	defaultVariants: {
		variant: "pills",
	},
});

interface TabsListProps extends React.ComponentPropsWithoutRef<typeof Tabs.List> {
	hideIndicator?: boolean;
}

const TabsList = React.forwardRef<HTMLDivElement, TabsListProps>(
	({ className, children, hideIndicator, ...props }, ref) => {
		const { variant, fullWidth } = React.useContext(TabsContext);

		return (
			<Tabs.List ref={ref} className={cn(tabsListVariants({ variant }), fullWidth && "w-full", className)} {...props}>
				{!hideIndicator && variant === "underline" && (
					<Tabs.Indicator
						className="absolute -bottom-px h-0.5 bg-fg transition-[left,width] duration-200 ease-in-out motion-reduce:transition-none"
						style={{
							left: "var(--active-tab-left)",
							width: "var(--active-tab-width)",
						}}
					/>
				)}
				{children}
			</Tabs.List>
		);
	},
);
TabsList.displayName = "TabsList";

const tabsTriggerVariants = cva(
	[
		"inline-flex items-center justify-center",
		"font-normal text-fg-muted",
		"cursor-pointer select-none whitespace-nowrap",
		"transition-colors duration-150 motion-reduce:transition-none",
		"data-active:text-fg",
		"hover:text-fg",
		"focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-stroke-focus",
		"data-disabled:text-fg-disabled data-disabled:cursor-not-allowed",
	],
	{
		variants: {
			variant: {
				underline: "bg-transparent data-active:font-medium",
				pills: "relative rounded-8 bg-transparent data-active:bg-control data-active:font-medium",
			},
			size: {
				xxs: "",
				xs: "",
				sm: "",
				md: "",
				lg: "",
			},
		},
		compoundVariants: [
			{
				variant: "underline",
				size: "xxs",
				className: "py-1 px-1.5 text-xs gap-1",
			},
			{
				variant: "underline",
				size: "xs",
				className: "py-1.5 px-2 text-xs gap-1",
			},
			{
				variant: "underline",
				size: "sm",
				className: "py-2 px-3 text-xs gap-1.5",
			},
			{
				variant: "underline",
				size: "md",
				className: "p-3 text-sm gap-2",
			},
			{
				variant: "underline",
				size: "lg",
				className: "py-3 px-4 text-base gap-2",
			},
			{
				variant: "pills",
				size: ["xxs", "xs", "sm", "md", "lg"],
				className: "h-7 max-md:h-8 px-3 text-xs gap-1",
			},
		],
		defaultVariants: {
			variant: "pills",
			size: "sm",
		},
	},
);

interface TabsTriggerProps extends React.ComponentPropsWithoutRef<typeof Tabs.Tab> {
	icon?: React.ReactNode;
}

const TabsTrigger = React.forwardRef<HTMLButtonElement, TabsTriggerProps>(
	({ className, icon, disabled: itemDisabled, children, ...props }, ref) => {
		const { size, variant, fullWidth, disabled: groupDisabled } = React.useContext(TabsContext);

		return (
			<Tabs.Tab
				ref={ref}
				disabled={groupDisabled || itemDisabled}
				className={cn(tabsTriggerVariants({ variant, size }), fullWidth && "flex-1", className)}
				{...props}
			>
				{icon}
				<span className="inline-grid">
					<span
						aria-hidden="true"
						className="invisible col-start-1 row-start-1 inline-flex items-center gap-1 font-medium"
					>
						{children}
					</span>
					<span className="col-start-1 row-start-1 inline-flex items-center justify-center gap-1">{children}</span>
				</span>
			</Tabs.Tab>
		);
	},
);
TabsTrigger.displayName = "TabsTrigger";

interface TabsContentProps extends React.ComponentPropsWithoutRef<typeof Tabs.Panel> {}

const TabsContent = React.forwardRef<HTMLDivElement, TabsContentProps>(({ className, ...props }, ref) => (
	<Tabs.Panel ref={ref} className={cn("pt-2 [&[hidden]]:!hidden data-[ending-style]:!hidden", className)} {...props} />
));
TabsContent.displayName = "TabsContent";

export { TabsRoot as Tabs, TabsList, TabsTrigger, TabsContent, tabsListVariants, tabsTriggerVariants };
export type { TabsRootProps as TabsProps, TabsListProps, TabsTriggerProps, TabsContentProps, TabsVariant };
