import { Modal, ModalDescription, ModalPopup, ModalTitle } from "@hypeterminal/ui";
import { MagnifyingGlassIcon } from "@phosphor-icons/react";
import { Command as CommandPrimitive } from "cmdk";
import type * as React from "react";
import { cn } from "@/lib/cn";

const COMMAND_LIST_MAX_HEIGHT = "max-h-80";

function Command({ className, ...props }: React.ComponentProps<typeof CommandPrimitive>) {
	return (
		<CommandPrimitive
			data-slot="command"
			className={cn("bg-overlay text-fg flex h-full w-full flex-col overflow-hidden rounded-12", className)}
			{...props}
		/>
	);
}

function CommandDialog({
	title = "Command Palette",
	description = "Search for a command to run...",
	children,
	className,
	showCloseButton = true,
	shouldFilter,
	...props
}: React.ComponentProps<typeof Modal> & {
	title?: string;
	description?: string;
	children?: React.ReactNode;
	className?: string;
	showCloseButton?: boolean;
	shouldFilter?: boolean;
}) {
	return (
		<Modal {...props}>
			<ModalPopup className={cn("overflow-hidden p-0", className)} showClose={showCloseButton} size="md">
				<div className="sr-only">
					<ModalTitle>{title}</ModalTitle>
					<ModalDescription>{description}</ModalDescription>
				</div>
				<Command
					shouldFilter={shouldFilter}
					className={cn(
						"**:[[cmdk-group-heading]]:text-fg-muted **:[[cmdk-group-heading]]:px-2 **:[[cmdk-group]]:px-1 [&_[cmdk-group]:not([hidden])_~[cmdk-group]]:pt-0",
					)}
				>
					{children}
				</Command>
			</ModalPopup>
		</Modal>
	);
}

function CommandInput({ className, ...props }: React.ComponentProps<typeof CommandPrimitive.Input>) {
	return (
		<div
			data-slot="command-input-wrapper"
			className="flex h-9 max-md:h-10 items-center gap-2 border-b border-stroke-weak px-3"
		>
			<MagnifyingGlassIcon className="size-4 shrink-0 text-fg-muted" />
			<CommandPrimitive.Input
				data-slot="command-input"
				className={cn(
					"placeholder:text-fg-muted flex h-full w-full bg-transparent text-xs max-md:text-base text-fg outline-hidden disabled:cursor-not-allowed disabled:text-fg-disabled",
					className,
				)}
				{...props}
			/>
		</div>
	);
}

function CommandList({ className, ...props }: React.ComponentProps<typeof CommandPrimitive.List>) {
	return (
		<CommandPrimitive.List
			data-slot="command-list"
			className={cn(COMMAND_LIST_MAX_HEIGHT, "scroll-py-1 overflow-x-hidden overflow-y-auto", className)}
			{...props}
		/>
	);
}

function CommandEmpty({ ...props }: React.ComponentProps<typeof CommandPrimitive.Empty>) {
	return (
		<CommandPrimitive.Empty data-slot="command-empty" className="py-6 text-center text-xs text-fg-muted" {...props} />
	);
}

function CommandGroup({ className, ...props }: React.ComponentProps<typeof CommandPrimitive.Group>) {
	return (
		<CommandPrimitive.Group
			data-slot="command-group"
			className={cn(
				"text-fg **:[[cmdk-group-heading]]:text-fg-muted overflow-hidden p-1 **:[[cmdk-group-heading]]:flex **:[[cmdk-group-heading]]:h-6 **:[[cmdk-group-heading]]:items-center **:[[cmdk-group-heading]]:px-2 **:[[cmdk-group-heading]]:text-2xs **:[[cmdk-group-heading]]:font-normal **:[[cmdk-group-heading]]:uppercase **:[[cmdk-group-heading]]:tracking-micro",
				className,
			)}
			{...props}
		/>
	);
}

function CommandSeparator({ className, ...props }: React.ComponentProps<typeof CommandPrimitive.Separator>) {
	return (
		<CommandPrimitive.Separator
			data-slot="command-separator"
			className={cn("bg-stroke-weak -mx-1 h-px", className)}
			{...props}
		/>
	);
}

function CommandItem({ className, ...props }: React.ComponentProps<typeof CommandPrimitive.Item>) {
	return (
		<CommandPrimitive.Item
			data-slot="command-item"
			className={cn(
				"data-[selected=true]:bg-control data-[selected=true]:text-fg [&_svg:not([class*='text-'])]:text-fg-muted relative flex h-7 max-md:h-8 cursor-default items-center gap-2 rounded-8 px-2 text-xs text-fg outline-hidden select-none data-[disabled=true]:pointer-events-none data-[disabled=true]:text-fg-disabled [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
				className,
			)}
			{...props}
		/>
	);
}

function CommandShortcut({ className, ...props }: React.ComponentProps<"span">) {
	return <span data-slot="command-shortcut" className={cn("text-fg-muted ml-auto text-xs", className)} {...props} />;
}

export {
	Command,
	CommandDialog,
	CommandInput,
	CommandList,
	CommandEmpty,
	CommandGroup,
	CommandItem,
	CommandShortcut,
	CommandSeparator,
};
