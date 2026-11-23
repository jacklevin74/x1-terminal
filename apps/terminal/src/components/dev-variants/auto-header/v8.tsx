import { cn } from "@/lib/cn";
import { type HeaderProps, isOn } from "./data";

export default function V8({ phase }: HeaderProps) {
	const on = isOn(phase);
	return (
		<div className="flex h-7 shrink-0 items-center rounded-8 bg-control p-0.5 text-xs">
			<button type="button" className="h-full rounded-6 px-2.5 text-fg-muted hover:text-fg">
				Manual
			</button>
			<button type="button" className="flex h-full items-center gap-1.5 rounded-6 bg-control-hover px-2.5 text-fg">
				Auto
				<span
					className={cn(
						"size-1.5 rounded-full",
						on && "bg-market-up",
						phase === "paused" && "bg-fg-disabled",
						phase === "closing" && "bg-fg-secondary",
						phase === "stopped" && "bg-market-down",
					)}
				/>
			</button>
		</div>
	);
}
