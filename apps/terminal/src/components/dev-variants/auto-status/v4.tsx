import { cn } from "@/lib/cn";
import type { StatusProps } from "./data";

export default function V4({ phase, equity, dayPnl, dayUp, markets, next, onToggle }: StatusProps) {
	const on = phase === "active";
	return (
		<div className="flex flex-col gap-3">
			<div className="flex items-center justify-between">
				<button
					type="button"
					onClick={onToggle}
					className={cn(
						"inline-flex h-7 items-center gap-2 rounded-full pr-3 pl-2.5 text-xs font-medium",
						on ? "bg-success-soft text-market-up" : "bg-control text-fg-secondary",
					)}
				>
					<span className="relative flex size-2">
						{on && <span className="absolute inset-0 animate-ping rounded-full bg-market-up opacity-60" />}
						<span className={cn("relative size-2 rounded-full", on ? "bg-market-up" : "bg-fg-disabled")} />
					</span>
					{on ? "Live" : "Paused"}
				</button>
				<span className="text-xs text-fg-muted tabular-nums">{on ? `Next cycle ${next}` : "Not trading"}</span>
			</div>
			<div className="grid grid-cols-3 gap-2">
				<Tile label="Equity" value={equity} />
				<Tile label="Day PNL" value={dayPnl} className={dayUp ? "text-market-up" : "text-market-down"} />
				<Tile label="Markets" value={String(markets)} />
			</div>
		</div>
	);
}

function Tile({ label, value, className }: { label: string; value: string; className?: string }) {
	return (
		<div className="flex flex-col gap-1 rounded-8 bg-control p-2.5">
			<span className="text-2xs text-fg-muted">{label}</span>
			<span className={cn("text-sm font-medium tabular-nums", className)}>{value}</span>
		</div>
	);
}
