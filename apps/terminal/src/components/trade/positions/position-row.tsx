import { Badge, Button, ButtonIcon, TableCell, TableRow, Tooltip } from "@hypeterminal/ui";
import { t } from "@lingui/core/macro";
import { PencilSimpleIcon } from "@phosphor-icons/react";
import { LIQ_WARNING_PROXIMITY } from "@/config/trade";
import { cn } from "@/lib/cn";
import { formatPercent, formatPrice, formatToken, formatUSD } from "@/lib/format";
import type { Position } from "@/lib/hyperliquid";
import type { Markets } from "@/lib/hyperliquid/markets";
import { isPositive, toBig } from "@/lib/trade/numbers";
import type { TpSlOrderInfo } from "@/lib/trade/open-orders";
import type { Side } from "@/lib/trade/types";
import type { ClosePositionData, LimitClosePositionData, TpSlPositionData } from "./position-dialog-types";
import { PositionPnlShare } from "./position-pnl-share";
import {
	accountCellClass,
	accountNumCellClass,
	accountRowClass,
	getMarketValueClass,
} from "./positions-panel-table-styles";

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

const numCellClass = cn(accountCellClass, accountNumCellClass);

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
	const sideClass = isLong ? "text-market-up" : "text-market-down";

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
	const funding = Number.isFinite(cumFunding) ? -cumFunding : null;
	const canClose = isPositive(absSize) && typeof assetId === "number" && isPositive(markPx);
	const actionsDisabled = !canClose || isRowClosing;

	const hasTpSl = !!(tpSlInfo?.tpPrice || tpSlInfo?.slPrice);
	const tpSlLabel = hasTpSl ? t`Edit TP/SL` : t`Add TP/SL`;
	const tpText = tpSlInfo?.tpPrice
		? formatPrice(tpSlInfo.tpPrice, { szDecimals, style: "decimal", compact: false })
		: "--";
	const slText = tpSlInfo?.slPrice
		? formatPrice(tpSlInfo.slPrice, { szDecimals, style: "decimal", compact: false })
		: "--";

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
		<TableRow className={accountRowClass}>
			<TableCell className={accountCellClass}>
				<button
					type="button"
					className={cn(
						"inline-flex items-center gap-1 rounded-4 transition-colors hover:text-fg focus-visible:outline-2 focus-visible:outline-stroke-focus",
						sideClass,
					)}
					onClick={() => onSelectMarket(p.coin, isLong ? "buy" : "sell")}
					aria-label={`Switch to ${displayName}, ${isLong ? "long" : "short"} ${p.leverage.value}x`}
				>
					<span className="font-medium">{symbol}</span>
					<span>{p.leverage.value}x</span>
					{dex && (
						<Badge tone="neutral" size="xs">
							{dex}
						</Badge>
					)}
				</button>
			</TableCell>
			<TableCell className={cn(numCellClass, sideClass)}>
				{formatToken(absSize, { decimals: szDecimals, minimumFractionDigits: 0, symbol })}
			</TableCell>
			<TableCell className={numCellClass}>{formatToken(p.positionValue, { decimals: 2, symbol: "USDC" })}</TableCell>
			<TableCell className={numCellClass}>
				{formatPrice(p.entryPx, { szDecimals, style: "decimal", compact: false })}
			</TableCell>
			<TableCell className={numCellClass}>
				{formatPrice(markPx, { szDecimals, style: "decimal", compact: false })}
			</TableCell>
			<TableCell className={numCellClass}>
				<div className="inline-flex items-center justify-end gap-1">
					<span className={getMarketValueClass(unrealizedPnl)}>
						{formatUSD(unrealizedPnl, { signDisplay: "always", compact: false })} (
						{formatPercent(p.returnOnEquity, { decimals: 1, signDisplay: "exceptZero" })})
					</span>
					<PositionPnlShare position={p} markPx={markPxRaw} symbol={symbol} szDecimals={szDecimals} />
				</div>
			</TableCell>
			<TableCell className={cn(numCellClass, liqIsNear && "text-market-down")}>
				{p.liquidationPx === null
					? "N/A"
					: formatPrice(p.liquidationPx, { szDecimals, style: "decimal", compact: false })}
			</TableCell>
			<TableCell className={numCellClass}>
				{formatUSD(p.marginUsed, { compact: false })}{" "}
				<span className="text-fg-muted">({p.leverage.type === "isolated" ? t`Isolated` : t`Cross`})</span>
			</TableCell>
			<TableCell className={cn(numCellClass, getMarketValueClass(funding))}>
				{formatUSD(funding, { signDisplay: "exceptZero", compact: false })}
			</TableCell>
			<TableCell className={numCellClass}>
				<div className="inline-flex items-center justify-end gap-1">
					<span>
						{tpText} / {slText}
					</span>
					<Tooltip content={tpSlLabel}>
						<ButtonIcon
							variant="ghost"
							intent="neutral"
							size="xs"
							aria-label={tpSlLabel}
							onClick={handleOpenTpSl}
							disabled={typeof assetId !== "number"}
						>
							<PencilSimpleIcon className="size-3.5 text-fg-muted" />
						</ButtonIcon>
					</Tooltip>
				</div>
			</TableCell>
			<TableCell className={numCellClass}>
				<div className="inline-flex items-center justify-end gap-1">
					<Button variant="secondary" intent="neutral" size="xs" onClick={handleLimitClose} disabled={actionsDisabled}>
						{t`Limit`}
					</Button>
					<Button variant="secondary" intent="neutral" size="xs" onClick={handleClose} disabled={actionsDisabled}>
						{isRowClosing ? t`Closing...` : t`Market`}
					</Button>
					<Tooltip content={t`Trailing stops are not available yet.`}>
						<span className="inline-flex">
							<Button variant="secondary" intent="neutral" size="xs" disabled>
								{t`Trailing`}
							</Button>
						</span>
					</Tooltip>
					<Button variant="secondary" intent="neutral" size="xs" onClick={handleReverse} disabled={actionsDisabled}>
						{t`Reverse`}
					</Button>
				</div>
			</TableCell>
		</TableRow>
	);
}
