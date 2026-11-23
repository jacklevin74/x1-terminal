import { cn } from "@/lib/cn";
import type { Outcome } from "@/lib/portfolio/model";

interface Props {
	outcomes: Outcome[];
	className?: string;
}

export function V7({ outcomes, className }: Props) {
	return (
		<div className={cn("flex items-center gap-[2px]", className)}>
			{outcomes.map((o) => (
				<span
					key={o.id}
					title={o.win ? "Win" : "Loss"}
					className={cn("size-1.5 flex-none rounded-[1px]", o.win ? "bg-market-up" : "bg-market-down")}
				/>
			))}
		</div>
	);
}
