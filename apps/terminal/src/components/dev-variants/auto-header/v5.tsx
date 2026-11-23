import { cn } from "@/lib/cn";
import { type HeaderProps, isOn, LABEL } from "./data";

export default function V5({ phase, onToggle }: HeaderProps) {
	const on = isOn(phase);
	const locked = phase === "closing";
	return (
		<div className="flex shrink-0 items-center gap-2.5">
			<span className="flex flex-col items-start gap-1 whitespace-nowrap">
				<span className="text-2xs uppercase tracking-micro text-fg-muted">Auto</span>
				<span
					className={cn("text-xs", on ? "text-fg" : "text-fg-secondary", phase === "stopped" && "text-market-down")}
				>
					{LABEL[phase]}
				</span>
			</span>
			<button
				type="button"
				role="switch"
				aria-checked={on}
				aria-label="Auto Trader"
				disabled={locked}
				onClick={onToggle}
				className={cn(
					"relative h-5 w-9 shrink-0 rounded-full transition-colors disabled:opacity-50",
					on ? "bg-market-up" : "bg-control-hover",
				)}
			>
				<span
					className={cn(
						"absolute top-0.5 left-0.5 size-4 rounded-full bg-white shadow-sm transition-transform",
						on && "translate-x-4",
					)}
				/>
			</button>
		</div>
	);
}
