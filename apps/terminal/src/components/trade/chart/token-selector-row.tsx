import { Badge, ButtonIcon } from "@hypeterminal/ui";
import { t } from "@lingui/core/macro";
import { FireIcon, StarIcon } from "@phosphor-icons/react";
import { get24hChange, getOiUsd, isTokenInCategory } from "@/domain/market";
import { cn } from "@/lib/cn";
import { formatPercent, formatPrice, formatUSD } from "@/lib/format";
import { getValueColorClass } from "@/lib/ui/value-color";
import { AssetDisplay } from "../components/asset-display";
import { getMarketTableColumnClass, type MarketRow, type MarketScope } from "./token-selector-columns";

interface Props {
	market: MarketRow;
	mobile: boolean;
	scope: MarketScope;
	isSelected: boolean;
	isHighlighted: boolean;
	isFavorite: boolean;
	top: number;
	height: number;
	onSelect: (name: string) => void;
	onToggleFavorite: (name: string) => void;
}

function getSzDecimals(market: MarketRow): number {
	if (market.kind === "spot") return market.tokensInfo[0]?.szDecimals ?? 4;
	return market.szDecimals;
}

function getMaxLeverage(market: MarketRow): number | null {
	if (market.kind === "spot") return null;
	return market.maxLeverage ?? null;
}

function getDex(market: MarketRow): string | undefined {
	if (market.kind === "builderPerp") return market.dex;
	return undefined;
}

export function TokenSelectorRow({
	market,
	mobile,
	scope,
	isSelected,
	isHighlighted,
	isFavorite: isFav,
	top,
	height,
	onSelect,
	onToggleFavorite,
}: Props) {
	const changePercent = get24hChange(market.prevDayPx, market.markPx);
	const changeText = formatPercent(changePercent !== null ? changePercent / 100 : null);
	const maxLeverage = getMaxLeverage(market);
	const dex = getDex(market);
	const oiValue = getOiUsd(market.openInterest, market.markPx);
	const cellClass = "shrink-0 pl-2 text-right";

	return (
		<div
			data-index={market.name}
			onClick={() => onSelect(market.name)}
			onKeyDown={(e) => {
				if (e.key === "Enter" || e.key === " ") onSelect(market.name);
			}}
			role="option"
			aria-selected={isSelected}
			tabIndex={-1}
			className={cn(
				"absolute top-0 left-0 flex w-full cursor-pointer items-center border-b border-stroke-faint pr-3 pl-1 text-xs font-normal tabular-nums text-fg",
				"transition-colors hover:bg-control/50",
				isSelected && !isHighlighted && "bg-control/50",
				isHighlighted && "bg-control",
			)}
			style={{ height: `${height}px`, transform: `translateY(${top}px)` }}
		>
			<div className="flex min-w-0 flex-1 items-center gap-2 pl-2">
				<ButtonIcon
					variant="ghost"
					intent="neutral"
					size="xxs"
					onClick={(e) => {
						e.stopPropagation();
						onToggleFavorite(market.name);
					}}
					className="relative hover:bg-control-hover max-md:before:absolute max-md:before:-inset-1.5 max-md:before:content-['']"
					aria-label={isFav ? t`Remove ${market.pairName} from favorites` : t`Add ${market.pairName} to favorites`}
					aria-pressed={isFav}
				>
					<StarIcon
						weight={isFav ? "fill" : "regular"}
						className={cn("size-3.5 transition-colors", isFav ? "text-yellow" : "text-fg-muted hover:text-yellow")}
					/>
				</ButtonIcon>
				<AssetDisplay coin={market.name} hideName iconClassName="size-5 shrink-0" />
				<span className={cn("flex min-w-0", mobile ? "flex-col items-start" : "items-center gap-1")}>
					<span title={market.pairName} className="min-w-0 max-w-full truncate font-medium">
						{market.pairName}
					</span>
					<span className="flex shrink-0 items-center gap-1 empty:hidden">
						{maxLeverage && (
							<Badge tone="neutral" size="xs">
								{maxLeverage}x
							</Badge>
						)}
						{market.kind === "spot" && (
							<Badge tone="neutral" size="xs">
								{t`Spot`}
							</Badge>
						)}
						{dex && (
							<Badge tone="neutral" size="xs">
								{dex}
							</Badge>
						)}
						{isTokenInCategory(market.shortName, "new") && (
							<Badge tone="neutral" size="xxs" className="uppercase tracking-micro">
								{t`NEW`}
							</Badge>
						)}
					</span>
				</span>
			</div>
			<div className={cn(cellClass, getMarketTableColumnClass("price", mobile))}>
				{formatPrice(market.markPx, { szDecimals: getSzDecimals(market) })}
			</div>
			<div
				className={cn(
					cellClass,
					getMarketTableColumnClass("24h-change", mobile),
					changePercent === null ? "text-fg-muted" : getValueColorClass(changePercent),
				)}
			>
				{changeText}
			</div>
			{scope !== "spot" && (
				<div className={cn(cellClass, "hidden sm:block", getMarketTableColumnClass("oi", mobile))}>
					{formatUSD(oiValue)}
				</div>
			)}
			<div className={cn(cellClass, "hidden sm:block", getMarketTableColumnClass("volume", mobile))}>
				{formatUSD(market.dayNtlVlm)}
			</div>
			{scope !== "spot" && (
				<div
					className={cn(
						cellClass,
						"hidden sm:flex items-center justify-end gap-1",
						getMarketTableColumnClass("funding", mobile),
						market.funding ? getValueColorClass(market.funding) : "text-fg-muted",
					)}
				>
					{market.funding && <FireIcon className="size-3 shrink-0" />}
					{formatPercent(market.funding, { minimumFractionDigits: 4, signDisplay: "exceptZero" })}
				</div>
			)}
		</div>
	);
}
