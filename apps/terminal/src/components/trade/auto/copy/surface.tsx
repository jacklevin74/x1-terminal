import { Modal, ModalPopup } from "@hypeterminal/ui";
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

interface Props {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	width: string;
	children: ReactNode;
}

export function Surface({ open, onOpenChange, width, children }: Props) {
	return (
		<Modal open={open} onOpenChange={onOpenChange}>
			<ModalPopup size="lg" className={cn(width, "h-[min(720px,calc(100dvh-3rem))] overflow-hidden max-md:h-[88dvh]")}>
				<span className="absolute top-2 left-1/2 hidden h-1 w-8 -translate-x-1/2 rounded-full bg-control-hover max-md:block" />
				<div className="@container flex min-h-0 flex-1 flex-col">{children}</div>
			</ModalPopup>
		</Modal>
	);
}

export function SurfaceTitle({ children }: { children: ReactNode }) {
	return <h2 className="text-base font-medium text-balance text-fg">{children}</h2>;
}
