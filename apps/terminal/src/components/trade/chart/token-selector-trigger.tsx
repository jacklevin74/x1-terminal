import { Badge } from "@hypeterminal/ui";
import { CaretDownIcon } from "@phosphor-icons/react";
import type { UnifiedMarketInfo } from "@/lib/hyperliquid";
import { AssetDisplay } from "../components/asset-display";

export const MARKET_SELECTOR_TRIGGER_CLASSNAME =
	"inline-flex h-8 max-w-full min-w-0 shrink-0 cursor-pointer items-center gap-2 rounded-8 px-2 transition-colors hover:bg-control aria-expanded:bg-control focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-stroke-focus";

function getMarketKindBadgeLabel(market: UnifiedMarketInfo | undefined): string {
	if (!market) return "";
	if (market.kind === "spot") return "Spot";
	if (market.kind === "builderPerp") return market.dex;
	return "Perp";
}

interface Props {
	selectedMarket: UnifiedMarketInfo | undefined;
}

export function TokenSelectorTriggerContent({ selectedMarket }: Props) {
	const kindBadge = getMarketKindBadgeLabel(selectedMarket);

	return (
		<>
			{selectedMarket && (
				<>
					<AssetDisplay coin={selectedMarket.name} iconUrl={selectedMarket.iconUrl} hideName iconClassName="size-5" />
					<span className="min-w-0 truncate text-base font-medium text-fg">
						{selectedMarket.pairName ?? selectedMarket.name}
					</span>
					{kindBadge ? (
						<Badge tone="neutral" size="xxs" className="uppercase tracking-micro text-fg-muted">
							{kindBadge}
						</Badge>
					) : null}
				</>
			)}
			<CaretDownIcon className="size-3 shrink-0 text-fg-muted" />
		</>
	);
}
