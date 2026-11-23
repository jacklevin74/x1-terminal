import { cn } from "@/lib/cn";
import type { ToggleProps } from "./data";

export default function V3({ mode, phase, onMode }: ToggleProps) {
	return (
		<div className="flex gap-5 px-3 pt-3">
			{(["manual", "auto"] as const).map((m) => {
				const on = mode === m;
				return (
					<button
						key={m}
						type="button"
						onClick={() => onMode(m)}
						className={cn(
							"relative flex items-center gap-1.5 pb-2 text-base transition-colors",
							on ? "font-semibold text-fg" : "text-fg-muted hover:text-fg",
						)}
					>
						{m === "manual" ? "Manual" : "Auto"}
						{m === "auto" && phase === "active" && <span className="size-1.5 rounded-full bg-market-up" />}
						<span
							className={cn(
								"absolute inset-x-0 bottom-0 h-0.5 rounded-full transition-opacity",
								on ? "bg-fg opacity-100" : "opacity-0",
							)}
						/>
					</button>
				);
			})}
		</div>
	);
}
