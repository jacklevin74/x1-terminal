import { Button, Checkbox } from "@hypeterminal/ui";
import { t } from "@lingui/core/macro";
import { ArrowsDownUpIcon, ArrowsLeftRightIcon, PaperPlaneTiltIcon } from "@phosphor-icons/react";
import { Skeleton } from "boneyard-js/react";
import { useMemo, useState } from "react";
import { useConnection } from "wagmi";
import { DEFAULT_QUOTE_TOKEN, HL_ALL_DEXS } from "@/config/app";
import { SMALL_BALANCE_THRESHOLD_USD } from "@/config/trade";
import {
	type BalanceRow,
	filterBalanceRowsByUsdValue,
	getPerpBalanceRows,
	getSpotBalanceRows,
	getTotalUsdValue,
} from "@/domain/trade/balances";
import { useDefaultDexBalances } from "@/hooks/trade/use-account-balances";
import { cn } from "@/lib/cn";
import { formatToken, formatUSD } from "@/lib/format";
import { useSubscription } from "@/lib/hyperliquid";
import { useSpotTokens } from "@/lib/hyperliquid/markets/use-spot-tokens";
import { toNumberOrZero } from "@/lib/trade/numbers";
import { useSwapModalActions } from "@/stores/use-global-modal-store";
import { useGlobalSettingsActions, useHideSmallBalances } from "@/stores/use-global-settings-store";
import { AssetDisplay } from "../components/asset-display";
import { SendModal } from "../positions/send-modal";
import { TransferModal } from "../positions/transfer-modal";
import { MetricCell } from "./metric-cell";

type TransferDirection = "toSpot" | "toPerp";

interface Props {
	className?: string;
}

