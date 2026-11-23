import { cn } from "@/lib/cn";
import type { ToggleProps } from "./data";

export default function V2({ mode, phase, onMode }: ToggleProps) {
	return (
		<div className="flex bg-background">
			{(["manual", "auto"] as const).map((m) => {
				const on = mode === m;
				return (
					<button
						key={m}
						type="button"
						onClick={() => onMode(m)}
						className={cn(
							"flex h-10 flex-1 items-center justify-center gap-2 rounded-t-8 text-sm transition-colors",
							on ? "bg-surface font-medium text-fg" : "text-fg-muted hover:text-fg",
						)}
					>
						{m === "manual" ? "Manual" : "Auto"}
						{m === "auto" && (
							<span
								className={cn(
									"rounded-full px-1.5 py-px text-2xs",
									phase === "active" ? "bg-success-soft text-market-up" : "bg-control text-fg-muted",
								)}
							>
								{phase === "active" ? "Live" : "Paused"}
							</span>
						)}
					</button>
				);
			})}
		</div>
	);
}
