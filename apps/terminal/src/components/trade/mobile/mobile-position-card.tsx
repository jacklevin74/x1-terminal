import { Button } from "@hypeterminal/ui";
import { t } from "@lingui/core/macro";
import { PencilIcon, PlusIcon, XIcon } from "@phosphor-icons/react";
import { useState } from "react";
import { Spinner } from "@/components/ui/spinner";
import { LIQ_WARNING_PROXIMITY } from "@/config/trade";
import { cn } from "@/lib/cn";
import { formatPercent, formatPrice, formatToken, formatUSD } from "@/lib/format";
import type { Position } from "@/lib/hyperliquid";
import type { Markets } from "@/lib/hyperliquid/markets";
import { isPositive, toBig } from "@/lib/trade/numbers";
import type { TpSlOrderInfo } from "@/lib/trade/open-orders";
import type { Side } from "@/lib/trade/types";
import { getValueColorClass } from "@/lib/ui/value-color";
import { AssetBadge } from "../components/asset-badge";
import type { ClosePositionData, LimitClosePositionData, TpSlPositionData } from "../positions/position-dialog-types";
import { PositionPnlShare } from "../positions/position-pnl-share";
import { MetricCell } from "./metric-cell";

interface Props {
	position: Position;
	markets: Markets;
	markPx: string | undefined;
	tpSlInfo: TpSlOrderInfo | undefined;
	isRowClosing: boolean;
	closeErrorMessage: string | null;
	onClose: (data: ClosePositionData) => void;
	onLimitClose: (data: LimitClosePositionData) => void;
	onOpenTpSl: (data: TpSlPositionData) => void;
	onSelectMarket: (coin: string, side: Side) => void;
}

