import { Tooltip, tooltipUnderlineClass } from "@hypeterminal/ui";
import { cn } from "@/lib/cn";
import { type HeaderProps, isOn, LABEL } from "./data";

export default function V1({ phase, markets, next }: HeaderProps) {
	const tip = isOn(phase) ? `Trading ${markets} markets. Next cycle in ${next}.` : "Open Auto to start.";
	return (
		<Tooltip content={tip} side="bottom">
			<button type="button" className="flex shrink-0 flex-col items-start gap-1 whitespace-nowrap">
				<span className={cn("text-2xs uppercase tracking-micro text-fg-muted", tooltipUnderlineClass)}>
					Auto Trader
				</span>
				<span
					className={cn(
						"text-xs",
						isOn(phase) && "text-market-up",
						phase === "paused" && "text-fg-secondary",
						phase === "closing" && "text-fg",
						phase === "stopped" && "text-market-down",
					)}
				>
					{LABEL[phase]}
				</span>
			</button>
		</Tooltip>
	);
}
