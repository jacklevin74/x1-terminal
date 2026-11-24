import { cn } from "@/lib/cn";
import { ROUND_NUMBER } from "./data";

interface Props {
	dates: { start: string; end: string };
	className?: string;
}

export function RoundStatus({ dates, className }: Props) {
	return (
		<div className={cn("flex items-center gap-3 text-xs tabular-nums", className)}>
			<style>{`
				@keyframes rlb2-ping { 0% { transform: scale(1); opacity: .5 } 70%,100% { transform: scale(2.8); opacity: 0 } }
				.rlb2-ring { animation: rlb2-ping 2s cubic-bezier(0,0,.2,1) infinite }
				@media (prefers-reduced-motion: reduce) { .rlb2-ring { animation: none; opacity: 0 } }
			`}</style>
			<span className="flex h-5 items-center gap-1.5 rounded-4 bg-control pr-2 pl-1.5 text-fg">
				<span className="relative flex size-1.5">
					<span className="rlb2-ring absolute inset-0 rounded-full bg-fg" />
					<span className="relative size-1.5 rounded-full bg-fg" />
				</span>
				Live
			</span>
			<span className="text-fg">Round {ROUND_NUMBER}</span>
			<span className="text-fg-muted">
				{dates.start} to {dates.end}
			</span>
		</div>
	);
}
