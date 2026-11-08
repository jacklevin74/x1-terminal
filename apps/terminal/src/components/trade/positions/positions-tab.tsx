import { sortPositions, type PositionSort, type PositionSortKey } from "@/lib/positions/sort-positions";
import { PositionSortLabel } from "./position-sort-label";
import {useTradingAccount} from "@/hooks/use-trading-account";
import { closePositionsInSequence } from "@/lib/positions/close-all";
import { Button, Modal, ModalContent, ModalHeader, ModalPopup, ModalTitle, Table, TableBody, TableHead, TableHeader, TableRow } from "@hypeterminal/ui";
import { t } from "@lingui/core/macro";
import { useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { HL_ALL_DEXS } from "@/config/app";
import { buildOrderPlan } from "@/domain/trade/order-intent";
import { useSubmitPlan } from "@/hooks/trade/use-submit-plan";
import { cn } from "@/lib/cn";
import { useMarkets, useSubscription, useUserPositions } from "@/lib/hyperliquid";
import { buildClosePositionDescription } from "@/lib/trade/close-toast";
import { buildTpSlOrdersByCoin } from "@/lib/trade/open-orders";
import type { Side } from "@/lib/trade/types";
import { useExchangeScope } from "@/providers/exchange-scope";
import { useMarketOrderSlippageBps } from "@/stores/use-global-settings-store";
import { useMarketActions } from "@/stores/use-market-store";
import { useOrderEntryActions } from "@/stores/use-order-entry-store";
import { Placeholder } from "./placeholder";
import type { ClosePositionData, LimitClosePositionData, TpSlPositionData } from "./position-dialog-types";
import { PositionLimitCloseModal } from "./position-limit-close-modal";
import { PositionRow } from "./position-row";
import { PositionTpSlModal } from "./position-tpsl-modal";
import { positionViewHeadClass, positionViewHeaderClass, positionViewBodyClass, positionsPanelTableShellClass, positionsPanelTabRootClass } from "./positions-panel-table-styles";

type CloseIntent = "close" | "reverse";

export function PositionsTab() {
	const { address, isConnected } = useTradingAccount();
	const slippageBps = useMarketOrderSlippageBps();
 const currentAddress = useRef(address); currentAddress.current = address;
 const [sort, setSort] = useState<PositionSort>({ key: "value", descending: true });
 function handleSort(key: PositionSortKey) {
  setSort(previous => ({ key, descending: previous.key === key ? !previous.descending : key !== "market" }));
 }
 function sortLabel(label: string, field: PositionSortKey) {
  return <PositionSortLabel label={label} field={field} sort={sort} onSort={handleSort} />;
 }
 const [closeAllOpen, setCloseAllOpen] = useState(false);
 const [closingAll, setClosingAll] = useState(false);
 const closeAllBusy = useRef(false);
	const { scope } = useExchangeScope();
	const { setSelectedMarket } = useMarketActions();
	const { setSide } = useOrderEntryActions();

	function handleSelectMarket(name: string, side: Side) {
		setSelectedMarket(scope, name);
		setSide(side);
	}
	const [tpSlModalOpen, setTpSlModalOpen] = useState(false);
	const [selectedTpSlPosition, setSelectedTpSlPosition] = useState<TpSlPositionData | null>(null);
	const [limitCloseModalOpen, setLimitCloseModalOpen] = useState(false);
	const [selectedLimitClosePosition, setSelectedLimitClosePosition] = useState<LimitClosePositionData | null>(null);
	const [closingAssetIds, setClosingAssetIds] = useState<Set<number>>(() => new Set());

	const { submitPlan } = useSubmitPlan();
	const [actionError, setActionError] = useState<string | null>(null);

	const { positions, isLoading: positionsLoading, hasError: positionsError } = useUserPositions();

	const markets = useMarkets();
	const allMidsEnabled = isConnected && positions.length > 0;
	const { data: allMidsEvent } = useSubscription("allMids", { dex: HL_ALL_DEXS }, { enabled: allMidsEnabled });
	const mids = allMidsEvent?.mids;

	const { data: openOrdersEvent } = useSubscription(
		"openOrders",
		{ user: address ?? "0x0", dex: HL_ALL_DEXS },
		{ enabled: isConnected && !!address },
	);
	const openOrders = openOrdersEvent?.orders ?? [];

	const tpSlOrdersByCoin = useMemo(() => buildTpSlOrdersByCoin(openOrders), [openOrders]);

	async function submitCloseOrReverse(intent: CloseIntent, data: ClosePositionData) {
		const { assetId, size, markPx, szDecimals, isLong, coin, unrealizedPnl, roe } = data;
		if (closingAssetIds.has(assetId)) return false;

		setActionError(null);
		setClosingAssetIds((prev) => {
			const next = new Set(prev);
			next.add(assetId);
			return next;
		});

		const plan = buildOrderPlan({
			kind: intent === "close" ? "marketClose" : "reverse",
			assetId,
			size,
			szDecimals,
			isLong,
			markPx,
			slippageBps,
		});

		const title = intent === "close" ? t`Position closed — ${coin}` : t`Position reversed — ${coin}`;
		const failureMessage = intent === "close" ? t`Failed to close position` : t`Failed to reverse position`;

		const result = await submitPlan(plan);
		if (result.ok) {
			toast.success(title, {
				description: buildClosePositionDescription({ size, szDecimals, coin, unrealizedPnl, roe }),
			});
		} else {
			const message = result.error || failureMessage;
			toast.error(message);
			setActionError(message);
		}

		setClosingAssetIds((prev) => {
			const next = new Set(prev);
			next.delete(assetId);
			return next;
		});
 return result.ok;
	}

 const sortedPositions = useMemo(() => sortPositions(positions, sort, tpSlOrdersByCoin, coin => markets.getMarket(coin)?.shortName ?? coin.split(":").at(-1) ?? coin), [positions, sort, tpSlOrdersByCoin, markets]);
 const closeAllData = positions.map(p => {
  const market = markets.getMarket(p.coin); const markPx = Number(mids?.[p.coin]); const size = Math.abs(Number(p.szi));
  if (typeof market?.assetId !== "number" || !Number.isFinite(markPx) || markPx <= 0 || !Number.isFinite(size) || size <= 0) return null;
  return { assetId: market.assetId, coin: p.coin, size, markPx, szDecimals: market.szDecimals, isLong: Number(p.szi) > 0, unrealizedPnl: Number(p.unrealizedPnl), roe: Number(p.returnOnEquity) } satisfies ClosePositionData;
 });
 const canCloseAll = closeAllData.length > 0 && closeAllData.every(p => p !== null) && closingAssetIds.size === 0;
 async function handleCloseAll() {
  if (!canCloseAll || closeAllBusy.current || !address) return;
  closeAllBusy.current = true; setClosingAll(true); setCloseAllOpen(false);
  const startAddress = address;
  try {
   await closePositionsInSequence(closeAllData, () => currentAddress.current === startAddress,
    async data => !!data && await submitCloseOrReverse("close", data));
  } catch (error) { setActionError(error instanceof Error ? error.message : "Could not close positions."); }
  finally { closeAllBusy.current = false; setClosingAll(false); }
 }

	function handleClosePosition(data: ClosePositionData) {
		submitCloseOrReverse("close", data);
	}

	function handleReverse(data: ClosePositionData) {
		submitCloseOrReverse("reverse", data);
	}

	function handleOpenLimitCloseModal(data: LimitClosePositionData) {
		setSelectedLimitClosePosition(data);
		setLimitCloseModalOpen(true);
	}

	function handleOpenTpSlModal(data: TpSlPositionData) {
		setSelectedTpSlPosition(data);
		setTpSlModalOpen(true);
	}

	function renderPlaceholder() {
		if (!isConnected) return <Placeholder>{t`Connect your wallet to view positions.`}</Placeholder>;
		if (positionsLoading) return <Placeholder>{t`Loading positions...`}</Placeholder>;
		if (positionsError) {
			return (
				<Placeholder variant="error">
					<span>{t`Failed to load positions.`}</span>
				</Placeholder>
			);
		}
		if (positions.length === 0) return <Placeholder>{t`No active positions.`}</Placeholder>;
		return null;
	}

	const placeholder = renderPlaceholder();

	return (
		<div className={cn(positionsPanelTabRootClass, "bg-surface")}>

			{actionError ? <div className="px-2.5 py-1 text-2xs text-error">{actionError}</div> : null}
			<div className={positionsPanelTableShellClass}>
				{placeholder ? (
					<div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">{placeholder}</div>
				) : (
					<ScrollArea className="min-h-0 w-full flex-1">
						<Table className="table-auto w-max min-w-0">
       <TableHeader className={positionViewHeaderClass}>
        <TableRow className="border-0">
         {([
          ["Market", "market"], ["Size", "size"], ["Position Value", "value"], ["Entry Price", "entry"], ["Mark Price", "mark"],
          ["PNL (ROE %)", "pnl"], ["Liq. Price", "liquidation"], ["Margin", "margin"], ["Funding", "funding"], ["TP/SL", "tp"], ["Close All", null],
         ] as const).map(([label, field]) => {
          const active = field === sort.key || (field === "pnl" && sort.key === "roe") || (field === "tp" && sort.key === "sl");
          return <TableHead key={label} scope="col" size="dense" className={positionViewHeadClass} aria-sort={active ? sort.descending ? "descending" : "ascending" : undefined}>
           {field === null ? <button type="button" className="text-[#50d8c5] hover:underline disabled:opacity-40" disabled={!canCloseAll || closingAll} onClick={() => setCloseAllOpen(true)}>{closingAll ? "Closing…" : label}</button>
            : field === "pnl" ? <span className="inline-flex items-center gap-1">{sortLabel("PNL", "pnl")} ({sortLabel("ROE %", "roe")})</span>
            : field === "tp" ? <span className="inline-flex items-center gap-1">{sortLabel("TP", "tp")} / {sortLabel("SL", "sl")}</span>
            : sortLabel(label, field)}
          </TableHead>;
         })}
        </TableRow>
       </TableHeader>
							<TableBody className={positionViewBodyClass}>
								{sortedPositions.map((p) => {
									const assetId = markets.getAssetId(p.coin);
									return (
										<PositionRow
											key={p.coin}
											position={p}
											markets={markets}
											markPx={mids?.[p.coin]}
											tpSlInfo={tpSlOrdersByCoin.get(p.coin)}
											isRowClosing={closingAll || (typeof assetId === "number" && closingAssetIds.has(assetId))}
											onClose={handleClosePosition}
											onLimitClose={handleOpenLimitCloseModal}
											onReverse={handleReverse}
											onOpenTpSl={handleOpenTpSlModal}
											onSelectMarket={handleSelectMarket}
										/>
									);
								})}
							</TableBody>
						</Table>
						<ScrollBar orientation="horizontal" />
					</ScrollArea>
				)}
			</div>

			<Modal open={closeAllOpen} onOpenChange={setCloseAllOpen}>
    <ModalPopup size="sm"><ModalHeader><ModalTitle>Close all positions?</ModalTitle></ModalHeader><ModalContent className="space-y-4">
     <p className="text-sm">Submit market orders to close all {positions.length} positions shown here. Market slippage and trading fees apply.</p>
     <p className="text-xs text-fg-muted">Orders are sent one at a time. If an order fails or the wallet changes, remaining orders are stopped.</p>
     <div className="flex gap-2"><Button variant="outline" className="flex-1" onClick={() => setCloseAllOpen(false)}>Cancel</Button><Button className="flex-1" disabled={!canCloseAll || closingAll} onClick={() => void handleCloseAll()}>Close all at market</Button></div>
    </ModalContent></ModalPopup>
   </Modal>
   <PositionTpSlModal open={tpSlModalOpen} onOpenChange={setTpSlModalOpen} position={selectedTpSlPosition} />
			<PositionLimitCloseModal
				open={limitCloseModalOpen}
				onOpenChange={setLimitCloseModalOpen}
				position={selectedLimitClosePosition}
			/>
		</div>
	);
}
