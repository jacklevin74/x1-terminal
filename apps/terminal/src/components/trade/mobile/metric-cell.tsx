import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

interface Props {
	label: ReactNode;
	value: ReactNode;
	valueClass?: string;
	align?: "start" | "end";
}

export function MetricCell({ label, value, valueClass, align = "start" }: Props) {
	return (
		<div className={cn("flex min-w-0 flex-col gap-1", align === "end" && "items-end text-right")}>
			<div className="truncate text-2xs uppercase tracking-micro text-fg-muted">{label}</div>
			<div className={cn("min-w-0 text-xs tabular-nums text-fg", valueClass)}>{value}</div>
		</div>
	);
}
