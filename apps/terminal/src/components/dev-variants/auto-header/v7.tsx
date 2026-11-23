import { PauseIcon, PlayIcon } from "@phosphor-icons/react";
import { cn } from "@/lib/cn";
import { type HeaderProps, isOn, LABEL } from "./data";

const R = 13;
const C = 2 * Math.PI * R;

export default function V7({ phase, progress }: HeaderProps) {
	const on = isOn(phase);
	const fill = phase === "active" ? progress : on ? 0.08 : 0;
	return (
		<button type="button" className="flex shrink-0 items-center gap-2.5 whitespace-nowrap">
			<span className="relative flex size-8 items-center justify-center">
				<svg viewBox="0 0 32 32" className="absolute inset-0 -rotate-90" aria-hidden="true">
					<circle cx="16" cy="16" r={R} fill="none" strokeWidth="3" className="stroke-control" />
					<circle
						cx="16"
						cy="16"
						r={R}
						fill="none"
						strokeWidth="3"
						strokeLinecap="round"
						strokeDasharray={C}
						strokeDashoffset={C * (1 - fill)}
						className={cn(phase === "stopped" ? "stroke-market-down" : "stroke-market-up")}
					/>
				</svg>
				{on ? (
					<PlayIcon weight="fill" className="size-3 text-fg" />
				) : (
					<PauseIcon weight="fill" className="size-3 text-fg-muted" />
				)}
			</span>
			<span className="flex flex-col items-start gap-1">
				<span className="text-2xs uppercase tracking-micro text-fg-muted">Auto</span>
				<span
					className={cn("text-xs", on ? "text-fg" : "text-fg-secondary", phase === "stopped" && "text-market-down")}
				>
					{LABEL[phase]}
				</span>
			</span>
		</button>
	);
}
