import { PauseIcon, PlayIcon } from "@phosphor-icons/react";
import { cn } from "@/lib/cn";
import type { StatusProps } from "./data";

export default function V1({ phase, equity, dayPnl, dayUp, markets, next, onToggle }: StatusProps) {
	const on = phase === "active";
	return (
		<div className="flex flex-col gap-4 rounded-12 bg-control p-4">
			<div className="flex items-center gap-3">
				<span
					className={cn(
						"grid size-9 shrink-0 place-items-center rounded-full",
						on ? "bg-success-soft text-market-up" : "bg-control-hover text-fg-muted",
					)}
				>
					{on ? <PlayIcon weight="fill" className="size-4" /> : <PauseIcon weight="fill" className="size-4" />}
				</span>
				<span className="flex min-w-0 flex-1 flex-col">
					<span className="text-sm font-medium">{on ? "Trading" : "Paused"}</span>
					<span className="text-xs text-fg-muted tabular-nums">
						{on ? `Next cycle in ${next}` : "Positions stay open"}
					</span>
				</span>
				<button
					type="button"
					onClick={onToggle}
					className={cn(
						"h-8 shrink-0 rounded-full px-3.5 text-xs font-medium transition-colors",
						on ? "bg-control-hover text-fg hover:bg-fill-hover" : "bg-fill text-fg-inverse hover:opacity-90",
					)}
				>
					{on ? "Pause" : "Start"}
				</button>
			</div>
			<div className="grid grid-cols-3 gap-2 text-xs">
				<Metric label="Equity" value={equity} />
				<Metric label="Day PNL" value={dayPnl} className={dayUp ? "text-market-up" : "text-market-down"} />
				<Metric label="Markets" value={String(markets)} />
			</div>
		</div>
	);
}

function Metric({ label, value, className }: { label: string; value: string; className?: string }) {
	return (
		<div className="flex flex-col gap-0.5">
			<span className="text-2xs text-fg-muted">{label}</span>
			<span className={cn("tabular-nums", className)}>{value}</span>
		</div>
	);
}
