import { Tooltip } from "@hypeterminal/ui";
import { RobotIcon } from "@phosphor-icons/react";
import { cn } from "@/lib/cn";
import { type HeaderProps, isOn, LABEL } from "./data";

export default function V3({ phase, markets }: HeaderProps) {
	return (
		<Tooltip
			content={`Auto Trader ${LABEL[phase].toLowerCase()}${isOn(phase) ? `, ${markets} markets` : ""}`}
			side="bottom"
		>
			<button
				type="button"
				aria-label={`Auto Trader ${LABEL[phase]}`}
				className="relative flex size-8 shrink-0 items-center justify-center rounded-8 bg-control text-fg-secondary transition-colors hover:bg-control-hover hover:text-fg"
			>
				<RobotIcon weight={isOn(phase) ? "fill" : "regular"} className={cn("size-4", isOn(phase) && "text-fg")} />
				<span
					className={cn(
						"absolute -top-0.5 -right-0.5 size-2.5 rounded-full ring-2 ring-surface",
						isOn(phase) && "bg-market-up",
						phase === "paused" && "bg-fg-disabled",
						phase === "closing" && "bg-fg-secondary",
						phase === "stopped" && "bg-market-down",
					)}
				/>
			</button>
		</Tooltip>
	);
}
