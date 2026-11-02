import { t } from "@lingui/core/macro";
import { Skeleton } from "boneyard-js/react";
import { useConnection } from "wagmi";
import { FALLBACK_VALUE_PLACEHOLDER } from "@/config/app";
import { MAX_HISTORY_ROWS } from "@/config/trade";
import { cn } from "@/lib/cn";
import { formatDateTimeShort, formatPercent, formatToken, formatUSD } from "@/lib/format";
import { useMarkets, useSubscription } from "@/lib/hyperliquid";
import { toNumber, toNumberOrZero } from "@/lib/trade/numbers";
import { getValueColorClass } from "@/lib/ui/value-color";
import { useExchangeScope } from "@/providers/exchange-scope";
import { useMarketActions } from "@/stores/use-market-store";
import { AssetBadge } from "../components/asset-badge";
import { MetricCell } from "./metric-cell";

interface Props {
	className?: string;
}

export function MobileFundingTab({ className }: Props) {
	const { address, isConnected } = useConnection();
	const { scope } = useExchangeScope();
	const { setSelectedMarket } = useMarketActions();
	const {
		data: fundingEvent,
		status,
		error,
	} = useSubscription("userFundings", { user: address ?? "0x0" }, { enabled: isConnected && !!address });
	const markets = useMarkets();

	const updates = fundingEvent?.fundings?.slice(0, MAX_HISTORY_ROWS).sort((a, b) => b.time - a.time) ?? [];
	const totalFunding = updates.reduce((acc, f) => acc + toNumberOrZero(f.usdc), 0);
	const headerTotal =
		isConnected && status === "active"
			? formatUSD(totalFunding, { signDisplay: "exceptZero" })
			: FALLBACK_VALUE_PLACEHOLDER;
	const headerClass = getValueColorClass(totalFunding);

	if (!isConnected) {
		return (
			<div className="flex-1 flex items-center justify-center px-3 py-6 text-center text-xs text-fg-muted">
				{t`Connect your wallet to view funding payments.`}
			</div>
		);
	}

	if (status === "error") {
		return (
			<div className="flex-1 flex flex-col items-center justify-center px-3 py-6 text-center text-xs text-market-down">
				<span>{t`Failed to load funding history.`}</span>
				{error instanceof Error && <span className="mt-1 text-xs text-fg-muted">{error.message}</span>}
			</div>
		);
	}

	if (status === "active" && updates.length === 0) {
		return (
			<div className="flex-1 flex items-center justify-center px-3 py-6 text-center text-xs text-fg-muted">
				{t`No funding payments found.`}
			</div>
		);
	}

	return (
		<Skeleton name="funding-tab" loading={status === "subscribing" || status === "idle"}>
			<div className={cn("flex-1 min-h-0 flex flex-col", className)}>
				<div className="shrink-0 h-10 px-3 flex items-center justify-between gap-2">
					<span className="text-2xs uppercase tracking-micro text-fg-muted">{t`Funding History`}</span>
					<span className={cn("text-xs tabular-nums", headerClass)}>{headerTotal}</span>
				</div>
				<div className="flex-1 min-h-0 overflow-y-auto divide-y divide-stroke-faint border-t border-stroke-faint">
					{updates.map((update) => {
						const market = markets.getMarket(update.coin);
						const szi = toNumber(update.szi);
						const rate = toNumber(update.fundingRate);
						const usdc = toNumber(update.usdc);
						const positionSize = szi !== null ? Math.abs(szi) : null;

						return (
							<div key={`${update.coin}-${update.time}-${update.usdc}`} className="flex flex-col gap-3 px-3 py-3">
								<div className="flex items-center justify-between gap-2">
									<AssetBadge
										coin={update.coin}
										onClick={() => setSelectedMarket(scope, update.coin)}
										aria-label={t`Switch to ${update.coin} market`}
										appearance="plain"
										className="min-h-8"
										nameClassName="text-base font-medium text-fg"
									/>
									<div className={cn("text-xs font-medium tabular-nums", getValueColorClass(usdc))}>
										{formatToken(usdc, { symbol: "USDC" })}
									</div>
								</div>

								<div className="grid grid-cols-3 gap-3">
									<MetricCell
										label={t`Position`}
										value={formatToken(positionSize, { decimals: market?.szDecimals, symbol: market?.shortName })}
									/>
									<MetricCell
										label={t`Rate`}
										value={formatPercent(rate, { minimumFractionDigits: 4, maximumFractionDigits: 4 })}
										valueClass={rate !== null ? getValueColorClass(rate) : undefined}
									/>
									<MetricCell label={t`Time`} value={formatDateTimeShort(update.time)} align="end" />
								</div>
							</div>
						);
					})}
				</div>
			</div>
		</Skeleton>
	);
}
