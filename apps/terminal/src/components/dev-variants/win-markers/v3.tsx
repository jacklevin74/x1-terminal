import { cn } from "@/lib/cn";
import type { Outcome } from "@/lib/portfolio/model";

interface Props {
	outcomes: Outcome[];
	className?: string;
}

export function V3({ outcomes, className }: Props) {
	return (
		<div className={cn("flex items-center gap-[3px]", className)}>
			{outcomes.map((o) => (
				<span
					key={o.id}
					title={o.win ? "Win" : "Loss"}
					className={cn(
						"size-1.5 flex-none rounded-full",
						o.win ? "bg-market-up" : "border border-market-down bg-transparent",
					)}
				/>
			))}
		</div>
	);
}
