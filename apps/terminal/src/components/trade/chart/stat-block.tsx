import { Tooltip, tooltipUnderlineClass } from "@hypeterminal/ui";
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

interface Props {
	label: string;
	value: ReactNode;
	valueClass?: string;
	icon?: ReactNode;
	tooltip?: ReactNode;
}

export function StatBlock({ label, value, valueClass, icon, tooltip }: Props) {
	const block = (
		<div className="flex min-w-0 shrink-0 flex-col items-start gap-1 whitespace-nowrap">
			<span
				className={cn("text-2xs font-normal uppercase tracking-micro text-fg-muted", tooltip && tooltipUnderlineClass)}
			>
				{label}
			</span>
			<span className={cn("flex min-w-0 items-center gap-1 text-xs font-normal tabular-nums text-fg", valueClass)}>
				{icon}
				{value}
			</span>
		</div>
	);

	if (!tooltip) return block;

	return (
		<Tooltip content={tooltip} side="bottom">
			{block}
		</Tooltip>
	);
}
