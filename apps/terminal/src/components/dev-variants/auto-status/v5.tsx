import { cn } from "@/lib/cn";
import type { StatusProps } from "./data";

export default function V5({ phase, equity, dayPnl, dayUp, markets, next, onToggle }: StatusProps) {
	const on = phase === "active";
	return (
		<div className="flex flex-col gap-3">
			<div className="flex items-center gap-3 rounded-12 bg-control p-3">
				<span className="flex min-w-0 flex-1 flex-col">
					<span className="text-sm font-medium">Auto Trader</span>
					<span className={cn("text-xs tabular-nums", on ? "text-market-up" : "text-fg-muted")}>
						{on ? `On · next cycle ${next}` : "Off · positions stay open"}
					</span>
				</span>
				<button
					type="button"
					role="switch"
					aria-checked={on}
					onClick={onToggle}
					className={cn(
						"relative h-7 w-12 shrink-0 rounded-full transition-colors duration-200",
						on ? "bg-market-up" : "bg-control-hover",
					)}
				>
					<span
						className={cn(
							"absolute top-1 left-1 size-5 rounded-full bg-white shadow-sm transition-transform duration-200 ease-[cubic-bezier(0.23,1,0.32,1)]",
							on && "translate-x-5",
						)}
					/>
				</button>
			</div>
			<div className="flex flex-col text-xs">
				<Row label="Equity" value={equity} />
				<Row label="Day PNL" value={dayPnl} className={dayUp ? "text-market-up" : "text-market-down"} />
				<Row label="Markets" value={String(markets)} />
			</div>
		</div>
	);
}

function Row({ label, value, className }: { label: string; value: string; className?: string }) {
	return (
		<div className="flex min-h-6 items-center justify-between">
			<span className="text-fg-muted">{label}</span>
			<span className={cn("tabular-nums", className)}>{value}</span>
		</div>
	);
}
