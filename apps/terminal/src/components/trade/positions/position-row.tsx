import { PositionPnlShare } from "./position-pnl-share";
import { TableCell, TableRow, Tooltip } from "@hypeterminal/ui";
import { t } from "@lingui/core/macro";
import { PencilIcon, PlusIcon } from "@phosphor-icons/react";
import { LIQ_WARNING_PROXIMITY } from "@/config/trade";
import { cn } from "@/lib/cn";
import { formatPercent, formatPrice, formatToken, formatUSD } from "@/lib/format";
import type { Position } from "@/lib/hyperliquid";
import type { Markets } from "@/lib/hyperliquid/markets";
import { isPositive, toBig } from "@/lib/trade/numbers";
import type { TpSlOrderInfo } from "@/lib/trade/open-orders";
import type { Side } from "@/lib/trade/types";
import { getValueColorClass } from "@/lib/ui/value-color";
import type { ClosePositionData, LimitClosePositionData, TpSlPositionData } from "./position-dialog-types";


interface Props {
	position: Position;
	markets: Markets;
	markPx: string | undefined;
	tpSlInfo: TpSlOrderInfo | undefined;
	isRowClosing: boolean;
	onClose: (data: ClosePositionData) => void;
	onLimitClose: (data: LimitClosePositionData) => void;
	onReverse: (data: ClosePositionData) => void;
	onOpenTpSl: (data: TpSlPositionData) => void;
	onSelectMarket: (coin: string, side: Side) => void;
}

