import { Badge } from "@hypeterminal/ui";
import { CaretDownIcon } from "@phosphor-icons/react";
import { cn } from "@/lib/cn";
import type { UnifiedMarketInfo } from "@/lib/hyperliquid";
import { AssetDisplay } from "../components/asset-display";

const LEVERAGE_BADGE = /^\d+x$/;

export const MARKET_SELECTOR_TRIGGER_CLASSNAME =
	"inline-flex h-8 max-w-full min-w-0 shrink-0 cursor-pointer items-center gap-2 rounded-8 px-2 transition-colors hover:bg-control aria-expanded:bg-control focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-stroke-focus";

function getMarketBadges(market: UnifiedMarketInfo | undefined): string[] {
	if (!market) return [];
	if (market.kind === "spot") return ["Spot"];
	const leverage = market.maxLeverage ? `${market.maxLeverage}x` : null;
	if (market.kind === "builderPerp") return [market.dex, leverage].filter((badge): badge is string => !!badge);
	return leverage ? [leverage] : ["Perp"];
}

interface Props {
	selectedMarket: UnifiedMarketInfo | undefined;
}

export function TokenSelectorTriggerContent({ selectedMarket }: Props) {
	const badges = getMarketBadges(selectedMarket);

	return (
		<>
			{selectedMarket && (
				<>
					<AssetDisplay coin={selectedMarket.name} iconUrl={selectedMarket.iconUrl} hideName iconClassName="size-5" />
					<span className="min-w-0 truncate text-base font-medium text-fg">
						{selectedMarket.pairName ?? selectedMarket.name}
					</span>
					{badges.map((badge) => (
						<Badge
							key={badge}
							tone="neutral"
							size="xxs"
							className={cn("text-fg-muted", !LEVERAGE_BADGE.test(badge) && "uppercase tracking-micro")}
						>
							{badge}
						</Badge>
					))}
				</>
			)}
			<CaretDownIcon className="size-3 shrink-0 text-fg-muted" />
		</>
	);
}
