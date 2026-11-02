import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

interface Props {
	children: ReactNode;
	variant?: "error";
	action?: ReactNode;
}

export function Placeholder({ children, variant, action }: Props) {
	return (
		<div className="flex h-full w-full flex-col items-center justify-center gap-3 px-3 py-6 text-center text-xs">
			<div
				className={cn("flex flex-col items-center gap-1", variant === "error" ? "text-market-down" : "text-fg-muted")}
			>
				{children}
			</div>
			{action}
		</div>
	);
}
