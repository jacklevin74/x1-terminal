import { cn } from "@/lib/cn";
import type { Outcome } from "@/lib/portfolio/model";

interface Props {
	outcomes: Outcome[];
	className?: string;
}

export function V2({ outcomes, className }: Props) {
	return (
		<div className={cn("flex h-1.5 overflow-hidden rounded-full", className)}>
			{outcomes.map((o) => (
				<span
					key={o.id}
					title={o.win ? "Win" : "Loss"}
					className={cn("h-full min-w-0 flex-1", o.win ? "bg-market-up" : "bg-market-down")}
				/>
			))}
		</div>
	);
}
