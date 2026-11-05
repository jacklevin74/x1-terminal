import type * as React from "react";
import { cn } from "@/lib/cn";

interface Props {
	open: boolean;
	children: React.ReactNode;
	className?: string;
	contentClassName?: string;
}

export function Collapse({ open, children, className, contentClassName }: Props) {
	return (
		<div
			data-slot="collapse"
			data-state={open ? "open" : "closed"}
			inert={!open}
			aria-hidden={!open}
			className={cn(
				"grid min-w-0 transition-[grid-template-rows,opacity,margin] duration-200 ease-out motion-reduce:transition-none",
				open ? "-m-1 grid-rows-[1fr] opacity-100" : "-mx-1 grid-rows-[0fr] opacity-0",
				className,
			)}
		>
			<div className="min-h-0 min-w-0 overflow-hidden">
				<div className={cn("min-w-0 p-1", contentClassName)}>{children}</div>
			</div>
		</div>
	);
}
