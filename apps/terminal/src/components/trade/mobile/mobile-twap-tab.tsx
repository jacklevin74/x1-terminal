import { Badge, Button } from "@hypeterminal/ui";
import { t } from "@lingui/core/macro";
import { Skeleton } from "boneyard-js/react";
import { useMemo } from "react";
import { useConnection } from "wagmi";
import { TimeTicker } from "@/components/ui/time-ticker";
import { FALLBACK_VALUE_PLACEHOLDER, HL_ALL_DEXS } from "@/config/app";
import { getAvgPrice } from "@/domain/market";
import { cn } from "@/lib/cn";
import { formatDateTime, formatDuration, formatNumber, formatPrice } from "@/lib/format";
import { useExchange, useMarkets, useSubscription } from "@/lib/hyperliquid";
import { toBig } from "@/lib/trade/numbers";
import { useExchangeScope } from "@/providers/exchange-scope";
import { useMarketActions } from "@/stores/use-market-store";
import { AssetBadge } from "../components/asset-badge";
import { MetricCell } from "./metric-cell";

interface Props {
	className?: string;
}

export function MobileTwapTab({ className }: Props) {
	const { address, isConnected } = useConnection();
	const { scope } = useExchangeScope();
	const { setSelectedMarket } = useMarketActions();
	const { data: twapStatesEvent } = useSubscription(
		"twapStates",
		{ user: address ?? "0x0", dex: HL_ALL_DEXS },
		{ enabled: isConnected && !!address },
	);
	const markets = useMarkets();
	const { mutate: cancelTwap, isPending: isCancelling } = useExchange("twapCancel");

	const twapStates = twapStatesEvent?.states ?? [];
	const activeOrders = useMemo(
		() =>
			twapStates.map(([twapId, state]) => ({ twapId, state })).sort((a, b) => b.state.timestamp - a.state.timestamp),
		[twapStates],
	);

	const headerCount = isConnected ? `${activeOrders.length}` : FALLBACK_VALUE_PLACEHOLDER;
	const twapStatesStatus = twapStatesEvent ? "active" : "loading";

	if (!isConnected) {
		return (
			<div className="flex-1 flex items-center justify-center px-3 py-6 text-center text-xs text-fg-muted">
				{t`Connect your wallet to view TWAP orders.`}
			</div>
		);
	}

	if (twapStatesStatus !== "loading" && activeOrders.length === 0) {
		return (
			<div className="flex-1 flex items-center justify-center px-3 py-6 text-center text-xs text-fg-muted">
				{t`No active TWAP orders.`}
			</div>
		);
	}

	return (
		<Skeleton name="twap-tab" loading={twapStatesStatus === "loading"}>
			<div className={cn("flex-1 min-h-0 flex flex-col", className)}>
				<div className="shrink-0 h-10 px-3 flex items-center justify-between gap-2">
					<span className="text-2xs uppercase tracking-micro text-fg-muted">{t`TWAP Orders`}</span>
					<span className="text-xs tabular-nums text-fg">{headerCount}</span>
				</div>
				<div className="flex-1 min-h-0 overflow-y-auto divide-y divide-stroke-faint border-t border-stroke-faint">
					{activeOrders.map(({ twapId, state }) => {
						const isBuy = state.side === "B";
						const totalSize = toBig(state.sz)?.toNumber() ?? Number.NaN;
						const executedSize = toBig(state.executedSz)?.toNumber() ?? 0;
						const avgPrice = getAvgPrice(state.executedNtl, state.executedSz);
						const szDecimals = markets.getSzDecimals(state.coin);
						const creationTime = state.timestamp;
						const totalMinutes = state.minutes;

						return (
							<div key={twapId} className="flex flex-col gap-3 px-3 py-3">
								<div className="flex items-center justify-between gap-2">
									<div className="flex items-center gap-2">
										<AssetBadge
											coin={state.coin}
											side={isBuy ? "buy" : "sell"}
											onClick={() => setSelectedMarket(scope, state.coin)}
											appearance="plain"
											className="min-h-8"
											nameClassName="text-base font-medium text-fg"
										/>
										<span className={cn("text-xs font-medium", isBuy ? "text-market-up" : "text-market-down")}>
											{isBuy ? t`Buy` : t`Sell`}
										</span>
									</div>
									<div className="flex items-center gap-2">
										{state.reduceOnly && (
											<Badge tone="neutral" size="xs">
												{t`RO`}
											</Badge>
										)}
										<Button
											variant="secondary"
											intent="neutral"
											size="sm"
											disabled={isCancelling}
											onClick={() => {
												const assetId = markets.getAssetId(state.coin);
												if (typeof assetId !== "number") return;
												cancelTwap({ a: assetId, t: twapId });
											}}
										>
											{t`Cancel`}
										</Button>
									</div>
								</div>

								<div className="grid grid-cols-3 gap-3">
									<MetricCell label={t`Size`} value={formatNumber(totalSize, szDecimals)} />
									<MetricCell
										label={t`Executed`}
										value={formatNumber(executedSize, szDecimals)}
										valueClass={isBuy ? "text-market-up" : "text-market-down"}
									/>
									<MetricCell label={t`Avg Price`} value={formatPrice(avgPrice, { szDecimals })} align="end" />
								</div>

								<div className="flex items-center justify-between gap-2">
									<div className="text-xs tabular-nums text-fg-muted">
										<TimeTicker startTime={creationTime} durationMs={totalMinutes * 60 * 1000} isActive={true} />
										{" / "}
										{formatDuration(totalMinutes)}
									</div>
									<span className="text-xs text-fg-muted tabular-nums">
										{formatDateTime(creationTime, { dateStyle: "short", timeStyle: "short" })}
									</span>
								</div>
							</div>
						);
					})}
				</div>
			</div>
		</Skeleton>
	);
}
