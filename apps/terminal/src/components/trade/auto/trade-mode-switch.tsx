import { Tooltip } from "@hypeterminal/ui";
import { useAutoTrader } from "@/hooks/use-auto-trader";
import { isTrading } from "@/lib/auto-trader/phase";
import { cn } from "@/lib/cn";
import { setTradeMode, type TradeMode } from "@/stores/use-trade-mode-store";

interface Props {
	mode: TradeMode;
}

type Phase = "active" | "paused" | null;

export function TradeModeSwitch({ mode }: Props) {
	const auto = useAutoTrader();
	let phase: Phase = null;
	if (auto.available && auto.phase !== "setup") phase = isTrading(auto.phase) ? "active" : "paused";
	const locked = phase === "active";
	return (
		<div className="flex h-9 shrink-0 items-center gap-4 border-b border-stroke-weak px-3">
			{(["manual", "auto"] as const).map((m) => {
				const on = mode === m;
				const blocked = locked && m === "manual";
				return (
					<Tooltip key={m} content={blocked ? "Pause Auto mode first" : null} side="bottom">
						<button
							type="button"
							aria-disabled={blocked || undefined}
							onClick={() => {
								if (!blocked) setTradeMode(m);
							}}
							className={cn(
								"flex h-9 items-center gap-1.5 text-xs transition-colors",
								on ? "font-medium text-fg" : "text-fg-muted",
								!on && !blocked && "hover:text-fg",
								blocked && "cursor-not-allowed opacity-50",
							)}
						>
							{m === "manual" ? "Manual" : "Auto"}
							{m === "auto" && phase && (
								<span
									className={cn(
										"rounded-full px-1.5 py-px text-2xs",
										phase === "active" ? "bg-success-soft text-market-up" : "bg-control text-fg-muted",
									)}
								>
									{phase === "active" ? "Live" : "Paused"}
								</span>
							)}
						</button>
					</Tooltip>
				);
			})}
		</div>
	);
}
