import { Menu } from "@base-ui/react/menu";
import { CaretDownIcon, CheckIcon } from "@phosphor-icons/react";
import { cva, type VariantProps } from "class-variance-authority";
import * as React from "react";
import { DEFAULT_SIZE } from "./config";
import { cn } from "./utils";

const menuPopupClass = [
	"max-h-64 min-w-40 overflow-y-auto rounded-12 bg-overlay p-1 text-fg shadow-menu outline-none",
	"origin-(--transform-origin) transition-[opacity,scale] duration-150 ease-out motion-reduce:transition-none",
	"data-starting-style:opacity-0 data-starting-style:scale-[0.97] data-ending-style:opacity-0 data-ending-style:scale-[0.97]",
].join(" ");

const menuItemClass = [
	"flex h-7 max-md:h-8 items-center gap-2 rounded-8 px-2 text-xs font-normal text-fg tabular-nums",
	"cursor-pointer select-none outline-none",
	"transition-colors duration-150 motion-reduce:transition-none",
	"data-highlighted:bg-control",
	"data-disabled:text-fg-disabled data-disabled:cursor-not-allowed",
].join(" ");

const menuSeparatorClass = "my-1 h-px bg-stroke-weak";
const menuGroupLabelClass =
	"flex h-6 items-center px-2 text-2xs font-normal uppercase tracking-micro text-fg-muted select-none";

const dropdownTriggerVariants = cva(
	[
		"inline-flex items-center justify-between gap-2 cursor-pointer select-none",
		"rounded-8 bg-control text-fg font-normal",
		"transition-colors duration-150 motion-reduce:transition-none",
		"hover:bg-control-hover data-popup-open:bg-control-hover",
		"focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-stroke-focus",
		"data-disabled:text-fg-disabled data-disabled:cursor-not-allowed",
	],
	{
		variants: {
			size: {
				xxs: "h-6 px-2 text-xs gap-1",
				xs: "h-7 px-2 text-xs gap-1",
				sm: "h-8 max-md:h-10 px-3 text-xs gap-2",
				md: "h-9 px-3 text-xs gap-2",
				lg: "h-10 px-3 text-sm gap-2",
			},
		},
		defaultVariants: {
			size: "sm",
		},
	},
);

const dropdownMinimalTriggerVariants = cva(
	[
		"group inline-flex items-center justify-center cursor-pointer select-none rounded-8",
		"border-0 bg-transparent shadow-none appearance-none font-normal",
		"transition-colors duration-150 motion-reduce:transition-none hover:text-fg data-[popup-open]:text-fg",
		"focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-stroke-focus",
		"data-disabled:text-fg-disabled data-disabled:cursor-not-allowed",
	],
	{
		variants: {
			size: {
				xxs: "h-5 gap-1 px-1 text-xs",
				xs: "h-6 gap-1 px-1 text-xs",
				sm: "h-6 gap-1 px-1 text-xs",
				md: "h-7 gap-1 px-1.5 text-xs",
				lg: "h-8 gap-1 px-2 text-sm",
			},
		},
		defaultVariants: {
			size: "sm",
		},
	},
);

const dropdownItemVariants = cva(menuItemClass, {
	variants: {
		size: {
			xxs: "",
			xs: "",
			sm: "",
			md: "",
			lg: "h-8 text-sm",
		},
		intent: {
			neutral: "text-fg",
			danger: "text-error",
		},
	},
	defaultVariants: {
		size: "sm",
		intent: "neutral",
	},
});

interface DropdownItem {
	label: string;
	icon?: React.ReactNode;
	disabled?: boolean;
	danger?: boolean;
	active?: boolean;
	closeOnClick?: boolean;
	onSelect?: () => void;
}

interface DropdownGroup {
	label?: string;
	items: DropdownItem[];
}

interface DropdownBaseProps extends VariantProps<typeof dropdownTriggerVariants> {
	trigger?: React.ReactNode;
	items?: DropdownItem[];
	groups?: DropdownGroup[];
	disabled?: boolean;
	className?: string;
	align?: "start" | "center" | "end";
	triggerClassName?: string;
	popupClassName?: string;
}

type DropdownProps =
	| (DropdownBaseProps & { triggerVariant?: "default"; triggerAriaLabel?: string })
	| (DropdownBaseProps & { triggerVariant: "minimal"; triggerAriaLabel: string });

const Dropdown = React.forwardRef<HTMLDivElement, DropdownProps>(
	(
		{
			className,
			size: sizeProp,
			trigger,
			items,
			groups,
			disabled = false,
			align = "start",
			triggerVariant = "default",
			triggerAriaLabel,
			triggerClassName,
			popupClassName,
		},
		ref,
	) => {
		const size = sizeProp ?? DEFAULT_SIZE;
		const itemSize = size;
		const isMinimalTrigger = triggerVariant === "minimal";
		const caretSize = 12;

		const renderItem = (item: DropdownItem) => (
			<Menu.Item
				key={item.label}
				disabled={item.disabled}
				closeOnClick={item.closeOnClick}
				onClick={item.onSelect}
				className={cn(
					dropdownItemVariants({
						size: itemSize,
						intent: item.danger ? "danger" : "neutral",
					}),
					"justify-between",
					item.active && "font-medium",
				)}
			>
				<span className="flex items-center gap-2">
					{item.icon && (
						<span
							className={cn(
								"shrink-0",
								item.danger ? "text-error" : "text-fg-muted",
								item.disabled && "text-fg-disabled",
							)}
						>
							{item.icon}
						</span>
					)}
					{item.label}
				</span>
				{item.active && <CheckIcon size={12} weight="bold" className="ml-2 shrink-0 text-fg" />}
			</Menu.Item>
		);

		return (
			<div className={className} ref={ref}>
				<Menu.Root disabled={disabled}>
					<Menu.Trigger
						aria-label={triggerAriaLabel}
						className={cn(
							isMinimalTrigger ? dropdownMinimalTriggerVariants({ size }) : dropdownTriggerVariants({ size }),
							!isMinimalTrigger && "text-fg",
							triggerClassName,
						)}
					>
						{trigger ?? "Menu"}
						<CaretDownIcon
							size={caretSize}
							weight="bold"
							className="shrink-0 text-fg-muted transition-transform duration-150 motion-reduce:transition-none [[data-popup-open]>&]:rotate-180"
						/>
					</Menu.Trigger>

					<Menu.Portal>
						<Menu.Positioner sideOffset={4} align={align} className="z-[var(--z-dropdown)]">
							<Menu.Popup className={cn(menuPopupClass, popupClassName)}>
								{items?.map(renderItem)}

								{groups?.map((group) => (
									<React.Fragment key={group.label ?? group.items.map((item) => item.label).join("|")}>
										{group !== groups[0] && <Menu.Separator className={menuSeparatorClass} />}
										<Menu.Group>
											{group.label && <Menu.GroupLabel className={menuGroupLabelClass}>{group.label}</Menu.GroupLabel>}
											{group.items.map(renderItem)}
										</Menu.Group>
									</React.Fragment>
								))}
							</Menu.Popup>
						</Menu.Positioner>
					</Menu.Portal>
				</Menu.Root>
			</div>
		);
	},
);
Dropdown.displayName = "Dropdown";

export {
	Dropdown,
	dropdownMinimalTriggerVariants,
	dropdownTriggerVariants,
	dropdownItemVariants,
	menuPopupClass,
	menuItemClass,
	menuSeparatorClass,
	menuGroupLabelClass,
};
export type { DropdownProps, DropdownItem, DropdownGroup };
