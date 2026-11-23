import { cn } from "@/lib/cn";
import { ROUND_NUMBER } from "./data";

interface Props {
	dates: { start: string; end: string };
	className?: string;
}

export function RoundStatus({ dates, className }: Props) {
	return (
		<div className={cn("flex items-center gap-3 text-xs tabular-nums", className)}>
			<span className="flex items-center gap-1.5 text-fg">
				<span className="size-1.5 rounded-full bg-market-up" />
				Round {ROUND_NUMBER} live
			</span>
			<span className="text-fg-muted">
				{dates.start} to {dates.end}
			</span>
		</div>
	);
}
