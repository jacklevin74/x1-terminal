import {
	Button,
	Modal,
	ModalContent,
	ModalDescription,
	ModalFooter,
	ModalHeader,
	ModalPopup,
	ModalTitle,
	Table,
	TableBody,
	TableHead,
	TableHeader,
	TableRow,
} from "@hypeterminal/ui";
import { t } from "@lingui/core/macro";
import { useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { AutoLockedClose } from "@/components/trade/auto/auto-locked-close";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { HL_ALL_DEXS } from "@/config/app";
import { buildOrderPlan } from "@/domain/trade/order-intent";
import { useSubmitPlan } from "@/hooks/trade/use-submit-plan";
import { useAutoManaged } from "@/hooks/use-auto-managed";
import { useTradingAccount } from "@/hooks/use-trading-account";
import { cn } from "@/lib/cn";
import { useMarkets, useSubscription, useUserPositions } from "@/lib/hyperliquid";
import { closePositionsInSequence } from "@/lib/positions/close-all";
import { type PositionSort, type PositionSortKey, sortPositions } from "@/lib/positions/sort-positions";
import { buildClosePositionDescription } from "@/lib/trade/close-toast";
import { buildTpSlOrdersByCoin } from "@/lib/trade/open-orders";
import type { Side } from "@/lib/trade/types";
import { useExchangeScope } from "@/providers/exchange-scope";
import { useMarketOrderSlippageBps } from "@/stores/use-global-settings-store";
import { useMarketActions } from "@/stores/use-market-store";
import { useOrderEntryActions } from "@/stores/use-order-entry-store";
import { ConnectPlaceholder } from "./connect-placeholder";
import { LoadingRows } from "./loading-rows";
import { Placeholder } from "./placeholder";
import type { ClosePositionData, LimitClosePositionData, TpSlPositionData } from "./position-dialog-types";
import { PositionLimitCloseModal } from "./position-limit-close-modal";
import { POSITION_HEADINGS, PositionRow } from "./position-row";
import { PositionTpSlModal } from "./position-tpsl-modal";
import {
	accountHeadActionClass,
	accountHeadClass,
	accountInlineErrorClass,
	accountNumHeadClass,
	accountTableClass,
	accountTableShellClass,
	accountTabRootClass,
	getAriaSort,
} from "./positions-panel-table-styles";
import { SortHeadButton } from "./sort-head-button";

type CloseIntent = "close" | "reverse";

const headClassName = "h-9 px-3";

const SORT_FIELDS: Record<string, readonly { label: string; key: PositionSortKey }[]> = {
	Asset: [{ label: "Asset", key: "market" }],
	Size: [{ label: "Size", key: "size" }],
	Value: [{ label: "Value", key: "value" }],
	Entry: [{ label: "Entry", key: "entry" }],
	Mark: [{ label: "Mark", key: "mark" }],
	PNL: [
		{ label: "PNL", key: "pnl" },
		{ label: "ROE", key: "roe" },
	],
	Liquidation: [{ label: "Liquidation", key: "liquidation" }],
	Margin: [{ label: "Margin", key: "margin" }],
	Funding: [{ label: "Funding", key: "funding" }],
	"TP / SL": [
		{ label: "TP", key: "tp" },
		{ label: "SL", key: "sl" },
	],
};

export function PositionsTab() {
	const { address, isConnected } = useTradingAccount();
	const auto = useAutoManaged();
	const slippageBps = useMarketOrderSlippageBps();
	const currentAddress = useRef(address);
	currentAddress.current = address;
	const headings = POSITION_HEADINGS;
	const [sort, setSort] = useState<PositionSort>({ key: "value", descending: true });
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

	const sortedPositions = useMemo(
		() =>
			sortPositions(
				positions,
				sort,
				tpSlOrdersByCoin,
				(coin) => markets.getMarket(coin)?.shortName ?? coin.split(":").at(-1) ?? coin,
			),
		[positions, sort, tpSlOrdersByCoin, markets],
	);
	const closeAllData = positions.map((p) => {
		const market = markets.getMarket(p.coin);
		const markPx = Number(mids?.[p.coin]);
		const size = Math.abs(Number(p.szi));
		if (
			typeof market?.assetId !== "number" ||
			!Number.isFinite(markPx) ||
			markPx <= 0 ||
			!Number.isFinite(size) ||
			size <= 0
		)
			return null;
		return {
			assetId: market.assetId,
			coin: p.coin,
			size,
			markPx,
			szDecimals: market.szDecimals,
			isLong: Number(p.szi) > 0,
			unrealizedPnl: Number(p.unrealizedPnl),
			roe: Number(p.returnOnEquity),
		} satisfies ClosePositionData;
	});
	const canCloseAll = closeAllData.length > 0 && closeAllData.every((p) => p !== null) && closingAssetIds.size === 0;
	async function handleCloseAll() {
		if (!canCloseAll || closeAllBusy.current || !address) return;
		closeAllBusy.current = true;
		setClosingAll(true);
		setCloseAllOpen(false);
		const startAddress = address;
		try {
			await closePositionsInSequence(
				closeAllData,
				() => currentAddress.current === startAddress,
				async (data) => !!data && (await submitCloseOrReverse("close", data)),
			);
		} catch (error) {
			setActionError(error instanceof Error ? error.message : "Could not close positions.");
		} finally {
			closeAllBusy.current = false;
			setClosingAll(false);
		}
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
		if (!isConnected) return <ConnectPlaceholder message={t`Connect your wallet to view positions.`} />;
		if (positionsLoading) return <LoadingRows label={t`Loading positions...`} />;
		if (positionsError) return <Placeholder variant="error">{t`Failed to load positions.`}</Placeholder>;
		if (positions.length === 0) return <Placeholder>{t`No active positions.`}</Placeholder>;
		return null;
	}

	const placeholder = renderPlaceholder();
	function handleSort(key: PositionSortKey) {
		setSort((previous) => ({
			key,
			descending: previous.key === key ? !previous.descending : key !== "market",
		}));
	}

	function renderHeadContent(label: string) {
		const fields = SORT_FIELDS[label];
		if (!fields) return label;
		return (
			<span className="inline-flex items-center gap-1">
				{fields.map((field, index) => (
					<span key={field.key} className="inline-flex items-center gap-1">
						{index > 0 && <span aria-hidden="true">/</span>}
						<SortHeadButton
							label={field.label}
							active={sort.key === field.key}
							descending={sort.descending}
							onToggle={() => handleSort(field.key)}
						/>
					</span>
				))}
			</span>
		);
	}

	return (
		<div className={accountTabRootClass}>
			{actionError ? <p className={accountInlineErrorClass}>{actionError}</p> : null}
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
											className={cn(
												accountHeadClass,
												headClassName,
												heading.numeric && accountNumHeadClass,
												heading.className,
											)}
											aria-sort={getAriaSort(
												!!SORT_FIELDS[heading.label]?.some((field) => field.key === sort.key),
												sort.descending,
											)}
										>
											{renderHeadContent(heading.label)}
										</TableHead>
									))}
									<TableHead
										scope="col"
										className={cn(
											accountHeadClass,
											headClassName,
											accountNumHeadClass,
											"sticky right-0 z-10 bg-surface",
										)}
									>
										{positions.some((p) => auto.isManaged(p.coin)) ? (
											<AutoLockedClose
												label={t`Close All`}
												coin={null}
												trigger={
													<button
														type="button"
														className={cn(accountHeadActionClass, "inline-flex items-center gap-1 text-fg-muted")}
													/>
												}
											/>
										) : (
											<button
												type="button"
												className={accountHeadActionClass}
												disabled={!canCloseAll || closingAll}
												onClick={() => setCloseAllOpen(true)}
											>
												{closingAll ? t`Closing...` : t`Close All`}
											</button>
										)}
									</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{sortedPositions.map((p) => {
									const assetId = markets.getAssetId(p.coin);
									return (
										<PositionRow
											key={p.coin}
											position={p}
											markets={markets}
											markPx={mids?.[p.coin]}
											tpSlInfo={tpSlOrdersByCoin.get(p.coin)}
											autoManaged={auto.isManaged(p.coin)}
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
				<ModalPopup size="sm">
					<ModalHeader>
						<ModalTitle>{t`Close all positions?`}</ModalTitle>
						<ModalDescription>
							{t`Submit market orders to close all ${positions.length} positions shown here. Market slippage and trading fees apply.`}
						</ModalDescription>
					</ModalHeader>
					<ModalContent className="pb-0">
						<p className="text-xs text-fg-muted">
							{t`Orders are sent one at a time. If an order fails or the wallet changes, remaining orders are stopped.`}
						</p>
					</ModalContent>
					<ModalFooter>
						<Button
							variant="secondary"
							intent="neutral"
							size="md"
							className="flex-1"
							onClick={() => setCloseAllOpen(false)}
						>
							{t`Cancel`}
						</Button>
						<Button
							variant="filled"
							intent="neutral"
							size="md"
							className="flex-1"
							disabled={!canCloseAll || closingAll}
							onClick={() => void handleCloseAll()}
						>
							{t`Close all at market`}
						</Button>
					</ModalFooter>
				</ModalPopup>
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
