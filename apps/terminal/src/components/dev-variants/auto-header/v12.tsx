import { cn } from "@/lib/cn";
import { type HeaderProps, isOn, LABEL } from "./data";

const POINTS = [0, 2, 1.5, 4, 3.2, 5.5, 5, 7.4, 6.8, 9];

function path(w: number, h: number) {
	const max = Math.max(...POINTS);
	return POINTS.map((p, i) => `${i ? "L" : "M"}${(i / (POINTS.length - 1)) * w},${h - (p / max) * (h - 2) - 1}`).join(
		" ",
	);
}

export default function V12({ phase, dayPnl, dayUp }: HeaderProps) {
	const on = isOn(phase);
	return (
		<button type="button" className="flex shrink-0 items-center gap-3 whitespace-nowrap">
			<span className="flex flex-col items-start gap-1">
				<span className="text-2xs uppercase tracking-micro text-fg-muted">
					Auto{" "}
					<span
						className={cn(
							"normal-case tracking-normal",
							on ? "text-fg-secondary" : "text-fg-disabled",
							phase === "stopped" && "text-market-down",
						)}
					>
						{LABEL[phase]}
					</span>
				</span>
				<span
					className={cn(
						"text-xs tabular-nums",
						dayUp ? "text-market-up" : "text-market-down",
						!on && "text-fg-secondary",
					)}
				>
					{dayPnl}
				</span>
			</span>
			<svg viewBox="0 0 48 20" className="h-5 w-12" aria-hidden="true">
				<path
					d={path(48, 20)}
					fill="none"
					strokeWidth="1.5"
					strokeLinejoin="round"
					className={cn(on ? "stroke-market-up" : "stroke-fg-disabled")}
				/>
			</svg>
		</button>
	);
}