export function PositionRow({
	position: p,
	markets,
	markPx: markPxRaw,
	tpSlInfo,
	isRowClosing,
	onClose,
	onLimitClose,
	onReverse,
	onOpenTpSl,
	onSelectMarket,
}: Props) {
	const size = toBig(p.szi)?.toNumber() ?? Number.NaN;
	const isLong = size > 0;
	const absSize = Math.abs(size);
	const market = markets.getMarket(p.coin);
	const assetId = market?.assetId;
	const szDecimals = market?.szDecimals ?? 4;
	const markPx = toBig(markPxRaw)?.toNumber() ?? Number.NaN;
	const displayName = market?.pairName ?? p.coin;
 const symbol = market?.shortName ?? p.coin.split(":").pop() ?? p.coin;
 const dex = p.coin.includes(":") ? p.coin.split(":")[0] : null;
 const sideClass = isLong ? "text-[#a2f9e5]" : "text-[#ff8da4]";
 const cellClass = "h-8 px-1.5 py-1 text-left text-xs leading-5 tabular-nums whitespace-nowrap text-[#e4f0ef]";

	const liqPx = toBig(p.liquidationPx)?.toNumber();
	const liqIsNear =
		liqPx != null &&
		Number.isFinite(markPx) &&
		Number.isFinite(liqPx) &&
		Math.abs(liqPx - markPx) / markPx <= LIQ_WARNING_PROXIMITY;

	const entryPx = toBig(p.entryPx)?.toNumber() ?? Number.NaN;
	const unrealizedPnl = toBig(p.unrealizedPnl)?.toNumber() ?? Number.NaN;
	const roe = toBig(p.returnOnEquity)?.toNumber() ?? Number.NaN;
	const cumFunding = toBig(p.cumFunding.sinceOpen)?.toNumber() ?? Number.NaN;
	const canClose = isPositive(absSize) && typeof assetId === "number" && isPositive(markPx);

	const pnlClass = getValueColorClass(unrealizedPnl);
	const fundingClass = getValueColorClass(cumFunding ? -cumFunding : null);
	const hasTpSl = !!(tpSlInfo?.tpPrice || tpSlInfo?.slPrice);

	function buildCloseData(): ClosePositionData | null {
		if (!canClose || typeof assetId !== "number") return null;
		return {
			assetId,
			coin: p.coin,
			size: absSize,
			markPx,
			szDecimals,
			isLong,
			unrealizedPnl,
			roe,
		};
	}

	function handleClose() {
		const data = buildCloseData();
		if (data) onClose(data);
	}

	function handleLimitClose() {
		if (!canClose || typeof assetId !== "number") return;
		onLimitClose({
			coin: p.coin,
			assetId,
			isLong,
			size: absSize,
			entryPx,
			markPx,
			unrealizedPnl,
			roe,
			szDecimals,
		});
	}

	function handleReverse() {
		const data = buildCloseData();
		if (data) onReverse(data);
	}

	function handleOpenTpSl() {
		if (typeof assetId !== "number") return;
		onOpenTpSl({
			coin: p.coin,
			assetId,
			isLong,
			size: absSize,
			entryPx,
			markPx,
			unrealizedPnl,
			roe,
			szDecimals,
			existingTpPrice: tpSlInfo?.tpPrice,
			existingSlPrice: tpSlInfo?.slPrice,
			existingTpOrderId: tpSlInfo?.tpOrderId,
			existingSlOrderId: tpSlInfo?.slOrderId,
		});
	}

 return (
  <TableRow className={"group border-0 bg-transparent transition-colors hover:bg-fill-hover"}>
   <TableCell size="dense" className={cn(cellClass, "border-l-[5px]", isLong ? "border-success" : "border-error")}>
    <div className="flex items-center gap-1">
     <button type="button" className={cn("inline-flex items-center gap-1 hover:opacity-80", sideClass)} onClick={() => onSelectMarket(p.coin, isLong ? "buy" : "sell")} aria-label={`Switch to ${displayName}, ${isLong ? "long" : "short"} ${p.leverage.value}x`}>
      <span className="font-bold">{symbol}</span><span className="font-normal">{p.leverage.value}x</span>
      {dex && <span className="rounded-md bg-[#17383c] px-1 py-0.5 text-[11px] font-medium text-[#55d8c5]">{dex}</span>}
     </button>
     <Tooltip content={hasTpSl ? t`Edit TP/SL` : t`Add TP/SL`}>
      <button type="button" aria-label={hasTpSl ? t`Edit TP/SL` : t`Add TP/SL`} onClick={handleOpenTpSl} disabled={typeof assetId !== "number"} className="ml-1 inline-flex opacity-0 group-hover:opacity-100 focus-visible:opacity-100 text-brand disabled:opacity-30">{hasTpSl ? <PencilIcon className="size-3" /> : <PlusIcon className="size-3" />}</button>
     </Tooltip>
    </div>
   </TableCell>
   <TableCell size="dense" className={cn(cellClass, isLong ? "text-[#20b899]" : "text-[#ee6d88]")}>{formatToken(absSize, { decimals: szDecimals, minimumFractionDigits: 0, symbol })}</TableCell>
   <TableCell size="dense" className={cellClass}>{formatToken(p.positionValue, { decimals: 2, symbol: "USDC" })}</TableCell>
   <TableCell size="dense" className={cellClass}>{formatPrice(p.entryPx, { szDecimals, style: "decimal", compact: false })}</TableCell>
   <TableCell size="dense" className={cellClass}>{formatPrice(markPx, { szDecimals, style: "decimal", compact: false })}</TableCell>
   <TableCell size="dense" className={cellClass}>
    <div className={cn("flex items-center gap-1", pnlClass)}>
     <span>{formatUSD(unrealizedPnl, { signDisplay: "always", compact: false })} ({formatPercent(p.returnOnEquity, { decimals: 1, signDisplay: "exceptZero" })})</span>
     <PositionPnlShare position={p} markPx={markPxRaw} symbol={symbol} szDecimals={szDecimals} />
    </div>
   </TableCell>
   <TableCell size="dense" className={cn(cellClass, liqIsNear && "text-error")}>
    {p.liquidationPx === null ? "N/A" : formatPrice(p.liquidationPx, { szDecimals, style: "decimal", compact: false })}
   </TableCell>
   <TableCell size="dense" className={cellClass}>{formatUSD(p.marginUsed, { compact: false })} ({p.leverage.type === "isolated" ? t`Isolated` : t`Cross`})</TableCell>
   <TableCell size="dense" className={cn(cellClass, fundingClass)}>{formatUSD(Number.isFinite(cumFunding) ? -cumFunding : null, { signDisplay: "exceptZero", compact: false })}</TableCell>
   <TableCell size="dense" className={cellClass}>
    <div className="flex items-center gap-2 text-[#50d8c5]">
     <button type="button" onClick={handleLimitClose} disabled={!canClose || isRowClosing} className="hover:underline disabled:opacity-40">{t`Limit`}</button>
     <button type="button" onClick={handleClose} disabled={!canClose || isRowClosing} className="hover:underline disabled:opacity-40">{isRowClosing ? t`Closing...` : t`Market`}</button>
     <Tooltip content="Trailing stops are not available yet."><span><button type="button" disabled className="opacity-40 cursor-not-allowed">Trailing</button></span></Tooltip>
     <button type="button" onClick={handleReverse} disabled={!canClose || isRowClosing} className="hover:underline disabled:opacity-40">{t`Reverse`}</button>
    </div>
   </TableCell>
  </TableRow>
 );
}
