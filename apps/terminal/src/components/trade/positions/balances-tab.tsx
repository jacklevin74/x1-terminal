import { hasUnifiedSpotBalance } from "@/lib/trade/account-mode";
import { AccountTableToolbar } from "./account-table-toolbar";
import { Checkbox, Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@hypeterminal/ui";
import { t } from "@lingui/core/macro";
import { ArrowSquareOutIcon, CopyIcon } from "@phosphor-icons/react";
import { useMemo, useState } from "react";
import { useConnection } from "wagmi";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { hyperEvm } from "viem/chains";
import { DEFAULT_QUOTE_TOKEN, HL_ALL_DEXS } from "@/config/app";
import { SMALL_BALANCE_THRESHOLD_USD } from "@/config/trade";
import {
	type BalanceRow,
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
import { Placeholder } from "./placeholder";
import {
	positionViewRowClass as positionsPanelRowHoverClass,

	positionViewBodyClass as positionsPanelTableBodyClass,
	positionViewCellClass as positionsPanelTableCellClass,
	positionViewHeadClass as positionsPanelTableHeadClass,
 positionsPanelTableLayoutClass,
	positionViewHeaderClass as positionsPanelTableHeaderClass,
	positionsPanelTableShellClass,
	positionsPanelTabRootClass,
} from "./positions-panel-table-styles";
import { NativeWithdrawModal } from "../tradebox/deposit/native-withdraw-modal";
import { TransferModal } from "./transfer-modal";

type TransferDirection = "toSpot" | "toPerp";

export function BalancesTab() {
	const { isConnected, connector } = useConnection();
	const { getToken } = useSpotTokens();
 const [assetFilter, setAssetFilter] = useState("");
 const [descending, setDescending] = useState(true);
 const [copyError, setCopyError] = useState<string | null>(null);
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

 const visibleBalances = balances.filter(row => (!assetFilter || row.asset === assetFilter) && (!hideSmallBalances || Number(row.usdValue) >= SMALL_BALANCE_THRESHOLD_USD)).slice().sort((a, b) => (descending ? -1 : 1) * (Number(a.usdValue) - Number(b.usdValue)));

	const totalValue = useMemo(() => getTotalUsdValue(balances), [balances]);

	function handleTransferClick(row: BalanceRow) {
		if (row.asset !== DEFAULT_QUOTE_TOKEN) return;
		const direction: TransferDirection = row.type === "perp" ? "toSpot" : "toPerp";
		setTransferState({
			open: true,
			direction,
		});
	}

 function renderBalanceRow(row: BalanceRow) {
  const token = getToken(row.asset); const symbol = token?.displayName ?? row.asset;
  const decimals = row.type === "perp" ? 6 : Math.min(token?.weiDecimals ?? token?.szDecimals ?? 8, 12);
  const available = Number(row.available) > 0;
  const shared = hasUnifiedSpotBalance(accountAbstraction);
  const canTransfer = !shared && row.asset === DEFAULT_QUOTE_TOKEN && available;
  const pnl = getPnl(row); const contract = token?.evmContract?.address;
  const cell = cn(positionsPanelTableCellClass, "pr-6");
  return <TableRow key={`${row.type}:${row.asset}`} className={positionsPanelRowHoverClass}>
   <TableCell size="dense" className={cn(cell, row.asset !== DEFAULT_QUOTE_TOKEN && "text-brand")}><AssetDisplay coin={row.asset} hideIcon nameClassName={row.asset === DEFAULT_QUOTE_TOKEN ? "font-normal" : "font-bold"} />{row.type === "perp" && <span className="ml-1 text-[10px] text-fg-muted">{shared ? accountAbstraction === "portfolioMargin" ? "Portfolio" : "Unified" : "Perps"}</span>}</TableCell>
   <TableCell size="dense" className={cell}>{formatToken(row.total, { decimals, minimumFractionDigits: 0, symbol, compact: false })}</TableCell>
   <TableCell size="dense" className={cell}><span title="Available after order holds and applicable margin requirements." className="underline decoration-dashed underline-offset-4">{formatToken(row.available, { decimals, minimumFractionDigits: 0, symbol, compact: false })}</span></TableCell>
   <TableCell size="dense" className={cell}>{formatUSD(row.usdValue, { compact: false })}</TableCell>
   <TableCell size="dense" className={cell}>{pnl ? <span className={pnl.pnl >= 0 ? "text-success" : "text-error"}>{formatUSD(pnl.pnl, { compact: false, signDisplay: "exceptZero" })} ({pnl.pnlPercent >= 0 ? "+" : ""}{pnl.pnlPercent.toFixed(1)}%)</span> : "--"}</TableCell>
   <TableCell size="dense" className={cell}>{Number(row.total) > 0 && <button type="button" className="text-brand hover:underline" onClick={() => setWithdrawAsset(row.asset === "UETH" || row.asset === "ETH" ? "ETH" : row.asset === "USOL" || row.asset === "SOL" ? "SOL" : connector?.id === "phantom" ? "ETH" : "SOL")}>Withdraw</button>}</TableCell>
   <TableCell size="dense" className={cell}>{canTransfer && <button type="button" className="text-brand hover:underline" onClick={() => handleTransferClick(row)}>{row.type === "perp" ? "To Spot" : "To Perps"}</button>}{shared && row.asset === DEFAULT_QUOTE_TOKEN && <span className="text-fg-muted" title="Spot and perps already use this same balance.">Shared balance</span>}</TableCell>
   <TableCell size="dense" className={cell}>{contract ? <span className="inline-flex items-center gap-2"><a href={`${hyperEvm.blockExplorers.default.url}/address/${contract}`} title={contract} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 hover:underline">{contract.slice(0, 6)}…{contract.slice(-4)}<ArrowSquareOutIcon className="size-3 text-brand" /></a><button type="button" aria-label={`Copy ${symbol} contract address`} className="text-brand" onClick={async () => { setCopyError(null); try { await navigator.clipboard.writeText(contract); } catch { setCopyError("Could not copy the contract address."); } }}><CopyIcon className="size-3" /></button></span> : "--"}</TableCell>
   <TableCell size="dense" className={cell}>{(row.type === "spot" || shared) && available && <button type="button" onClick={() => openSwapModal(row.asset)} className="text-brand hover:underline">Swap</button>}</TableCell>
  </TableRow>;
 }

	function renderPlaceholder() {
		if (!isConnected) return <Placeholder>{t`Connect your wallet to view balances.`}</Placeholder>;
		if (isLoading) return <Placeholder>{t`Loading balances...`}</Placeholder>;
		if (hasError) return <Placeholder variant="error">{t`Failed to load balances.`}</Placeholder>;
		if (balances.length === 0)
			return <Placeholder>{t`No balances found. Deposit funds to start trading.`}</Placeholder>;
		return null;
	}

	const placeholder = renderPlaceholder();

 const headings = ["Asset", "Total Balance", "Available Balance", "USDC Value", "PNL (ROE %)", "Withdraw", "Transfer", "Contract", "Swap"];
 return <div className={positionsPanelTabRootClass}>
  <AccountTableToolbar tab="balances">
   <select aria-label="Balances asset filter" value={assetFilter} onChange={e => setAssetFilter(e.target.value)} className="bg-surface py-1 text-fg outline-none"><option value="">Asset</option>{[...new Set(balances.map(b => b.asset))].map(asset => <option key={asset} value={asset}>{getToken(asset)?.displayName ?? asset}</option>)}</select>
   <Checkbox size="xxs" checked={hideSmallBalances} onCheckedChange={value => setHideSmallBalances(value === true)} label={<span className="text-xs text-fg">Hide Small Balances</span>} />
   {isConnected && !isLoading && <span className="text-xs tabular-nums text-fg-muted">{formatUSD(totalValue, { compact: false })}</span>}
  </AccountTableToolbar>
  {copyError && <p role="alert" className="px-1.5 text-xs text-error">{copyError}</p>}
  <div className={positionsPanelTableShellClass}>{placeholder ?? <ScrollArea className="min-h-0 w-full flex-1"><Table className={positionsPanelTableLayoutClass}>
   <TableHeader className={positionsPanelTableHeaderClass}><TableRow className="border-0">{headings.map((heading, i) => <TableHead key={heading} scope="col" size="dense" className={cn(positionsPanelTableHeadClass, "pr-6")} aria-sort={i === 3 ? descending ? "descending" : "ascending" : undefined}>{i === 3 ? <button type="button" onClick={() => setDescending(v => !v)} className="inline-flex gap-1 hover:text-fg">{heading}<span aria-hidden="true">{descending ? "⌄" : "⌃"}</span></button> : i === 4 ? <span title="Spot unrealized PNL relative to the recorded cost basis, as a percentage of that cost basis." className="underline decoration-dashed underline-offset-4">{heading}</span> : heading}</TableHead>)}</TableRow></TableHeader>
   <TableBody className={positionsPanelTableBodyClass}>{visibleBalances.map(renderBalanceRow)}</TableBody>
  </Table><ScrollBar orientation="horizontal" /></ScrollArea>}</div>
  {!placeholder && !visibleBalances.length && <p className="px-1.5 py-3 text-xs text-fg-muted">No balances match these filters.</p>}
  <TransferModal open={transferState.open} onOpenChange={open => setTransferState(prev => ({ ...prev, open }))} initialDirection={transferState.direction} />
  {withdrawAsset && <NativeWithdrawModal initialAsset={withdrawAsset} onClose={() => setWithdrawAsset(null)} />}
 </div>;
}
