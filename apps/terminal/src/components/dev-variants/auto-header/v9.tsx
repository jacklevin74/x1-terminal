import { AutoIconStack } from "@/components/trade/auto/auto-icon-stack";
import { cn } from "@/lib/cn";
import { type HeaderProps, isOn, LABEL } from "./data";

const COINS = ["BTC", "ETH", "SOL", "HYPE"];

export default function V9({ phase, markets }: HeaderProps) {
	const on = isOn(phase);
	return (
		<button
			type="button"
			className="group -mx-2 flex shrink-0 flex-col items-start gap-1 whitespace-nowrap rounded-8 px-2 py-1 transition-colors hover:bg-fill-hover"
		>
			<span className="text-2xs uppercase tracking-micro text-fg-muted">
				Auto{" "}
				<span className={cn(on ? "text-market-up" : "text-fg-secondary", phase === "stopped" && "text-market-down")}>
					{LABEL[phase]}
				</span>
			</span>
			<span className={cn("flex items-center gap-1.5 text-xs", !on && "opacity-50")}>
				<AutoIconStack coins={COINS} size="size-4" />
				<span className="text-fg-secondary">+{markets - COINS.length}</span>
			</span>
		</button>
	);
}
