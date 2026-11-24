import { colorToHex, getChartColors } from "./theme-colors";

export type TradingLineTone = "up" | "down" | "warning";
export interface TradingLine {
	id: string;
	kind: "position" | "liquidation" | "order";
	price: number;
	label: string;
	title: string;
	qty?: string;
	pnl?: number;
	tone: TradingLineTone;
}
interface Position {
	szi: string;
	entryPx: string;
	liquidationPx?: string | null;
	unrealizedPnl?: string;
}
interface Order {
	oid: number;
	coin: string;
	side: "B" | "A";
	isTrigger: boolean;
	triggerPx: string;
	limitPx: string;
	sz: string;
	label: string;
}
export function buildTradingLines(
	symbol: string,
	position: Position | undefined,
	orders: readonly Order[],
): TradingLine[] {
	const lines: TradingLine[] = [];
	const valid = (price: number) => Number.isFinite(price) && price > 0;
	if (position && Number(position.szi) !== 0 && Number.isFinite(Number(position.szi))) {
		const long = Number(position.szi) > 0;
		const entry = Number(position.entryPx);
		if (valid(entry))
			lines.push({
				id: "position",
				kind: "position",
				title: long ? "Long" : "Short",
				qty: String(Math.abs(Number(position.szi))),
				pnl:
					position.unrealizedPnl != null && Number.isFinite(Number(position.unrealizedPnl))
						? Number(position.unrealizedPnl)
						: undefined,
				price: entry,
				label: `${long ? "Long" : "Short"} ${Math.abs(Number(position.szi))}${position.unrealizedPnl != null && Number.isFinite(Number(position.unrealizedPnl)) ? ` PNL ${Number(position.unrealizedPnl).toFixed(2)}` : ""}`,
				tone: Number(position.unrealizedPnl) < 0 ? "down" : "up",
			});
		const liquidation = Number(position.liquidationPx);
		if (valid(liquidation))
			lines.push({
				id: "liquidation",
				kind: "liquidation",
				title: "Liq.",
				price: liquidation,
				label: "Liquidation",
				tone: "down",
			});
	}
	for (const order of orders) {
		if (order.coin !== symbol) continue;
		const price = Number(order.isTrigger ? order.triggerPx : order.limitPx);
		if (valid(price))
			lines.push({
				id: `order:${order.oid}`,
				kind: "order",
				title: order.label,
				qty: order.sz,
				price,
				label: `${order.label} ${order.sz}`,
				tone: order.side === "B" ? "up" : "down",
			});
	}
	return lines;
}
export function getTradingLineColor(tone: TradingLineTone): string {
	const colors = getChartColors();
	if (tone === "up") return colorToHex(colors.lineUp);
	if (tone === "down") return colorToHex(colors.lineDown);
	return colorToHex(colors.warning);
}