export function MobileBalancesTab({ className }: Props) {
	const { isConnected } = useConnection();
	const { getToken } = useSpotTokens();
	const hideSmallBalances = useHideSmallBalances();
	const { setHideSmallBalances } = useGlobalSettingsActions();
	const { open: openSwapModal } = useSwapModalActions();
	const [transferState, setTransferState] = useState<{ open: boolean; direction: TransferDirection }>({
		open: false,
		direction: "toSpot",
	});
	const [sendState, setSendState] = useState<{ open: boolean; asset: string; accountType: "perp" | "spot" }>({
		open: false,
		asset: DEFAULT_QUOTE_TOKEN,
		accountType: "spot",
	});

	const { perpSummary, spotBalances, spotAvailableAfterMaintenance, accountAbstraction, isLoading, hasError } =
		useDefaultDexBalances();
	const { data: allMidsEvent } = useSubscription("allMids", { dex: HL_ALL_DEXS }, { enabled: isConnected });
	const mids = allMidsEvent?.mids;

	const perpBalances = useMemo(
		() => getPerpBalanceRows(perpSummary, spotBalances, spotAvailableAfterMaintenance, accountAbstraction),
		[accountAbstraction, perpSummary, spotBalances, spotAvailableAfterMaintenance],
	);
	const spotBalanceRows = useMemo(
		() => getSpotBalanceRows(spotBalances, spotAvailableAfterMaintenance, accountAbstraction),
		[accountAbstraction, spotBalances, spotAvailableAfterMaintenance],
	);
	const balances = useMemo(() => [...perpBalances, ...spotBalanceRows], [perpBalances, spotBalanceRows]);
	const filteredPerpBalances = useMemo(() => {
		if (!hideSmallBalances) return perpBalances;
		return filterBalanceRowsByUsdValue(perpBalances, SMALL_BALANCE_THRESHOLD_USD);
	}, [hideSmallBalances, perpBalances]);
	const filteredSpotBalances = useMemo(() => {
		if (!hideSmallBalances) return spotBalanceRows;
		return filterBalanceRowsByUsdValue(spotBalanceRows, SMALL_BALANCE_THRESHOLD_USD);
	}, [hideSmallBalances, spotBalanceRows]);

	const totalValue = useMemo(() => getTotalUsdValue(balances), [balances]);

	function getPnl(row: BalanceRow): { pnl: number; pnlPercent: number } | null {
		if (row.type === "perp") return null;
		const entryNtl = toNumberOrZero(row.entryNtl);
		if (entryNtl === 0) return null;
		const midPx = toNumberOrZero(mids?.[row.asset]);
		if (midPx === 0) return null;
		const total = toNumberOrZero(row.total);
		const currentValue = total * midPx;
		const pnl = currentValue - entryNtl;
		const pnlPercent = (pnl / entryNtl) * 100;
		return { pnl, pnlPercent };
	}

	function handleTransferClick(row: BalanceRow) {
		if (row.asset !== DEFAULT_QUOTE_TOKEN) return;
		setTransferState({ open: true, direction: row.type === "perp" ? "toSpot" : "toPerp" });
	}

	function handleSendClick(row: BalanceRow) {
		setSendState({ open: true, asset: row.asset, accountType: row.type });
	}

	if (!isConnected) {
		return (
			<div className="flex-1 flex items-center justify-center px-3 py-6 text-center text-xs text-fg-muted">
				{t`Connect your wallet to view balances.`}
			</div>
		);
	}

	if (hasError) {
		return (
			<div className="flex-1 flex items-center justify-center px-3 py-6 text-center text-xs text-market-down">
				{t`Failed to load balances.`}
			</div>
		);
	}

	if (!isLoading && balances.length === 0) {
		return (
			<div className="flex-1 flex items-center justify-center px-3 py-6 text-center text-xs text-fg-muted">
				{t`No balances found. Deposit funds to start trading.`}
			</div>
		);
	}

	function renderBalanceCard(row: BalanceRow) {
		const token = getToken(row.asset);
		const decimals = row.type === "perp" ? 2 : (token?.szDecimals ?? 2);
		const canTransfer = row.asset === DEFAULT_QUOTE_TOKEN && parseFloat(row.available) > 0;
		const canSwap = row.type === "spot" && parseFloat(row.available) > 0;
		const canSend = parseFloat(row.available) > 0;
		const transferLabel = row.type === "perp" ? t`To Spot` : t`To Perp`;
		const pnlData = getPnl(row);

		return (
			<div key={`${row.type}-${row.asset}`} className="flex flex-col gap-3 px-3 py-3">
				<div className="flex items-center justify-between gap-2">
					<AssetDisplay coin={row.asset} nameClassName="text-base font-medium text-fg" />
					<div className="text-right">
						<div className="text-xs font-medium tabular-nums text-fg">{formatUSD(row.usdValue, { compact: true })}</div>
						{pnlData && (
							<div className={cn("text-xs tabular-nums", pnlData.pnl >= 0 ? "text-market-up" : "text-market-down")}>
								{pnlData.pnl >= 0 ? "+" : ""}
								{formatUSD(pnlData.pnl, { compact: true })} ({pnlData.pnlPercent >= 0 ? "+" : ""}
								{pnlData.pnlPercent.toFixed(1)}%)
							</div>
						)}
					</div>
				</div>

				<div className="grid grid-cols-2 gap-3">
					<MetricCell label={t`Available`} value={formatToken(row.available, decimals)} />
					<MetricCell label={t`Total`} value={formatToken(row.total, decimals)} align="end" />
				</div>

				{(canTransfer || canSwap || canSend) && (
					<div className="flex items-center gap-2">
						{canTransfer && (
							<Button
								variant="secondary"
								intent="neutral"
								size="sm"
								className="flex-1"
								onClick={() => handleTransferClick(row)}
								iconLeft={<ArrowsLeftRightIcon className="size-3.5" />}
							>
								{transferLabel}
							</Button>
						)}
						{canSwap && (
							<Button
								variant="secondary"
								intent="neutral"
								size="sm"
								className="flex-1"
								onClick={() => openSwapModal(row.asset)}
								iconLeft={<ArrowsDownUpIcon className="size-3.5" />}
							>
								{t`Swap`}
							</Button>
						)}
						{canSend && (
							<Button
								variant="secondary"
								intent="neutral"
								size="sm"
								className="flex-1"
								onClick={() => handleSendClick(row)}
								iconLeft={<PaperPlaneTiltIcon className="size-3.5" />}
							>
								{t`Send`}
							</Button>
						)}
					</div>
				)}
			</div>
		);
	}

	return (
		<Skeleton name="balances-tab" loading={isLoading}>
			<div className={cn("flex-1 min-h-0 flex flex-col", className)}>
				<div className="shrink-0 h-10 px-3 flex items-center gap-2">
					<span className="text-2xs uppercase tracking-micro text-fg-muted">{t`Account Balances`}</span>
					<span className="text-xs font-medium tabular-nums text-fg">{formatUSD(totalValue, { compact: true })}</span>
					<span className="ml-auto inline-flex min-h-8 items-center">
						<Checkbox
							checked={hideSmallBalances}
							onCheckedChange={(checked: boolean | "indeterminate") => setHideSmallBalances(Boolean(checked))}
							label={t`Hide small`}
						/>
					</span>
				</div>
				<div className="flex-1 min-h-0 overflow-y-auto">
					{filteredPerpBalances.length > 0 && (
						<section>
							<h3 className="h-6 px-3 flex items-center bg-band text-2xs font-normal uppercase tracking-micro text-fg-muted">
								{t`Perpetuals`}
							</h3>
							<div className="divide-y divide-stroke-faint">{filteredPerpBalances.map(renderBalanceCard)}</div>
						</section>
					)}
					{filteredSpotBalances.length > 0 && (
						<section>
							<h3 className="h-6 px-3 flex items-center bg-band text-2xs font-normal uppercase tracking-micro text-fg-muted">
								{t`Spot`}
							</h3>
							<div className="divide-y divide-stroke-faint">{filteredSpotBalances.map(renderBalanceCard)}</div>
						</section>
					)}
				</div>

				<TransferModal
					open={transferState.open}
					onOpenChange={(open) => setTransferState((prev) => ({ ...prev, open }))}
					initialDirection={transferState.direction}
				/>
				<SendModal
					open={sendState.open}
					onOpenChange={(open) => setSendState((prev) => ({ ...prev, open }))}
					initialAsset={sendState.asset}
					initialAccountType={sendState.accountType}
				/>
			</div>
		</Skeleton>
	);
}
