import { cn } from "@/lib/cn";
import type { StatusProps } from "./data";

export default function V2({ phase, equity, dayPnl, dayUp, markets, next, onToggle }: StatusProps) {
	const on = phase === "active";
	return (
		<div className="relative isolate flex flex-col items-center gap-1 overflow-hidden rounded-12 bg-control px-4 pt-6 pb-4">
			<div
				aria-hidden="true"
				className={cn(
					"pointer-events-none absolute inset-x-0 -top-10 -z-10 h-32 transition-opacity duration-700",
					on ? "opacity-70" : "opacity-0",
				)}
				style={{ filter: "blur(22px)" }}
			>
				<span
					className="absolute top-6 left-1/2 h-16 w-64 -translate-x-1/2 rounded-[50%]"
					style={{ background: "var(--mood-bull-rim)" }}
				/>
				<span
					className="absolute top-8 left-1/2 h-10 w-40 -translate-x-1/2 rounded-[50%]"
					style={{ background: "var(--mood-bull-mid)" }}
				/>
				<span
					className="absolute top-9 left-1/2 h-5 w-20 -translate-x-1/2 rounded-[50%]"
					style={{ background: "var(--mood-bull-core)" }}
				/>
			</div>
			<span
				aria-hidden="true"
				className={cn(
					"absolute top-0 left-1/2 h-px w-48 -translate-x-1/2 transition-opacity duration-700",
					on ? "opacity-100" : "opacity-0",
				)}
				style={{ background: "linear-gradient(90deg, transparent, var(--mood-bull-core), transparent)" }}
			/>
			<span className="text-2xs tracking-micro text-fg-muted uppercase">Auto Trader</span>
			<span className={cn("text-2xl font-semibold", on ? "text-fg" : "text-fg-muted")}>{on ? "Live" : "Paused"}</span>
			<span className="text-xs text-fg-muted tabular-nums">{on ? `Next cycle in ${next}` : "Positions stay open"}</span>
			<div className="mt-3 grid w-full grid-cols-3 gap-2 text-center text-xs">
				<span className="flex flex-col">
					<span className="text-2xs text-fg-muted">Equity</span>
					<span className="tabular-nums">{equity}</span>
				</span>
				<span className="flex flex-col">
					<span className="text-2xs text-fg-muted">Day PNL</span>
					<span className={cn("tabular-nums", dayUp ? "text-market-up" : "text-market-down")}>{dayPnl}</span>
				</span>
				<span className="flex flex-col">
					<span className="text-2xs text-fg-muted">Markets</span>
					<span className="tabular-nums">{markets}</span>
				</span>
			</div>
			<button
				type="button"
				onClick={onToggle}
				className="mt-3 h-8 w-full rounded-8 bg-control-hover text-xs font-medium transition-colors hover:bg-fill-hover"
			>
				{on ? "Pause" : "Start"}
			</button>
		</div>
	);
}
