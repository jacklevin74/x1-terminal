import { cn } from "@/lib/cn";
import type { Outcome } from "@/lib/portfolio/model";

interface Props {
	outcomes: Outcome[];
	className?: string;
}

export function V5({ outcomes, className }: Props) {
	const wins = outcomes.filter((o) => o.win).length;
	const share = outcomes.length ? wins / outcomes.length : 0;
	return (
		<div className={cn("flex h-1.5 gap-0.5", className)}>
			<span className="h-full rounded-l-full bg-market-up" style={{ width: `${share * 100}%` }} />
			<span className="h-full flex-1 rounded-r-full bg-market-down" />
		</div>
	);
}
