import { CheckIcon } from "@phosphor-icons/react";
import { cn } from "@/lib/cn";
import { CHECKS, STATUS } from "./data";

export function StopMeter({ className }: { className?: string }) {
	const pct = Math.min(100, (STATUS.stopUsed / STATUS.stopLimit) * 100);
	return (
		<span className={cn("inline-flex items-center gap-2 whitespace-nowrap tabular-nums", className)}>
			<span className="relative h-1 w-14 overflow-hidden rounded-full bg-control">
				<span className="absolute inset-y-0 left-0 rounded-full bg-fg-muted" style={{ width: `${pct}%` }} />
			</span>
			${STATUS.stopUsed.toFixed(2)} of ${STATUS.stopLimit.toFixed(2)}
		</span>
	);
}

export function ChecksSummary() {
	const passed = CHECKS.filter((c) => c.ok).length;
	return (
		<span className="group relative inline-flex">
			<button
				type="button"
				className="inline-flex h-6 items-center gap-1.5 rounded-full bg-control px-2.5 text-xs hover:bg-control-hover"
			>
				<CheckIcon weight="bold" className="size-3 text-market-up" />
				{passed} of {CHECKS.length} checks pass
			</button>
			<span className="pointer-events-none absolute top-full left-0 z-10 mt-1 hidden w-48 flex-col gap-1.5 rounded-8 bg-overlay p-3 text-xs shadow-menu group-hover:flex">
				{CHECKS.map((c) => (
					<span key={c.label} className="flex items-center gap-2">
						<CheckIcon weight="bold" className="size-3 text-market-up" />
						{c.label}
					</span>
				))}
			</span>
		</span>
	);
}

export function StatusDot() {
	return <span className={cn("size-2 rounded-full", STATUS.on ? "bg-market-up" : "bg-fg-disabled")} />;
}
