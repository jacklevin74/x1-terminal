import { cn } from "@/lib/cn";
import { type HeaderProps, isOn, LABEL } from "./data";

export default function V6({ phase, dayPnl, dayUp }: HeaderProps) {
	const live = phase === "active";
	return (
		<button
			type="button"
			className="-mx-2 flex shrink-0 flex-col items-start gap-1 whitespace-nowrap rounded-8 px-2 py-1 transition-colors hover:bg-fill-hover"
		>
			<span className="flex items-center gap-1.5 text-2xs uppercase tracking-micro text-fg-muted">
				Auto
				<span
					className={cn(
						"rounded-4 px-1 text-2xs normal-case tracking-normal",
						isOn(phase) ? "bg-control text-market-up" : "bg-control text-fg-secondary",
						phase === "stopped" && "bg-control text-market-down",
					)}
				>
					{LABEL[phase]}
				</span>
			</span>
			<span
				className={cn("text-xs tabular-nums", live ? (dayUp ? "text-market-up" : "text-market-down") : "text-fg-muted")}
			>
				{live ? `${dayPnl} today` : "No trades today"}
			</span>
		</button>
	);
}
