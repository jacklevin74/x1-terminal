import { cn } from "@/lib/cn";
import type { ToggleProps } from "./data";

export default function V5({ mode, phase, onMode }: ToggleProps) {
	const auto = mode === "auto";
	const lit = auto && phase === "active";
	return (
		<div className="px-3 pt-3">
			<div className="relative isolate grid h-9 grid-cols-2 rounded-full bg-control p-0.5">
				<div
					aria-hidden="true"
					className={cn(
						"pointer-events-none absolute inset-y-0 right-0 left-1/2 -z-10 transition-opacity duration-500",
						lit ? "opacity-100" : "opacity-0",
					)}
					style={{ filter: "blur(14px)" }}
				>
					<span className="absolute inset-x-4 top-1 bottom-1 rounded-full bg-[#0f5c3f]" />
					<span className="absolute inset-x-10 top-2 bottom-2 rounded-full bg-[#1fa971]" />
					<span className="absolute inset-x-16 top-3 bottom-3 rounded-full bg-[#b8ffd9]" />
				</div>
				<span
					className={cn(
						"absolute top-0.5 bottom-0.5 left-0.5 w-[calc(50%-2px)] rounded-full transition-[transform,background-color] duration-300 ease-[cubic-bezier(0.23,1,0.32,1)]",
						auto ? "translate-x-full" : "translate-x-0",
						lit ? "bg-[#0d2a20]" : "bg-control-hover",
					)}
				/>
				{(["manual", "auto"] as const).map((m) => (
					<button
						key={m}
						type="button"
						onClick={() => onMode(m)}
						className={cn(
							"relative z-10 flex items-center justify-center gap-1.5 text-xs transition-colors",
							mode === m ? "font-medium text-fg" : "text-fg-muted hover:text-fg",
							m === "auto" && lit && "text-market-up",
						)}
					>
						{m === "manual" ? "Manual" : lit ? "Auto · live" : "Auto"}
					</button>
				))}
			</div>
		</div>
	);
}
