import { Button, ButtonIcon } from "@hypeterminal/ui";
import { t } from "@lingui/core/macro";
import { StarIcon, XIcon } from "@phosphor-icons/react";
import { get24hChange } from "@/domain/market";
import { cn } from "@/lib/cn";
import { formatPercent } from "@/lib/format";
import { useMarketsInfo } from "@/lib/hyperliquid";
import { getValueColorClass } from "@/lib/ui/value-color";
import { useExchangeScope } from "@/providers/exchange-scope";
import { useFavoriteMarkets, useMarketActions, useSelectedMarket } from "@/stores/use-market-store";

export function FavoritesStrip() {
	const favorites = useFavoriteMarkets();
	const selectedMarket = useSelectedMarket();

	if (favorites.length === 0) {
		return (
			<div className="flex h-full items-center gap-2 text-xs text-fg-muted">
				<StarIcon className="size-3 shrink-0" />
				<span>{t`Select favorite markets`}</span>
			</div>
		);
	}

	return (
		<div className="flex h-full min-w-0 items-center gap-1 overflow-x-auto scrollbar-none">
			<StarIcon weight="fill" className="mr-1 size-3 shrink-0 text-yellow" />
			{favorites.map((name) => (
				<FavoriteChip key={name} name={name} isActive={name === selectedMarket} />
			))}
		</div>
	);
}

interface FavoriteChipProps {
	name: string;
	isActive: boolean;
}

function FavoriteChip({ name, isActive }: FavoriteChipProps) {
	const { scope } = useExchangeScope();
	const { setSelectedMarket, toggleFavoriteMarket } = useMarketActions();
	const { getMarketInfo } = useMarketsInfo();

	const market = getMarketInfo(name);
	const displayName = market?.pairName ?? name;
	const changePct = get24hChange(market?.prevDayPx, market?.markPx);

	function selectFavoriteMarket() {
		setSelectedMarket(scope, name);
	}

	function handleKeyDown(e: React.KeyboardEvent) {
		if (e.key === "Enter" || e.key === " ") {
			e.preventDefault();
			setSelectedMarket(scope, name);
		}
	}

	function handleRemove(e: React.MouseEvent) {
		e.stopPropagation();
		toggleFavoriteMarket(name);
	}

	return (
		<div className="group/fav relative shrink-0">
			<Button
				variant={isActive ? "secondary" : "ghost"}
				intent="neutral"
				size="xxs"
				onClick={selectFavoriteMarket}
				onKeyDown={handleKeyDown}
				tabIndex={0}
				aria-pressed={isActive}
				aria-label={t`Select ${displayName} market`}
				className={cn("tabular-nums", isActive ? "text-fg" : "text-fg-secondary hover:text-fg")}
			>
				<span>{displayName}</span>
				{changePct != null && <span className={getValueColorClass(changePct)}>{formatPercent(changePct / 100)}</span>}
			</Button>
			<ButtonIcon
				variant="secondary"
				intent="neutral"
				size="xxs"
				onClick={handleRemove}
				aria-label={t`Remove ${displayName} from favorites`}
				className="absolute -top-1 -right-1 hidden size-3.5 bg-control-hover text-fg-muted hover:text-fg focus-visible:flex group-hover/fav:flex group-focus-within/fav:flex"
			>
				<XIcon className="size-2.5" weight="bold" />
			</ButtonIcon>
		</div>
	);
}
