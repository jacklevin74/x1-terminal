import { cn } from "@/lib/cn";
import type { Outcome } from "@/lib/portfolio/model";

interface Props {
	outcomes: Outcome[];
	className?: string;
}

export function V4({ outcomes, className }: Props) {
	const max = Math.max(...outcomes.map((o) => Math.abs(o.pnl)), 1);
	return (
		<div className={cn("flex h-4 items-center gap-[3px]", className)}>
			{outcomes.map((o) => {
				const h = Math.max(2, Math.round((Math.abs(o.pnl) / max) * 16));
				return (
					<span key={o.id} className="flex h-full min-w-0 flex-1 flex-col justify-center">
						<span
							title={o.win ? "Win" : "Loss"}
							className={cn("w-full rounded-[1px]", o.win ? "bg-market-up" : "bg-market-down")}
							style={{ height: h }}
						/>
					</span>
				);
			})}
		</div>
	);
}