export function MobilePositionCard({
	position: p,
	markets,
	markPx: markPxRaw,
	tpSlInfo,
	isRowClosing,
	closeErrorMessage,
	onClose,
	onLimitClose,
	onOpenTpSl,
	onSelectMarket,
}: Props) {
	const [confirmingClose, setConfirmingClose] = useState(false);

	const size = toBig(p.szi)?.toNumber() ?? Number.NaN;
	const isLong = size > 0;
	const absSize = Math.abs(size);
	const market = markets.getMarket(p.coin);
	const displayName = market?.pairName ?? p.coin;
	const assetId = market?.assetId;
	const szDecimals = market?.szDecimals ?? 4;
	const markPx = toBig(markPxRaw)?.toNumber() ?? Number.NaN;
	const entryPx = toBig(p.entryPx)?.toNumber() ?? Number.NaN;
	const unrealizedPnl = toBig(p.unrealizedPnl)?.toNumber() ?? Number.NaN;
	const roe = toBig(p.returnOnEquity)?.toNumber() ?? Number.NaN;
	const liqPx = toBig(p.liquidationPx)?.toNumber();
	const liqIsNear =
		liqPx != null &&
		Number.isFinite(markPx) &&
		Number.isFinite(liqPx) &&
		Math.abs(liqPx - markPx) / markPx <= LIQ_WARNING_PROXIMITY;

	const fundingRaw = toBig(p.cumFunding.sinceOpen)?.toNumber();
	const fundingValue = formatUSD(fundingRaw != null ? -fundingRaw : null, { signDisplay: "exceptZero" });
	const fundingClass = getValueColorClass(fundingRaw != null ? -fundingRaw : 0);

	const canClose = isPositive(absSize) && typeof assetId === "number" && isPositive(markPx);
	const pnlClass = getValueColorClass(unrealizedPnl);
	const hasTpSl = !!(tpSlInfo?.tpPrice || tpSlInfo?.slPrice);

	function handleClose() {
		if (!canClose || typeof assetId !== "number") return;
		onClose({
			assetId,
			coin: p.coin,
			size: absSize,
			markPx,
			szDecimals,
			isLong,
			unrealizedPnl,
			roe,
		});
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

	const sideClass = isLong ? "text-market-up" : "text-market-down";

	return (
		<div className="flex flex-col gap-3 px-3 py-3">
			<div className="flex items-center justify-between gap-2">
				<div className="flex min-w-0 items-center gap-2">
					<AssetBadge
						appearance="plain"
						coin={p.coin}
						leverage={p.leverage.value}
						side={isLong ? "buy" : "sell"}
						onClick={() => onSelectMarket(p.coin, isLong ? "buy" : "sell")}
						aria-label={
							isLong
								? t`Switch to ${displayName} market, long position`
								: t`Switch to ${displayName} market, short position`
						}
						className="min-h-8"
						nameClassName="text-base font-medium text-fg"
					/>
					<span className={cn("text-xs font-medium", sideClass)}>{isLong ? t`Long` : t`Short`}</span>
				</div>
				<div className="flex items-center gap-1">
					<span className={cn("text-xs font-medium tabular-nums", pnlClass)}>
						{formatUSD(unrealizedPnl, { signDisplay: "exceptZero" })}
					</span>
					<span className="text-xs tabular-nums text-fg-muted">{formatPercent(p.returnOnEquity, 1)}</span>
					<PositionPnlShare
						position={p}
						markPx={markPxRaw}
						symbol={market?.shortName ?? p.coin.split(":").pop() ?? p.coin}
						szDecimals={szDecimals}
					/>
				</div>
			</div>

			<div className="grid grid-cols-3 gap-x-3 gap-y-3">
				<MetricCell
					label={t`Size`}
					value={
						<>
							<span className="block truncate whitespace-nowrap">
								{formatToken(absSize, { decimals: szDecimals, symbol: p.coin })}
							</span>
							<span className="block text-fg-muted">{formatUSD(p.positionValue, { compact: true })}</span>
						</>
					}
				/>
				<MetricCell label={t`Entry`} value={formatPrice(entryPx, { szDecimals })} />
				<MetricCell label={t`Mark`} value={formatPrice(markPx, { szDecimals })} align="end" />
				<MetricCell
					label={p.leverage.type === "isolated" ? t`Margin · Iso` : t`Margin`}
					value={formatUSD(p.marginUsed)}
				/>
				<MetricCell
					label={t`Liq`}
					value={formatPrice(p.liquidationPx, { szDecimals })}
					valueClass={liqIsNear ? "text-market-down" : undefined}
				/>
				<MetricCell label={t`Funding`} value={fundingValue} valueClass={fundingClass} align="end" />
			</div>

			<div className="flex gap-2">
				{confirmingClose ? (
					<>
						<Button
							variant="secondary"
							intent="neutral"
							size="sm"
							className="flex-1"
							onClick={() => setConfirmingClose(false)}
						>
							{t`Cancel`}
						</Button>
						<Button
							variant="filled"
							intent="down"
							size="sm"
							className="flex-1"
							onClick={handleClose}
							disabled={!canClose || isRowClosing}
							iconLeft={isRowClosing ? <Spinner className="size-3" /> : <XIcon className="size-3.5" />}
						>
							{t`Confirm Close`}
						</Button>
					</>
				) : (
					<>
						<Button
							variant="secondary"
							intent="neutral"
							size="sm"
							className={cn("min-w-0", hasTpSl ? "flex-2" : "flex-1")}
							onClick={handleOpenTpSl}
							disabled={typeof assetId !== "number"}
							iconLeft={hasTpSl ? undefined : <PlusIcon className="size-3.5" />}
							iconRight={hasTpSl ? <PencilIcon className="size-3 shrink-0 text-fg-muted" /> : undefined}
						>
							{hasTpSl ? (
								<span className="min-w-0 truncate tabular-nums">
									{tpSlInfo?.tpPrice && (
										<span className="text-market-up">{formatPrice(tpSlInfo.tpPrice, { szDecimals })}</span>
									)}
									{tpSlInfo?.tpPrice && tpSlInfo?.slPrice && <span className="text-fg-muted"> / </span>}
									{tpSlInfo?.slPrice && (
										<span className="text-market-down">{formatPrice(tpSlInfo.slPrice, { szDecimals })}</span>
									)}
								</span>
							) : (
								t`TP/SL`
							)}
						</Button>
						<Button
							variant="secondary"
							intent="neutral"
							size="sm"
							className="flex-1"
							onClick={handleLimitClose}
							disabled={!canClose || isRowClosing}
						>
							{t`Limit Close`}
						</Button>
						<Button
							variant="secondary"
							intent="down"
							size="sm"
							className="flex-1"
							onClick={() => setConfirmingClose(true)}
							disabled={!canClose || isRowClosing}
							iconLeft={<XIcon className="size-3.5" />}
						>
							{t`Close`}
						</Button>
					</>
				)}
			</div>
			{closeErrorMessage && <p className="text-xs text-market-down">{closeErrorMessage}</p>}
		</div>
	);
}
