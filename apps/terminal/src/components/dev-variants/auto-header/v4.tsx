import { cn } from "@/lib/cn";
import { type HeaderProps, isOn, LABEL } from "./data";

function value(props: HeaderProps) {
	if (props.phase === "active") return `Next ${props.next}`;
	return LABEL[props.phase];
}

export default function V4(props: HeaderProps) {
	const { phase, progress } = props;
	return (
		<button type="button" className="flex w-24 shrink-0 flex-col items-start gap-1 whitespace-nowrap">
			<span className="text-2xs uppercase tracking-micro text-fg-muted">Auto</span>
			<span
				className={cn(
					"text-xs tabular-nums",
					isOn(phase) ? "text-fg" : "text-fg-secondary",
					phase === "stopped" && "text-market-down",
				)}
			>
				{value(props)}
			</span>
			<span className="h-0.5 w-full overflow-hidden rounded-full bg-control">
				<span
					className={cn("block h-full rounded-full", isOn(phase) ? "bg-market-up" : "bg-fg-disabled")}
					style={{ width: `${phase === "active" ? progress * 100 : phase === "stopped" ? 100 : 0}%` }}
				/>
			</span>
		</button>
	);
}
