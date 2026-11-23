import { cn } from "@/lib/cn";
import type { Outcome } from "@/lib/portfolio/model";

interface Props {
	outcomes: Outcome[];
	className?: string;
}

export function V1({ outcomes, className }: Props) {
	return (
		<div className={cn("flex h-3 items-center gap-[3px]", className)}>
			{outcomes.map((o) => (
				<span
					key={o.id}
					title={o.win ? "Win" : "Loss"}
					className={cn("h-full w-0.5 flex-none rounded-full", o.win ? "bg-market-up" : "bg-fg-disabled")}
				/>
			))}
		</div>
	);
}
