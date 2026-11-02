import { t } from "@lingui/core/macro";
import { ArrowSquareOutIcon } from "@phosphor-icons/react";
import { Skeleton } from "boneyard-js/react";
import { useConnection } from "wagmi";
import { FALLBACK_VALUE_PLACEHOLDER } from "@/config/app";
import { MAX_HISTORY_ROWS } from "@/config/trade";
import { cn } from "@/lib/cn";
import { getHyperliquidTxUrl as getExplorerTxUrl } from "@/lib/explorer";
import { formatDateTimeShort, formatNumber, formatToken, formatUSD } from "@/lib/format";
import { useMarkets, useSubscription } from "@/lib/hyperliquid";
import { toNumber } from "@/lib/trade/numbers";
import { getValueColorClass } from "@/lib/ui/value-color";
import { useExchangeScope } from "@/providers/exchange-scope";
import { useMarketActions } from "@/stores/use-market-store";
import { AssetBadge } from "../components/asset-badge";
import { MetricCell } from "./metric-cell";

interface Props {
	className?: string;
}

export function MobileHistoryTab({ className }: Props) {
	const { address, isConnected } = useConnection();
	const { scope } = useExchangeScope();
	const { setSelectedMarket } = useMarketActions();
	const markets = useMarkets();
	const {
		data: fillsEvent,
		status,
		error,
	} = useSubscription(
		"userFills",
		{ user: address ?? "0x0", aggregateByTime: true },
		{ enabled: isConnected && !!address },
	);

	const fills = fillsEvent?.fills?.slice(0, MAX_HISTORY_ROWS).sort((a, b) => b.time - a.time) ?? [];
	const headerCount = isConnected ? `${fills.length}` : FALLBACK_VALUE_PLACEHOLDER;

	if (!isConnected) {
		return (
			<div className="flex-1 flex items-center justify-center px-3 py-6 text-center text-xs text-fg-muted">
				{t`Connect your wallet to view trade history.`}
			</div>
		);
	}

	if (status === "error") {
		return (
			<div className="flex-1 flex flex-col items-center justify-center px-3 py-6 text-center text-xs text-market-down">
				<span>{t`Failed to load trade history.`}</span>
				{error instanceof Error && <span className="mt-1 text-xs text-fg-muted">{error.message}</span>}
			</div>
		);
	}

	if (status === "active" && fills.length === 0) {
		return (
			<div className="flex-1 flex items-center justify-center px-3 py-6 text-center text-xs text-fg-muted">{t`No fills found.`}</div>
		);
	}

	return (
		<Skeleton name="history-tab" loading={status === "subscribing" || status === "idle"}>
			<div className={cn("flex-1 min-h-0 flex flex-col", className)}>
				<div className="shrink-0 h-10 px-3 flex items-center justify-between gap-2">
					<span className="text-2xs uppercase tracking-micro text-fg-muted">{t`Trade History`}</span>
					<span className="text-xs tabular-nums text-fg">{headerCount}</span>
				</div>
				<div className="flex-1 min-h-0 overflow-y-auto divide-y divide-stroke-faint border-t border-stroke-faint">
					{fills.map((fill) => {
						const fee = toNumber(fill.fee);
						const closedPnl = toNumber(fill.closedPnl);
						const showPnl = closedPnl !== null && closedPnl !== 0;
						const isLiquidation = !!fill.liquidation;
						const isBuy = fill.dir.startsWith("Open Long") || fill.dir.startsWith("Close Short");
						const explorerUrl = getExplorerTxUrl(fill.hash);

						return (
							<div key={`${fill.hash}-${fill.tid}`} className="flex flex-col gap-3 px-3 py-3">
								<div className="flex items-center justify-between gap-2">
									<div className="flex items-center gap-2">
										<AssetBadge
											coin={fill.coin}
											side={isBuy ? "buy" : "sell"}
											onClick={() => setSelectedMarket(scope, fill.coin)}
											appearance="plain"
											className="min-h-8"
											nameClassName="text-base font-medium text-fg"
										/>
										<span className={cn("text-xs font-medium", getFillDirectionClass(isLiquidation, isBuy))}>
											{isLiquidation ? t`Liquidated` : fill.dir}
										</span>
									</div>
									{showPnl && (
										<div className={cn("text-xs font-medium tabular-nums", getValueColorClass(closedPnl))}>
											{formatUSD(closedPnl, { signDisplay: "exceptZero" })}
										</div>
									)}
								</div>

								<div className="grid grid-cols-3 gap-3">
									<MetricCell label={t`Price`} value={formatUSD(fill.px)} />
									<MetricCell label={t`Size`} value={formatNumber(fill.sz, markets.getSzDecimals(fill.coin))} />
									<MetricCell
										label={t`Fee`}
										align="end"
										value={formatToken(fill.fee, { symbol: fill.feeToken })}
										valueClass={fee !== null ? getValueColorClass(fee) : undefined}
									/>
								</div>

								<div className="flex items-center justify-between gap-2">
									<span className="text-xs text-fg-muted tabular-nums">{formatDateTimeShort(fill.time)}</span>
									{explorerUrl && (
										<a
											href={explorerUrl}
											target="_blank"
											rel="noopener noreferrer"
											className="-mr-1 inline-flex min-h-8 items-center gap-1 rounded-8 px-1 text-xs text-fg-muted transition-colors duration-150 hover:text-fg active:text-fg touch-manipulation motion-reduce:transition-none"
										>
											{t`Explorer`}
											<ArrowSquareOutIcon className="size-3" aria-hidden="true" />
										</a>
									)}
								</div>
							</div>
						);
					})}
				</div>
			</div>
		</Skeleton>
	);
}

function getFillDirectionClass(isLiquidation: boolean, isBuy: boolean): string {
	if (isLiquidation || !isBuy) return "text-market-down";
	return "text-market-up";
}
