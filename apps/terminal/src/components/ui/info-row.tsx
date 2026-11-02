import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

interface InfoRowProps {
	label: ReactNode;
	value: ReactNode;
	valueClassName?: string;
	labelClassName?: string;
	className?: string;
}

export function InfoRow({ label, value, valueClassName, labelClassName, className }: InfoRowProps) {
	return (
		<div className={cn("flex min-h-6 items-center justify-between gap-3 text-xs", className)} data-slot="info-row">
			<span className={cn("min-w-0 text-fg-muted", labelClassName)} data-slot="info-row-label">
				{label}
			</span>
			<span className={cn("min-w-0 text-right text-fg tabular-nums", valueClassName)} data-slot="info-row-value">
				{value}
			</span>
		</div>
	);
}

interface InfoRowGroupProps {
	children: ReactNode;
	className?: string;
}

export function InfoRowGroup({ children, className }: InfoRowGroupProps) {
	return (
		<div className={cn("flex flex-col text-xs", className)} data-slot="info-row-group">
			{children}
		</div>
	);
}
