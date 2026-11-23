import { AssetDisplay } from "@/components/trade/components/asset-display";
import { cn } from "@/lib/cn";
import { DemoCard } from "./card";
import { ALL_MARKETS, type MarketsProps, shortName } from "./data";

export default function V4({ selected, onToggle }: MarketsProps) {
	return (
		<>
			<DemoCard />
			<div className="flex flex-col gap-2">
				<div className="flex items-center justify-between text-xs">
					<span className="text-fg-muted">Markets</span>
					<span className="tabular-nums text-fg-secondary">
						{selected.length} of {ALL_MARKETS.length} on
					</span>
				</div>
				<div className="grid grid-cols-3 gap-1.5">
					{ALL_MARKETS.map((coin) => {
						const on = selected.includes(coin);
						return (
							<button
								key={coin}
								type="button"
								onClick={() => onToggle(coin)}
								aria-pressed={on}
								className={cn(
									"flex h-9 items-center gap-1.5 rounded-8 px-2 text-xs transition-colors",
									on ? "bg-control-hover text-fg" : "bg-control text-fg-disabled hover:text-fg-muted",
								)}
							>
								<span className={cn("transition-opacity", !on && "opacity-35 grayscale")}>
									<AssetDisplay coin={coin} hideName iconClassName="size-4" />
								</span>
								<span className="truncate">{shortName(coin)}</span>
							</button>
						);
					})}
				</div>
			</div>
		</>
	);
}
