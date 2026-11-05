import { t } from "@lingui/core/macro";
import { FireIcon } from "@phosphor-icons/react";
import { ClientOnly } from "@tanstack/react-router";
import { Skeleton } from "boneyard-js/react";
import { Suspense } from "react";
import { UI_TEXT } from "@/config/ui-text";
import { get24hChange, getOiUsd, getPositionDex } from "@/domain/market";
import { useTickFlash } from "@/hooks/ui/use-tick-flash";
import { cn } from "@/lib/cn";
import { formatPercent, formatPrice, formatUSD } from "@/lib/format";
import { useSelectedMarketInfo } from "@/lib/hyperliquid";
import { createLazyComponent } from "@/lib/lazy";
import { toBig } from "@/lib/trade/numbers";
import { getValueColorClass } from "@/lib/ui/value-color";
import { useExchangeScope } from "@/providers/exchange-scope";
import { useTheme } from "@/stores/use-global-settings-store";
import { useMarketActions } from "@/stores/use-market-store";
import { TokenSelector } from "../chart/token-selector";
import { MobileBottomNavSpacer } from "./mobile-bottom-nav";

const KlineChart = createLazyComponent(() => import("../chart/kline-chart"), "KlineChart");

const overviewText = UI_TEXT.MARKET_OVERVIEW;

interface MobileChartViewProps {
	className?: string;
}

export function MobileChartView({ className }: MobileChartViewProps) {
	const theme = useTheme();
	const { data: selectedMarket, isLoading } = useSelectedMarketInfo();
	const { scope } = useExchangeScope();
	const { setSelectedMarket } = useMarketActions();

	function handleMarketChange(marketName: string) {
		setSelectedMarket(scope, marketName);
	}

	const fundingNum = toBig(selectedMarket?.funding)?.toNumber() ?? 0;
	const markPx = selectedMarket?.markPx;
	const change24h = get24hChange(selectedMarket?.prevDayPx, selectedMarket?.markPx);
	const oiUsd = getOiUsd(selectedMarket?.openInterest, selectedMarket?.markPx);
	const priceRef = useTickFlash<HTMLDivElement>(markPx, selectedMarket?.name ?? "");

	return (
		<div className={cn("flex flex-col flex-1 min-h-0", className)}>
			<div className="shrink-0 h-12 px-3 flex items-center justify-between gap-3 border-b border-stroke-weak bg-surface">
				<TokenSelector selectedMarket={selectedMarket} onValueChange={handleMarketChange} />

				<Skeleton name="market-price" loading={isLoading}>
					<div className="text-right">
						<div
							ref={priceRef}
							className={cn(
								"text-base font-medium tabular-nums",
								change24h !== null ? getValueColorClass(change24h) : "text-fg",
							)}
						>
							{formatPrice(markPx ?? null, { szDecimals: selectedMarket?.szDecimals })}
						</div>
						{typeof change24h === "number" && (
							<div className={cn("text-xs tabular-nums", getValueColorClass(change24h))}>
								{change24h >= 0 ? "+" : ""}
								{change24h.toFixed(2)}%
							</div>
						)}
					</div>
				</Skeleton>
			</div>

			<div className="shrink-0 border-b border-stroke-weak bg-surface">
				<div
					className={cn(
						"overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
						"mask-r-from-[calc(100%-1.5rem)] mask-r-to-100%",
					)}
				>
					<Skeleton name="market-stats" loading={isLoading}>
						<div className="flex items-center gap-6 py-2 pl-3 pr-6 min-w-max">
							<StatPill label={overviewText.LABEL_ORACLE} value={formatUSD(selectedMarket?.oraclePx)} />
							<StatPill
								label={overviewText.LABEL_VOLUME}
								value={formatUSD(selectedMarket?.dayNtlVlm, {
									notation: "compact",
									compactDisplay: "short",
								})}
							/>
							<StatPill
								label={overviewText.LABEL_OPEN_INTEREST}
								value={formatUSD(oiUsd, {
									notation: "compact",
									compactDisplay: "short",
								})}
							/>
							<div className="flex flex-col gap-1">
								<span className="flex items-center gap-1 text-2xs uppercase tracking-micro text-fg-muted">
									<FireIcon className={cn("size-3", getValueColorClass(fundingNum))} />
									{t`Funding`}
								</span>
								<span className={cn("text-xs tabular-nums", getValueColorClass(fundingNum))}>
									{formatPercent(fundingNum, {
										minimumFractionDigits: 4,
										signDisplay: "exceptZero",
									})}
								</span>
							</div>
						</div>
					</Skeleton>
				</div>
			</div>

			<div className="flex-1 min-h-0 bg-surface">
				<ClientOnly
					fallback={
						<div className="h-full flex items-center justify-center">
							<ChartSkeleton />
						</div>
					}
				>
					<Suspense fallback={<ChartSkeleton />}>
						{selectedMarket && (
							<KlineChart
								symbol={selectedMarket.name}
								positionDex={getPositionDex(selectedMarket)}
								theme={theme === "dark" ? "dark" : "light"}
								yAxisInside
							/>
						)}
					</Suspense>
				</ClientOnly>
			</div>

			<MobileBottomNavSpacer />
		</div>
	);
}

function StatPill({ label, value }: { label: string; value: string }) {
	return (
		<div className="flex flex-col gap-1">
			<span className="text-2xs uppercase tracking-micro text-fg-muted">{label}</span>
			<span className="text-xs tabular-nums text-fg">{value}</span>
		</div>
	);
}

function ChartSkeleton() {
	return <div className="w-full h-full animate-pulse bg-surface" />;
}
