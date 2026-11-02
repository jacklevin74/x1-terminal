import { Button, Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@hypeterminal/ui";
import { t } from "@lingui/core/macro";
import { useMemo } from "react";
import { useConnection } from "wagmi";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { TimeTicker } from "@/components/ui/time-ticker";
import { HL_ALL_DEXS } from "@/config/app";
import { getAvgPrice } from "@/domain/market";
import { cn } from "@/lib/cn";
import { formatDateTime, formatDuration, formatNumber, formatPrice } from "@/lib/format";
import { useExchange, useMarkets, useSubscription } from "@/lib/hyperliquid";
import { toBig } from "@/lib/trade/numbers";
import { useExchangeScope } from "@/providers/exchange-scope";
import { useMarketActions } from "@/stores/use-market-store";
import { AssetBadge } from "../components/asset-badge";
import { AccountTableToolbar } from "./account-table-toolbar";
import { ConnectPlaceholder } from "./connect-placeholder";
import { LoadingRows } from "./loading-rows";
import { Placeholder } from "./placeholder";
import {
	accountCellClass,
	accountHeadClass,
	accountNumCellClass,
	accountNumHeadClass,
	accountRowClass,
	accountTableClass,
	accountTableShellClass,
	accountTabRootClass,
} from "./positions-panel-table-styles";

export function TwapTab() {
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

	const activeCount = activeOrders.length;

	const headerCount = isConnected ? `${activeCount} ${t`active`}` : null;

	const twapStatesStatus = twapStatesEvent ? "active" : "loading";

	function renderPlaceholder() {
		if (!isConnected) return <ConnectPlaceholder message={t`Connect your wallet to view TWAP orders.`} />;
		if (twapStatesStatus === "loading") return <LoadingRows label={t`Loading TWAP orders...`} />;
		if (activeOrders.length === 0) return <Placeholder>{t`No active TWAP orders.`}</Placeholder>;
		return null;
	}

	const placeholder = renderPlaceholder();

	const headings = [
		{ label: t`Asset`, numeric: false },
		{ label: t`Size`, numeric: true },
		{ label: t`Executed`, numeric: true },
		{ label: t`Avg Price`, numeric: true },
		{ label: t`Time / Total`, numeric: false },
		{ label: t`Reduce Only`, numeric: false },
		{ label: t`Created`, numeric: false },
		{ label: t`Actions`, numeric: true },
	];

	return (
		<div className={accountTabRootClass}>
			<AccountTableToolbar tab="twap">
				{headerCount ? <span className="tabular-nums text-xs text-fg-muted">{headerCount}</span> : null}
			</AccountTableToolbar>
			<div className={accountTableShellClass}>
				{placeholder ?? (
					<ScrollArea className="min-h-0 w-full flex-1">
						<Table className={accountTableClass}>
							<TableHeader>
								<TableRow>
									{headings.map((heading) => (
										<TableHead
											key={heading.label}
											scope="col"
											className={cn(accountHeadClass, heading.numeric && accountNumHeadClass)}
										>
											{heading.label}
										</TableHead>
									))}
								</TableRow>
							</TableHeader>
							<TableBody>
								{activeOrders.map(({ twapId, state }) => {
									const isBuy = state.side === "B";
									const totalSize = toBig(state.sz)?.toNumber() ?? Number.NaN;
									const executedSize = toBig(state.executedSz)?.toNumber() ?? 0;
									const avgPrice = getAvgPrice(state.executedNtl, state.executedSz);
									const szDecimals = markets.getSzDecimals(state.coin);
									const creationTime = state.timestamp;
									const totalMinutes = state.minutes;

									return (
										<TableRow key={twapId} className={accountRowClass}>
											<TableCell className={accountCellClass}>
												<AssetBadge
													appearance="position"
													coin={state.coin}
													side={isBuy ? "buy" : "sell"}
													onClick={() => setSelectedMarket(scope, state.coin)}
													aria-label={
														isBuy
															? t`Switch to ${state.coin} market, buy TWAP`
															: t`Switch to ${state.coin} market, sell TWAP`
													}
												/>
											</TableCell>
											<TableCell className={numCellClass}>{formatNumber(totalSize, szDecimals)}</TableCell>
											<TableCell className={cn(numCellClass, isBuy ? "text-market-up" : "text-market-down")}>
												{formatNumber(executedSize, szDecimals)}
											</TableCell>
											<TableCell className={numCellClass}>{formatPrice(avgPrice, { szDecimals })}</TableCell>
											<TableCell className={accountCellClass}>
												<TimeTicker startTime={creationTime} durationMs={totalMinutes * 60 * 1000} isActive={true} /> /{" "}
												{formatDuration(totalMinutes)}
											</TableCell>
											<TableCell className={accountCellClass}>{state.reduceOnly ? t`Yes` : t`No`}</TableCell>
											<TableCell className={accountCellClass}>
												{formatDateTime(creationTime, {
													day: "2-digit",
													month: "2-digit",
													year: "numeric",
													hour: "2-digit",
													minute: "2-digit",
													second: "2-digit",
													hour12: false,
												})}
											</TableCell>
											<TableCell className={numCellClass}>
												<Button
													variant="secondary"
													intent="neutral"
													size="xs"
													aria-label={t`Cancel TWAP order`}
													disabled={isCancelling}
													onClick={() => {
														const assetId = markets.getAssetId(state.coin);
														if (typeof assetId !== "number") return;
														cancelTwap({ a: assetId, t: twapId });
													}}
												>
													{t`Cancel`}
												</Button>
											</TableCell>
										</TableRow>
									);
								})}
							</TableBody>
						</Table>
						<ScrollBar orientation="horizontal" />
					</ScrollArea>
				)}
			</div>
		</div>
	);
}

const numCellClass = cn(accountCellClass, accountNumCellClass);
