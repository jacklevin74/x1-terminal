import { HandPointingIcon, RobotIcon } from "@phosphor-icons/react";
import { cn } from "@/lib/cn";
import { PHASE_TEXT, type ToggleProps } from "./data";

export default function V1({ mode, phase, onMode }: ToggleProps) {
	const auto = mode === "auto";
	return (
		<div className="flex items-center justify-between gap-3 px-3 pt-3">
			<div className="flex min-w-0 flex-col">
				<span className="text-sm font-medium">{auto ? "Auto Trader" : "Place order"}</span>
				<span className="text-2xs text-fg-muted">{auto ? PHASE_TEXT[phase] : "You choose each trade"}</span>
			</div>
			<div className="flex rounded-full bg-control p-0.5">
				{(["manual", "auto"] as const).map((m) => {
					const Icon = m === "manual" ? HandPointingIcon : RobotIcon;
					return (
						<button
							key={m}
							type="button"
							aria-label={m === "manual" ? "Manual" : "Auto"}
							onClick={() => onMode(m)}
							className={cn(
								"relative grid size-8 place-items-center rounded-full transition-colors",
								mode === m ? "bg-control-hover text-fg" : "text-fg-muted hover:text-fg",
							)}
						>
							<Icon weight={mode === m ? "bold" : "regular"} className="size-4" />
							{m === "auto" && phase === "active" && (
								<span className="absolute top-1 right-1 size-1.5 rounded-full bg-market-up" />
							)}
						</button>
					);
				})}
			</div>
		</div>
	);
}
