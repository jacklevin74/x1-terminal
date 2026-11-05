import { Button, ButtonIcon, Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@hypeterminal/ui";
import { t } from "@lingui/core/macro";
import { ArrowSquareOutIcon } from "@phosphor-icons/react";
import { useMemo, useState } from "react";
import { hyperEvm } from "viem/chains";
import { useConnection } from "wagmi";
import { CopyStateIcon } from "@/components/ui/copy-state-icon";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { DEFAULT_QUOTE_TOKEN, HL_ALL_DEXS } from "@/config/app";
import { SMALL_BALANCE_THRESHOLD_USD } from "@/config/trade";
import { type BalanceRow, getPerpBalanceRows, getSpotBalanceRows, getTotalUsdValue } from "@/domain/trade/balances";
import { useDefaultDexBalances } from "@/hooks/trade/use-account-balances";
import { useCopyToClipboard } from "@/hooks/ui/use-copy-to-clipboard";
import { cn } from "@/lib/cn";
import { formatToken, formatUSD } from "@/lib/format";
import { useSubscription } from "@/lib/hyperliquid";
import { useSpotTokens } from "@/lib/hyperliquid/markets/use-spot-tokens";
import { hasUnifiedSpotBalance } from "@/lib/trade/account-mode";
import { toNumberOrZero } from "@/lib/trade/numbers";
import { useSwapModalActions } from "@/stores/use-global-modal-store";
import { useGlobalSettingsActions, useHideSmallBalances } from "@/stores/use-global-settings-store";
import { AssetDisplay } from "../components/asset-display";
import { NativeWithdrawModal } from "../tradebox/deposit/native-withdraw-modal";
import { AccountFilterSelect } from "./account-filter-select";
import { AccountTableToolbar } from "./account-table-toolbar";
import { ConnectPlaceholder } from "./connect-placeholder";
import { LoadingRows } from "./loading-rows";
import { Placeholder } from "./placeholder";
import {
	accountCellClass,
	accountFilteredEmptyClass,
	accountHeadClass,
	accountInlineErrorClass,
	accountNumCellClass,
	accountNumHeadClass,
	accountRowClass,
	accountTableClass,
	accountTableShellClass,
	accountTabRootClass,
	accountTextLinkClass,
	getAriaSort,
	getMarketValueClass,
} from "./positions-panel-table-styles";
import { SortHeadButton } from "./sort-head-button";
import { ToolbarCheckbox } from "./toolbar-checkbox";
import { TransferModal } from "./transfer-modal";

type TransferDirection = "toSpot" | "toPerp";

export function BalancesTab() {
	const { isConnected, connector } = useConnection();
	const { getToken } = useSpotTokens();
	const [assetFilter, setAssetFilter] = useState("");
	const [descending, setDescending] = useState(true);
	const [copyError, setCopyError] = useState<string | null>(null);
	const [copiedContract, setCopiedContract] = useState<string | null>(null);
	const { copied, copy } = useCopyToClipboard();
	const hideSmallBalances = useHideSmallBalances();
	const { setHideSmallBalances } = useGlobalSettingsActions();
	const { open: openSwapModal } = useSwapModalActions();
	const [transferState, setTransferState] = useState<{
		open: boolean;
		direction: TransferDirection;
	}>({
		open: false,
		direction: "toSpot",
	});
	const [withdrawAsset, setWithdrawAsset] = useState<"SOL" | "ETH" | null>(null);

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

	const visibleBalances = balances
		.filter(
			(row) =>
				(!assetFilter || row.asset === assetFilter) &&
				(!hideSmallBalances || Number(row.usdValue) >= SMALL_BALANCE_THRESHOLD_USD),
		)
		.slice()
		.sort((a, b) => (descending ? -1 : 1) * (Number(a.usdValue) - Number(b.usdValue)));

	const totalValue = useMemo(() => getTotalUsdValue(balances), [balances]);

	function handleTransferClick(row: BalanceRow) {
		if (row.asset !== DEFAULT_QUOTE_TOKEN) return;
		const direction: TransferDirection = row.type === "perp" ? "toSpot" : "toPerp";
		setTransferState({
			open: true,
			direction,
		});
	}

	function getWithdrawAsset(asset: string): "SOL" | "ETH" {
		if (asset === "UETH" || asset === "ETH") return "ETH";
		if (asset === "USOL" || asset === "SOL") return "SOL";
		return connector?.id === "phantom" ? "ETH" : "SOL";
	}

	function getPerpTag(shared: boolean): string {
		if (!shared) return "Perps";
		return accountAbstraction === "portfolioMargin" ? "Portfolio" : "Unified";
	}

	async function copyContract(contract: string) {
		setCopyError(null);
		setCopiedContract(contract);
		await copy(contract, () => setCopyError("Could not copy the contract address."));
	}

	function renderBalanceRow(row: BalanceRow) {
		const token = getToken(row.asset);
		const symbol = token?.displayName ?? row.asset;
		const decimals = row.type === "perp" ? 6 : Math.min(token?.weiDecimals ?? token?.szDecimals ?? 8, 12);
		const available = Number(row.available) > 0;
		const shared = hasUnifiedSpotBalance(accountAbstraction);
		const canTransfer = !shared && row.asset === DEFAULT_QUOTE_TOKEN && available;
		const pnl = getPnl(row);
		const contract = token?.evmContract?.address;
		return (
			<TableRow key={`${row.type}:${row.asset}`} className={accountRowClass}>
				<TableCell className={accountCellClass}>
					<AssetDisplay coin={row.asset} hideIcon nameClassName="font-medium" />
					{row.type === "perp" && <span className="ml-1 text-fg-muted">{getPerpTag(shared)}</span>}
				</TableCell>
				<TableCell className={numCellClass}>
					{formatToken(row.total, { decimals, minimumFractionDigits: 0, symbol, compact: false })}
				</TableCell>
				<TableCell className={numCellClass}>
					<span
						title="Available after order holds and applicable margin requirements."
						className="underline decoration-fg-muted decoration-dashed underline-offset-4"
					>
						{formatToken(row.available, { decimals, minimumFractionDigits: 0, symbol, compact: false })}
					</span>
				</TableCell>
				<TableCell className={numCellClass}>{formatUSD(row.usdValue, { compact: false })}</TableCell>
				<TableCell className={numCellClass}>
					{pnl ? (
						<span className={getMarketValueClass(pnl.pnl)}>
							{formatUSD(pnl.pnl, { compact: false, signDisplay: "exceptZero" })} ({pnl.pnlPercent >= 0 ? "+" : ""}
							{pnl.pnlPercent.toFixed(1)}%)
						</span>
					) : (
						"--"
					)}
				</TableCell>
				<TableCell className={accountCellClass}>
					{Number(row.total) > 0 && (
						<Button
							variant="secondary"
							intent="neutral"
							size="xs"
							onClick={() => setWithdrawAsset(getWithdrawAsset(row.asset))}
						>
							Withdraw
						</Button>
					)}
				</TableCell>
				<TableCell className={accountCellClass}>
					{canTransfer && (
						<Button variant="secondary" intent="neutral" size="xs" onClick={() => handleTransferClick(row)}>
							{row.type === "perp" ? "To Spot" : "To Perps"}
						</Button>
					)}
					{shared && row.asset === DEFAULT_QUOTE_TOKEN && (
						<span className="text-fg-muted" title="Spot and perps already use this same balance.">
							Shared balance
						</span>
					)}
				</TableCell>
				<TableCell className={accountCellClass}>
					{contract ? (
						<span className="inline-flex items-center gap-2">
							<a
								href={`${hyperEvm.blockExplorers.default.url}/address/${contract}`}
								title={contract}
								target="_blank"
								rel="noopener noreferrer"
								className={accountTextLinkClass}
							>
								{contract.slice(0, 6)}…{contract.slice(-4)}
								<ArrowSquareOutIcon className="size-3 text-fg-muted" />
							</a>
							<ButtonIcon
								variant="ghost"
								intent="neutral"
								size="xxs"
								aria-label={`Copy ${symbol} contract address`}
								className="text-fg-muted hover:text-fg"
								onClick={() => void copyContract(contract)}
							>
								<CopyStateIcon copied={copied && copiedContract === contract} className="size-3" />
							</ButtonIcon>
						</span>
					) : (
						"--"
					)}
				</TableCell>
				<TableCell className={cn(accountCellClass, "text-right")}>
					{(row.type === "spot" || shared) && available && (
						<Button variant="secondary" intent="neutral" size="xs" onClick={() => openSwapModal(row.asset)}>
							Swap
						</Button>
					)}
				</TableCell>
			</TableRow>
		);
	}

	function renderPlaceholder() {
		if (!isConnected) return <ConnectPlaceholder message={t`Connect your wallet to view balances.`} />;
		if (isLoading) return <LoadingRows label={t`Loading balances...`} />;
		if (hasError) return <Placeholder variant="error">{t`Failed to load balances.`}</Placeholder>;
		if (balances.length === 0)
			return <Placeholder>{t`No balances found. Deposit funds to start trading.`}</Placeholder>;
		return null;
	}

	const placeholder = renderPlaceholder();

	const headings = [
		{ label: "Asset", numeric: false },
		{ label: "Total Balance", numeric: true },
		{ label: "Available Balance", numeric: true },
		{ label: "USDC Value", numeric: true },
		{ label: "PNL (ROE %)", numeric: true },
		{ label: "Withdraw", numeric: false },
		{ label: "Transfer", numeric: false },
		{ label: "Contract", numeric: false },
		{ label: "Swap", numeric: true },
	];

	function renderHeadContent(label: string) {
		if (label === "USDC Value") {
			return <SortHeadButton label={label} descending={descending} onToggle={() => setDescending((v) => !v)} />;
		}
		if (label === "PNL (ROE %)") {
			return (
				<span
					title="Spot unrealized PNL relative to the recorded cost basis, as a percentage of that cost basis."
					className="underline decoration-fg-muted decoration-dashed underline-offset-4"
				>
					{label}
				</span>
			);
		}
		return label;
	}

	return (
		<div className={accountTabRootClass}>
			<AccountTableToolbar tab="balances">
				<AccountFilterSelect
					label="Asset"
					ariaLabel="Balances asset filter"
					value={assetFilter}
					options={[...new Set(balances.map((b) => b.asset))].map((asset) => ({
						value: asset,
						label: getToken(asset)?.displayName ?? asset,
					}))}
					onChange={setAssetFilter}
				/>
				<ToolbarCheckbox
					label="Hide Small Balances"
					checked={hideSmallBalances}
					onCheckedChange={setHideSmallBalances}
				/>
				{isConnected && !isLoading && (
					<span className="text-xs tabular-nums text-fg-muted">{formatUSD(totalValue, { compact: false })}</span>
				)}
			</AccountTableToolbar>
			{copyError && (
				<p role="alert" className={accountInlineErrorClass}>
					{copyError}
				</p>
			)}
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
											aria-sort={getAriaSort(heading.label === "USDC Value", descending)}
										>
											{renderHeadContent(heading.label)}
										</TableHead>
									))}
								</TableRow>
							</TableHeader>
							<TableBody>{visibleBalances.map(renderBalanceRow)}</TableBody>
						</Table>
						<ScrollBar orientation="horizontal" />
					</ScrollArea>
				)}
			</div>
			{!placeholder && !visibleBalances.length && (
				<p className={accountFilteredEmptyClass}>No balances match these filters.</p>
			)}
			<TransferModal
				open={transferState.open}
				onOpenChange={(open) => setTransferState((prev) => ({ ...prev, open }))}
				initialDirection={transferState.direction}
			/>
			{withdrawAsset && <NativeWithdrawModal initialAsset={withdrawAsset} onClose={() => setWithdrawAsset(null)} />}
		</div>
	);
}

const numCellClass = cn(accountCellClass, accountNumCellClass);
