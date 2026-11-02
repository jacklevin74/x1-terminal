import * as ResizablePrimitive from "react-resizable-panels";
import { cn } from "@/lib/cn";

function ResizablePanelGroup({ className, ...props }: ResizablePrimitive.GroupProps) {
	return (
		<ResizablePrimitive.Group
			data-slot="resizable-panel-group"
			className={cn("flex h-full w-full aria-[orientation=vertical]:flex-col", className)}
			{...props}
		/>
	);
}

function ResizablePanel({ ...props }: ResizablePrimitive.PanelProps) {
	return <ResizablePrimitive.Panel data-slot="resizable-panel" {...props} />;
}

function ResizableHandle({
	withHandle,
	className,
	...props
}: ResizablePrimitive.SeparatorProps & {
	withHandle?: boolean;
}) {
	return (
		<ResizablePrimitive.Separator
			data-slot="resizable-handle"
			className={cn(
				"group relative flex w-1 shrink-0 items-center justify-center rounded-full bg-transparent outline-none transition-colors duration-150",
				"after:absolute after:inset-y-0 after:left-1/2 after:w-2 after:-translate-x-1/2",
				"aria-[orientation=horizontal]:h-1 aria-[orientation=horizontal]:w-full",
				"aria-[orientation=horizontal]:after:inset-x-0 aria-[orientation=horizontal]:after:inset-y-auto aria-[orientation=horizontal]:after:left-0 aria-[orientation=horizontal]:after:top-1/2 aria-[orientation=horizontal]:after:h-2 aria-[orientation=horizontal]:after:w-full aria-[orientation=horizontal]:after:translate-x-0 aria-[orientation=horizontal]:after:-translate-y-1/2",
				"data-[separator=hover]:bg-control-hover data-[separator=active]:bg-control-hover focus-visible:bg-brand",
				className,
			)}
			{...props}
		>
			{withHandle && (
				<div className="z-10 hidden h-6 w-0.5 shrink-0 rounded-full bg-fg-muted group-data-[separator=active]:block group-data-[separator=hover]:block group-aria-[orientation=horizontal]:h-0.5 group-aria-[orientation=horizontal]:w-6" />
			)}
		</ResizablePrimitive.Separator>
	);
}

export { ResizableHandle, ResizablePanel, ResizablePanelGroup };
