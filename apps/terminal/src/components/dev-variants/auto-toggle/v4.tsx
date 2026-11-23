import { HandPointingIcon, RobotIcon } from "@phosphor-icons/react";
import { cn } from "@/lib/cn";
import type { ToggleProps } from "./data";

export default function V4({ mode, phase, onMode }: ToggleProps) {
	const cards = [
		{ m: "manual" as const, Icon: HandPointingIcon, title: "Manual", line: "You place orders" },
		{
			m: "auto" as const,
			Icon: RobotIcon,
			title: "Auto",
			line: phase === "active" ? "Live · next cycle 3:12" : "Paused",
		},
	];
	return (
		<div className="grid grid-cols-2 gap-2 px-3 pt-3">
			{cards.map(({ m, Icon, title, line }) => {
				const on = mode === m;
				return (
					<button
						key={m}
						type="button"
						onClick={() => onMode(m)}
						className={cn(
							"flex flex-col items-start gap-2 rounded-8 p-2.5 text-left transition-colors",
							on ? "bg-control-hover" : "bg-control hover:bg-control-hover",
						)}
					>
						<Icon weight={on ? "bold" : "regular"} className={cn("size-4", on ? "text-fg" : "text-fg-muted")} />
						<span className="flex flex-col">
							<span className={cn("text-xs font-medium", !on && "text-fg-secondary")}>{title}</span>
							<span className={cn("text-2xs", m === "auto" && phase === "active" ? "text-market-up" : "text-fg-muted")}>
								{line}
							</span>
						</span>
					</button>
				);
			})}
		</div>
	);
}
