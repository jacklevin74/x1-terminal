import { Tooltip as BaseTooltip } from "@base-ui/react/tooltip";
import { cva, type VariantProps } from "class-variance-authority";
import * as React from "react";
import { cn } from "./utils";

const tooltipPopupVariants = cva([
	"bg-overlay text-fg",
	"text-xs font-normal",
	"max-w-xs rounded-8 px-2 py-1.5",
	"shadow-menu",
	"origin-(--transform-origin)",
	"transition-[opacity,scale] duration-150 motion-reduce:transition-none",
	"data-starting-style:opacity-0 data-starting-style:scale-[0.97]",
	"data-ending-style:opacity-0 data-ending-style:scale-[0.97]",
	"data-instant:duration-0",
]);

const tooltipArrowVariants = cva([
	"size-2 rotate-45 bg-overlay",
	"data-[side=top]:-bottom-1",
	"data-[side=bottom]:-top-1",
	"data-[side=left]:-right-1",
	"data-[side=right]:-left-1",
]);

const tooltipUnderlineClass =
	"cursor-help underline decoration-dashed decoration-fg-muted decoration-1 underline-offset-4";

interface TooltipProps extends VariantProps<typeof tooltipPopupVariants> {
	children: React.ReactElement;
	content: React.ReactNode;
	side?: "top" | "bottom" | "left" | "right";
	align?: "start" | "center" | "end";
	sideOffset?: number;
	open?: boolean;
	defaultOpen?: boolean;
	onOpenChange?: (open: boolean) => void;
	delay?: number;
	closeDelay?: number;
	arrow?: boolean;
	underline?: boolean;
	className?: string;
}

const Tooltip = React.forwardRef<HTMLDivElement, TooltipProps>(
	(
		{
			children,
			content,
			side = "top",
			align = "center",
			sideOffset = 8,
			open,
			defaultOpen,
			onOpenChange,
			delay = 100,
			closeDelay,
			arrow = false,
			underline = false,
			className,
		},
		ref,
	) => {
		const [internalOpen, setInternalOpen] = React.useState(defaultOpen ?? false);
		const lastPointerType = React.useRef<string | null>(null);
		const isOpen = open ?? internalOpen;

		function changeOpen(next: boolean) {
			setInternalOpen(next);
			onOpenChange?.(next);
		}

		function handleBaseOpenChange(next: boolean, details: BaseTooltip.Root.ChangeEventDetails) {
			const isTouch = lastPointerType.current === "touch";
			if (isTouch && (details.reason === "trigger-press" || details.reason === "trigger-hover")) return;
			changeOpen(next);
		}

		function rememberPointerType(event: React.PointerEvent) {
			lastPointerType.current = event.pointerType;
		}

		function toggleOnTouch() {
			if (lastPointerType.current !== "touch") return;
			changeOpen(!isOpen);
		}

		if (!content) return children;

		return (
			<BaseTooltip.Root open={isOpen} onOpenChange={handleBaseOpenChange}>
				<BaseTooltip.Trigger
					delay={delay}
					closeDelay={closeDelay}
					render={children}
					className={underline ? tooltipUnderlineClass : undefined}
					onPointerDown={rememberPointerType}
					onClick={toggleOnTouch}
				/>
				<BaseTooltip.Portal>
					<BaseTooltip.Positioner
						side={side}
						align={align}
						sideOffset={sideOffset}
						collisionPadding={8}
						className="z-[var(--z-tooltip)]"
					>
						<BaseTooltip.Popup ref={ref} className={cn(tooltipPopupVariants(), className)}>
							{content}
							{arrow && <BaseTooltip.Arrow className={cn(tooltipArrowVariants())} />}
						</BaseTooltip.Popup>
					</BaseTooltip.Positioner>
				</BaseTooltip.Portal>
			</BaseTooltip.Root>
		);
	},
);
Tooltip.displayName = "Tooltip";

const TooltipProvider = BaseTooltip.Provider;

export { Tooltip, TooltipProvider, tooltipPopupVariants, tooltipArrowVariants, tooltipUnderlineClass };
export type { TooltipProps };
