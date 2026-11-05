import { useConnection } from "wagmi";
import { HL_ALL_DEXS } from "@/config/app";
import type { ChartLine, ChartLineOrder, ChartLinesInput, Tone } from "@/lib/chart/chart-lines";
import { formatPrice, formatToken, formatUSD } from "@/lib/format";
import { useMarkets, useSubscription, useUserPositions } from "@/lib/hyperliquid";
import { isMarketTriggerOrder, isStopOrder, isTakeProfitOrder, type OpenOrder } from "@/lib/trade/open-orders";

function lineOrder(order: OpenOrder, tp: boolean): ChartLineOrder | null {
	if (!(Number(order.sz) > 0)) return null;
	const tif = order.tif === "Ioc" || order.tif === "Alo" ? order.tif : "Gtc";
	return {
		isBuy: order.side === "B",
		size: order.sz,
		reduceOnly: order.reduceOnly,
		tif,
		trigger: order.isTrigger
			? { isMarket: isMarketTriggerOrder(order), tpsl: tp ? "tp" : "sl", limitPx: Number(order.limitPx) }
			: null,
	};
}

export function useChartLinesInput(symbol: string, dex?: string): ChartLinesInput {
	const { address, isConnected } = useConnection();
	const markets = useMarkets();
	const { getPosition } = useUserPositions();
	const { data: openOrdersEvent } = useSubscription(
		"openOrders",
		{ user: address ?? "0x0", dex: HL_ALL_DEXS },
		{ enabled: isConnected && !!address },
	);
	const { data: midsEvent } = useSubscription("allMids", { dex: HL_ALL_DEXS }, { enabled: !!symbol });
	const market = markets.getMarket(symbol);
	const szDecimals = market?.szDecimals ?? 4;
	const price = (v: number) => formatPrice(v, { szDecimals, style: "decimal", compact: false });
	const size = (v: number) => formatToken(Math.abs(v), { decimals: szDecimals, minimumFractionDigits: 0 });
	const lines: ChartLine[] = [];

	const position = getPosition(symbol, dex) ?? getPosition(symbol.split(":").at(-1) ?? symbol, dex);
	const szi = Number(position?.szi);
	if (position && Number.isFinite(szi) && szi !== 0) {
		const long = szi > 0;
		const entry = Number(position.entryPx);
		const pnl = Number(position.unrealizedPnl);
		if (entry > 0)
			lines.push({
				id: "position",
				kind: "position",
				price: entry,
				tone: long ? "up" : "down",
				priceText: price(entry),
				sizeText: size(szi),
				title: long ? "Long" : "Short",
				pnlText: Number.isFinite(pnl) ? formatUSD(pnl, { signDisplay: "always", compact: false }) : undefined,
				pnlTone: pnl >= 0 ? "up" : "down",
				signedSizeText: `${long ? "" : "-"}${size(szi)}`,
				valueText: formatUSD(Math.abs(szi) * entry, { compact: false }),
			});
		const liq = Number(position.liquidationPx);
		if (position.liquidationPx != null && liq > 0)
			lines.push({
				id: "liquidation",
				kind: "liquidation",
				price: liq,
				tone: "warning",
				priceText: price(liq),
				sizeText: size(szi),
				title: "Liq.",
			});
	}

	const entryPx = Number(position?.entryPx);
	function expected(px: number, sz: number, sells: boolean) {
		if (!position || !Number.isFinite(szi) || szi === 0 || !(entryPx > 0)) return {};
		if (szi > 0 !== sells) return {};
		const pnl = (px - entryPx) * Math.min(sz, Math.abs(szi)) * (szi > 0 ? 1 : -1);
		return {
			expectedPnlText: formatUSD(pnl, { signDisplay: "always", compact: false }),
			expectedPnlTone: (pnl >= 0 ? "up" : "down") as Tone,
		};
	}

	for (const order of openOrdersEvent?.orders ?? []) {
		if (order.coin !== symbol) continue;
		const px = Number(order.isTrigger ? order.triggerPx : order.limitPx);
		if (!(px > 0)) continue;
		const tp = isTakeProfitOrder(order);
		const sl = isStopOrder(order);
		lines.push({
			id: `order:${order.oid}`,
			kind: tp ? "tp" : sl ? "sl" : "limit",
			price: px,
			tone: order.side === "B" ? "up" : "down",
			priceText: price(px),
			sizeText: size(Number(order.sz)),
			title: tp ? "TP" : sl ? "SL" : order.side === "B" ? "Buy" : "Sell",
			closesLong: order.side === "A",
			oid: order.oid,
			order: lineOrder(order, tp),
			...expected(px, Number(order.sz), order.side === "A"),
		});
	}

	const mark = Number(midsEvent?.mids?.[symbol]);
	const positionSide = position && Number.isFinite(szi) && szi !== 0 ? (szi > 0 ? "long" : "short") : null;
	const shortName = market?.shortName ?? symbol;
	return { lines, markPx: Number.isFinite(mark) && mark > 0 ? mark : null, symbol: shortName, positionSide };
}
