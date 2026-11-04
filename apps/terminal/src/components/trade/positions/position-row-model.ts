import { t } from "@lingui/core/macro";
import { LIQ_WARNING_PROXIMITY } from "@/config/trade";
import { formatPrice } from "@/lib/format";
import { isPositive, toBig } from "@/lib/trade/numbers";
import type { PositionRowProps } from "./position-row-types";

export function getPositionRowModel(props: PositionRowProps) {
	const { position: p, markets, markPx: markPxRaw, tpSlInfo, isRowClosing } = props;
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
	const fmt = (v: string | number) => formatPrice(v, { szDecimals, style: "decimal", compact: false });
	const tpText = tpSlInfo?.tpPrice ? fmt(tpSlInfo.tpPrice) : null;
	const slText = tpSlInfo?.slPrice ? fmt(tpSlInfo.slPrice) : null;

	function closeData() {
		if (!canClose || typeof assetId !== "number") return null;
		return { assetId, coin: p.coin, size: absSize, markPx, szDecimals, isLong, unrealizedPnl, roe };
	}

	return {
		p,
		isLong,
		absSize,
		assetId,
		szDecimals,
		markPx,
		displayName,
		symbol,
		dex,
		liqIsNear,
		entryPx,
		unrealizedPnl,
		roe,
		funding,
		actionsDisabled,
		hasTpSl,
		tpSlLabel,
		tpText,
		slText,
		fmt,
		select: () => props.onSelectMarket(p.coin, isLong ? "buy" : "sell"),
		close: () => {
			const d = closeData();
			if (d) props.onClose(d);
		},
		reverse: () => {
			const d = closeData();
			if (d) props.onReverse(d);
		},
		limitClose: () => {
			if (!canClose || typeof assetId !== "number") return;
			props.onLimitClose({
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
		},
		openTpSl: () => {
			if (typeof assetId !== "number") return;
			props.onOpenTpSl({
				coin: p.coin,
				assetId,
				isLong,
				size: absSize,
				entryPx,
				markPx,
				unrealizedPnl,
				roe,
				szDecimals,
				existingTpPrice: props.tpSlInfo?.tpPrice,
				existingSlPrice: props.tpSlInfo?.slPrice,
				existingTpOrderId: props.tpSlInfo?.tpOrderId,
				existingSlOrderId: props.tpSlInfo?.slOrderId,
			});
		},
	};
}
