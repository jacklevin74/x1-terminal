import { PauseIcon } from "@phosphor-icons/react";
import { cn } from "@/lib/cn";
import type { StatusProps } from "./data";

const R = 22;
const C = 2 * Math.PI * R;

export default function V3({ phase, equity, dayPnl, dayUp, markets, next, progress, onToggle }: StatusProps) {
	const on = phase === "active";
	return (
		<div className="flex flex-col gap-3">
			<div className="flex items-center gap-3">
				<div className="relative grid size-14 shrink-0 place-items-center">
					<svg viewBox="0 0 56 56" className="absolute inset-0 -rotate-90" aria-hidden="true">
						<circle cx="28" cy="28" r={R} fill="none" stroke="var(--color-control)" strokeWidth="4" />
						{on && (
							<circle
								cx="28"
								cy="28"
								r={R}
								fill="none"
								stroke="var(--color-market-up)"
								strokeWidth="4"
								strokeLinecap="round"
								strokeDasharray={C}
								strokeDashoffset={C * (1 - progress)}
								className="transition-[stroke-dashoffset] duration-1000 ease-linear"
							/>
						)}
					</svg>
					{on ? (
						<span className="text-xs font-medium tabular-nums">{next}</span>
					) : (
						<PauseIcon weight="fill" className="size-4 text-fg-muted" />
					)}
				</div>
				<div className="flex min-w-0 flex-1 flex-col">
					<span className="text-sm font-medium">{on ? "Active" : "Paused"}</span>
					<span className="text-xs text-fg-muted">
						{on ? `Trading ${markets} markets` : "No new trades. Positions stay open."}
					</span>
				</div>
				<button
					type="button"
					onClick={onToggle}
					className="h-8 shrink-0 rounded-8 bg-control px-3 text-xs font-medium transition-colors hover:bg-control-hover"
				>
					{on ? "Pause" : "Start"}
				</button>
			</div>
			<div className="flex flex-col text-xs">
				<Row label="Equity" value={equity} />
				<Row label="Day PNL" value={dayPnl} className={dayUp ? "text-market-up" : "text-market-down"} />
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
