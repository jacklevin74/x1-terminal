import { cn } from "@/lib/cn";
import { type HeaderProps, isOn, LABEL } from "./data";

const BARS = [0.55, 1, 0.7];

export default function V10({ phase }: HeaderProps) {
	const on = isOn(phase);
	return (
		<button type="button" className="flex shrink-0 items-center gap-2.5 whitespace-nowrap">
			<span className="flex h-4 items-end gap-0.5" aria-hidden="true">
				{BARS.map((h, i) => (
					<span
						key={h}
						className={cn(
							"w-[3px] origin-bottom rounded-full",
							on ? "bg-market-up" : "bg-fg-disabled",
							phase === "stopped" && "bg-market-down",
						)}
						style={{
							height: on ? `${h * 100}%` : "25%",
							animation: on ? `auto-eq 900ms ease-in-out ${i * 150}ms infinite alternate` : undefined,
						}}
					/>
				))}
			</span>
			<span className="flex flex-col items-start gap-1">
				<span className="text-2xs uppercase tracking-micro text-fg-muted">Auto</span>
				<span
					className={cn("text-xs", on ? "text-fg" : "text-fg-secondary", phase === "stopped" && "text-market-down")}
				>
					{LABEL[phase]}
				</span>
			</span>
			<style>{"@keyframes auto-eq{from{transform:scaleY(.35)}to{transform:scaleY(1)}}"}</style>
		</button>
	);
}
