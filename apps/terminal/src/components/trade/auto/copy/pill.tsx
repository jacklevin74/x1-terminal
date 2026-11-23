import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

interface Props {
	on: boolean;
	onClick: () => void;
	children: ReactNode;
}

export function Pill({ on, onClick, children }: Props) {
	return (
		<button
			type="button"
			onClick={onClick}
			className={cn(
				"h-7 shrink-0 rounded-full px-2.5 text-xs whitespace-nowrap transition-colors",
				on ? "bg-fill text-fg-inverse" : "bg-control text-fg-secondary hover:bg-control-hover",
			)}
		>
			{children}
		</button>
	);
}
