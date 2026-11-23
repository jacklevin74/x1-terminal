import Big from "big.js";
import { TOKEN_ICON_BASE_URL } from "@/config/app";
import { formatDateTime, formatPercent, formatPrice, formatToken, formatUSD, shortenAddress } from "@/lib/format";
import raw from "./account.json";

export type Point = [number, number];

interface RawWindow {
	accountValueHistory: [number, string][];
	pnlHistory: [number, string][];
	vlm: string;
}

interface RawPosition {
	coin: string;
	szi: string;
	leverage: { type: string; value: number };
	entryPx: string;
	positionValue: string;
	unrealizedPnl: string;
	returnOnEquity: string;
	liquidationPx: string | null;
	marginUsed: string;
	maxLeverage: number;
	cumFunding: { allTime: string; sinceOpen: string; sinceChange: string };
}

interface RawOrder {
	coin: string;
	side: "A" | "B";
	limitPx: string;
	sz: string;
	oid: number;
	timestamp: number;
	triggerCondition: string;
	isTrigger: boolean;
	triggerPx: string;
	isPositionTpsl: boolean;
	reduceOnly: boolean;
	orderType: string;
	origSz: string;
}

interface RawFill {
	coin: string;
	px: string;
	sz: string;
	side: "A" | "B";
	time: number;
	dir: string;
	closedPnl: string;
	hash: string;
	tid: number;
	fee: string;
	feeToken: string;
	liquidation?: unknown;
}

interface RawFunding {
	time: number;
	delta: { coin: string; usdc: string; szi: string; fundingRate: string };
}

interface RawLedger {
	time: number;
	hash: string;
	delta: {
		type: string;
		user: string;
		destination: string;
		sourceDex: string;
		destinationDex: string;
		token: string;
		amount: string;
		usdcValue: string;
		fee: string;
	};
}

interface RawAccount {
	capturedAt: string;
	portfolio: Record<string, RawWindow>;
	clearinghouseState: {
		marginSummary: { accountValue: string; totalNtlPos: string; totalRawUsd: string; totalMarginUsed: string };
		withdrawable: string;
		assetPositions: { position: RawPosition }[];
		time: number;
	};
	spotClearinghouseState: { balances: { coin: string; total: string; hold: string; entryNtl: string }[] };
	openOrders: RawOrder[];
	fills: RawFill[];
	funding: RawFunding[];
	ledger: RawLedger[];
}

const data = raw as unknown as RawAccount;

export const ADDRESS = "0x5fa3968b8f255076d1e23ae755fd93222e509627";
export const SHORT_ADDRESS = shortenAddress(ADDRESS);

export type RangeId = "day" | "week" | "month" | "allTime";
export type SeriesId = "value" | "pnl" | "perp";

export const RANGES: { id: RangeId; label: string; long: string }[] = [
	{ id: "day", label: "1D", long: "24h" },
	{ id: "week", label: "7D", long: "7 days" },
	{ id: "month", label: "30D", long: "30 days" },
	{ id: "allTime", label: "All", long: "all time" },
];

export const SERIES: { id: SeriesId; label: string }[] = [
	{ id: "value", label: "Account value" },
	{ id: "pnl", label: "PNL" },
	{ id: "perp", label: "Perps PNL" },
];

const PERP_KEY: Record<RangeId, string> = {
	day: "perpDay",
	week: "perpWeek",
	month: "perpMonth",
	allTime: "perpAllTime",
};

function toPoints(rows: [number, string][]): Point[] {
	return rows.map(([t, v]) => [t, Number(v)]);
}

export function lastOf(series: SeriesId, range: RangeId) {
	const points = seriesFor(series, range);
	return points[points.length - 1][1];
}

export function seriesFor(series: SeriesId, range: RangeId): Point[] {
	if (series === "value") return toPoints(data.portfolio[range].accountValueHistory);
	if (series === "pnl") return toPoints(data.portfolio[range].pnlHistory);
	return toPoints(data.portfolio[PERP_KEY[range]].pnlHistory);
}

function last(points: Point[]) {
	return points[points.length - 1][1];
}

function drawdownOf(points: Point[]) {
	let peak = Number.NEGATIVE_INFINITY;
	let amount = 0;
	let pct = 0;
	for (const [, v] of points) {
		peak = Math.max(peak, v);
		if (peak - v > amount) {
			amount = peak - v;
			pct = peak > 0 ? amount / peak : 0;
		}
	}
	return { amount, pct };
}

export interface RangeStats {
	range: RangeId;
	label: string;
	long: string;
	pnl: number;
	perpPnl: number;
	volume: number;
	drawdown: number;
	drawdownPct: number;
	start: number;
	end: number;
}

export function rangeStats(range: RangeId): RangeStats {
	const value = seriesFor("value", range);
	const dd = drawdownOf(value);
	const meta = RANGES.find((r) => r.id === range) ?? RANGES[0];
	return {
		range,
		label: meta.label,
		long: meta.long,
		pnl: last(seriesFor("pnl", range)),
		perpPnl: last(seriesFor("perp", range)),
		volume: Number(data.portfolio[range].vlm),
		drawdown: dd.amount,
		drawdownPct: dd.pct,
		start: value[0][0],
		end: value[value.length - 1][0],
	};
}

const ms = data.clearinghouseState.marginSummary;
const positionsRaw = data.clearinghouseState.assetPositions.map((a) => a.position);
const spotUsdc = data.spotClearinghouseState.balances.find((b) => b.coin === "USDC");

const totalEquity = last(seriesFor("value", "allTime"));
const perpEquity = Number(data.portfolio.perpAllTime.accountValueHistory.at(-1)?.[1] ?? 0);
const spotEquity = data.spotClearinghouseState.balances.reduce(
	(s, b) => s + (b.coin === "USDC" ? Number(b.total) : 0),
	0,
);

const longNotional = positionsRaw.filter((p) => Number(p.szi) > 0).reduce((s, p) => s + Number(p.positionValue), 0);
const shortNotional = positionsRaw.filter((p) => Number(p.szi) < 0).reduce((s, p) => s + Number(p.positionValue), 0);
const longShare = longNotional / (longNotional + shortNotional || 1);

function biasLabel(share: number) {
	if (share >= 0.75) return "Very bullish";
	if (share >= 0.55) return "Bullish";
	if (share > 0.45) return "Neutral";
	if (share > 0.25) return "Bearish";
	return "Very bearish";
}

const closedFills = data.fills.filter((f) => Number(f.closedPnl) !== 0);
const wins = closedFills.filter((f) => Number(f.closedPnl) > 0).length;
const marginEquity = Number(ms.accountValue);
const notional = Number(ms.totalNtlPos);
const marginUsed = Number(ms.totalMarginUsed);
const setLeverage = Math.max(...positionsRaw.map((p) => p.leverage.value));

export const account = {
	capturedAt: data.capturedAt,
	asOf: data.clearinghouseState.time,
	value: totalEquity,
	perpEquity,
	spotEquity,
	withdrawable: Number(data.clearinghouseState.withdrawable),
	unrealized: positionsRaw.reduce((s, p) => s + Number(p.unrealizedPnl), 0),
	marginEquity,
	notional,
	leverage: notional / marginEquity,
	setLeverage,
	marginUsed,
	marginUsage: marginUsed / marginEquity,
	free: marginEquity - marginUsed,
	longNotional,
	shortNotional,
	longShare,
	bias: biasLabel(longShare),
	fees: data.fills.reduce((s, f) => s + Number(f.fee), 0),
	feeFills: data.fills.length,
	feesSince: data.fills[data.fills.length - 1].time,
	wins,
	closed: closedFills.length,
	winRate: wins / (closedFills.length || 1),
	outcomes: closedFills
		.slice(0, 40)
		.reverse()
		.map((f) => ({ id: `${f.hash}-${f.tid}`, win: Number(f.closedPnl) > 0, pnl: Number(f.closedPnl), coin: f.coin })),
};

export function usd(v: number | string) {
	return formatUSD(v, { compact: false });
}

export function usdCompact(v: number | string) {
	return formatUSD(v, { compact: true });
}

export function signedUsd(v: number, compact = false) {
	return formatUSD(v, { compact, signDisplay: "exceptZero" });
}

export function pct(v: number, decimals = 2) {
	return formatPercent(v, { decimals, signDisplay: "never" });
}

export function pnlClass(v: number) {
	if (v > 0) return "text-market-up";
	if (v < 0) return "text-market-down";
	return "text-fg";
}

export function axisUsd(v: number, step: number) {
	if (Math.abs(v) < 1000) return formatUSD(v, { compact: false, decimals: 0 });
	const decimals = step >= 1000 && step % 1000 === 0 ? 0 : 1;
	return formatUSD(v, { compact: true, decimals, minimumFractionDigits: 0 });
}

export function niceTicks(min: number, max: number, count = 4) {
	const span = max - min || 1;
	const rough = span / count;
	const mag = 10 ** Math.floor(Math.log10(rough));
	const step = [1, 2, 2.5, 5, 10].map((k) => k * mag).find((s) => s >= rough) ?? mag * 10;
	const ticks: number[] = [];
	for (let v = Math.ceil(min / step) * step; v <= max + 1e-9; v += step) ticks.push(Number(v.toFixed(6)));
	return { ticks, step };
}

export function timeLabel(ts: number, range: RangeId) {
	if (range === "day")
		return formatDateTime(ts, { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "UTC" });
	if (range === "allTime") return formatDateTime(ts, { month: "short", year: "numeric", timeZone: "UTC" });
	return formatDateTime(ts, { month: "short", day: "numeric", timeZone: "UTC" });
}

export function hoverLabel(ts: number) {
	return formatDateTime(ts, {
		month: "short",
		day: "numeric",
		hour: "2-digit",
		minute: "2-digit",
		hour12: false,
		timeZone: "UTC",
	});
}

function rowTime(ts: number) {
	return formatDateTime(ts, {
		month: "2-digit",
		day: "2-digit",
		year: "numeric",
		hour: "2-digit",
		minute: "2-digit",
		second: "2-digit",
		hour12: false,
	});
}

export function coinName(coin: string) {
	return coin.split(":").at(-1) ?? coin;
}

export function coinDex(coin: string) {
	return coin.includes(":") ? coin.split(":")[0] : null;
}

export function coinIcon(coin: string) {
	return `${TOKEN_ICON_BASE_URL}/${coin}.svg`;
}

function priceDecimals(px: string) {
	const i = px.indexOf(".");
	return i === -1 ? 0 : Math.min(px.length - i - 1, 6);
}

function px(v: string | number) {
	return formatPrice(v, { style: "decimal", compact: false });
}

function sizeOf(v: string, coin: string) {
	return formatToken(v, { decimals: priceDecimals(v), symbol: coinName(coin), compact: false });
}

export interface BalanceRow {
	id: string;
	asset: string;
	tag: string;
	total: string;
	available: string;
	value: string;
	pnl: string;
	contract: string;
}

export const balances: BalanceRow[] = [
	{
		id: "perp",
		asset: "USDC",
		tag: "Perps",
		total: formatToken(ms.accountValue, { decimals: 2, symbol: "USDC", compact: false }),
		available: formatToken(data.clearinghouseState.withdrawable, { decimals: 2, symbol: "USDC", compact: false }),
		value: usd(ms.accountValue),
		pnl: "-",
		contract: "-",
	},
	...(spotUsdc
		? [
				{
					id: "spot-usdc",
					asset: "USDC",
					tag: "Spot",
					total: formatToken(spotUsdc.total, { decimals: 8, symbol: "USDC", compact: false }),
					available: formatToken(new Big(spotUsdc.total).minus(spotUsdc.hold).toString(), {
						decimals: 8,
						symbol: "USDC",
						compact: false,
					}),
					value: usd(spotUsdc.total),
					pnl: "-",
					contract: "-",
				},
			]
		: []),
];

export interface PositionRow {
	coin: string;
	name: string;
	long: boolean;
	leverage: string;
	size: string;
	value: string;
	valueNum: number;
	entry: string;
	mark: string;
	pnl: number;
	pnlText: string;
	roe: string;
	liq: string;
	margin: string;
	funding: number;
	fundingText: string;
	tpsl: string;
}

export const positions: PositionRow[] = positionsRaw
	.map((p) => {
		const abs = new Big(p.szi).abs();
		const mark = new Big(p.positionValue).div(abs).toString();
		const funding = -Number(p.cumFunding.sinceOpen);
		const pnl = Number(p.unrealizedPnl);
		return {
			coin: p.coin,
			name: coinName(p.coin),
			long: Number(p.szi) > 0,
			leverage: `${p.leverage.value}x`,
			size: sizeOf(abs.toString(), p.coin),
			value: usd(p.positionValue),
			valueNum: Number(p.positionValue),
			entry: px(p.entryPx),
			mark: px(Number(mark).toPrecision(6)),
			pnl,
			pnlText: signedUsd(pnl),
			roe: formatPercent(p.returnOnEquity, { decimals: 2, signDisplay: "exceptZero" }),
			liq: p.liquidationPx === null ? "-" : px(Number(p.liquidationPx).toPrecision(6)),
			margin: usd(p.marginUsed),
			funding,
			fundingText: signedUsd(funding),
			tpsl: "- / -",
		};
	})
	.sort((a, b) => b.valueNum - a.valueNum);

export interface OrderRow {
	id: number;
	time: string;
	type: string;
	coin: string;
	name: string;
	direction: string;
	buy: boolean;
	size: string;
	origSize: string;
	value: string;
	price: string;
	reduceOnly: string;
	trigger: string;
	tpsl: string;
}

function orderDirection(o: RawOrder) {
	const buy = o.side === "B";
	if (o.reduceOnly) return buy ? "Close Short" : "Close Long";
	return buy ? "Long" : "Short";
}

export const orders: OrderRow[] = data.openOrders.map((o) => ({
	id: o.oid,
	time: rowTime(o.timestamp),
	type: o.orderType,
	coin: o.coin,
	name: coinName(o.coin),
	direction: orderDirection(o),
	buy: o.side === "B",
	size: sizeOf(o.sz, o.coin),
	origSize: sizeOf(o.origSz, o.coin),
	value: usd(new Big(o.sz).times(o.limitPx).toString()),
	price: px(o.limitPx),
	reduceOnly: o.reduceOnly ? "Yes" : "No",
	trigger: o.triggerCondition,
	tpsl: o.isPositionTpsl ? "Yes" : "-",
}));

export interface FillRow {
	id: string;
	time: string;
	coin: string;
	name: string;
	dex: string | null;
	buy: boolean;
	direction: string;
	price: string;
	size: string;
	tradeValue: string;
	fee: string;
	pnl: number;
	pnlText: string;
}

export const fills: FillRow[] = data.fills.map((f) => ({
	id: `${f.hash}-${f.tid}`,
	time: rowTime(f.time),
	coin: f.coin,
	name: coinName(f.coin),
	dex: coinDex(f.coin),
	buy: f.side === "B",
	direction: f.liquidation ? "Liquidated" : f.dir,
	price: px(f.px),
	size: sizeOf(f.sz, f.coin),
	tradeValue: formatToken(new Big(f.px).times(f.sz).toString(), { decimals: 2, symbol: "USDC", compact: false }),
	fee: formatToken(f.fee, { minimumFractionDigits: 2, maximumFractionDigits: 6, symbol: f.feeToken, compact: false }),
	pnl: Number(f.closedPnl),
	pnlText: formatToken(f.closedPnl, { decimals: 2, symbol: "USDC", compact: false }),
}));

export interface FundingRow {
	id: string;
	time: string;
	coin: string;
	name: string;
	size: string;
	long: boolean;
	payment: number;
	paymentText: string;
	rate: string;
}

export const funding: FundingRow[] = data.funding.map((f) => ({
	id: `${f.time}-${f.delta.coin}`,
	time: rowTime(f.time),
	coin: f.delta.coin,
	name: coinName(f.delta.coin),
	size: sizeOf(new Big(f.delta.szi).abs().toString(), f.delta.coin),
	long: Number(f.delta.szi) > 0,
	payment: Number(f.delta.usdc),
	paymentText: formatToken(f.delta.usdc, { decimals: 4, symbol: "USDC", compact: false }),
	rate: formatPercent(f.delta.fundingRate, { decimals: 4, signDisplay: "exceptZero" }),
}));

function dexName(dex: string) {
	if (dex === "") return "Perps";
	if (dex === "spot") return "Spot";
	return `${dex} perps`;
}

function ledgerAction(outgoing: boolean, incoming: boolean) {
	if (outgoing) return "Send";
	if (incoming) return "Receive";
	return "Transfer";
}

export interface LedgerRow {
	id: string;
	time: string;
	action: string;
	amount: string;
	amountNum: number;
	from: string;
	to: string;
	fee: string;
	outgoing: boolean;
}

export const ledger: LedgerRow[] = data.ledger.map((l) => {
	const d = l.delta;
	const me = ADDRESS.toLowerCase();
	const outgoing = d.user.toLowerCase() === me && d.destination.toLowerCase() !== me;
	const incoming = d.user.toLowerCase() !== me;
	return {
		id: l.hash,
		time: rowTime(l.time),
		action: ledgerAction(outgoing, incoming),
		amount: formatToken(d.usdcValue, { decimals: 2, symbol: d.token, compact: false }),
		amountNum: outgoing ? -Number(d.usdcValue) : Number(d.usdcValue),
		from: incoming ? shortenAddress(d.user) : dexName(d.sourceDex),
		to: outgoing ? shortenAddress(d.destination) : dexName(d.destinationDex),
		fee: formatToken(d.fee, { decimals: 2, symbol: "USDC", compact: false }),
		outgoing,
	};
});

export type TabId = "balances" | "positions" | "orders" | "twap" | "history" | "funding" | "orders-history" | "ledger";

export const TABS: { id: TabId; label: string; mobile: string; count: number }[] = [
	{ id: "balances", label: "Balances", mobile: "Balances", count: balances.length },
	{ id: "positions", label: "Positions", mobile: "Positions", count: positions.length },
	{ id: "orders", label: "Open Orders", mobile: "Orders", count: orders.length },
	{ id: "twap", label: "TWAP", mobile: "TWAP", count: 0 },
	{ id: "history", label: "Trade History", mobile: "Trades", count: fills.length },
	{ id: "funding", label: "Funding History", mobile: "Funding", count: funding.length },
	{ id: "orders-history", label: "Order History", mobile: "Order history", count: 0 },
	{ id: "ledger", label: "Deposits and withdrawals", mobile: "Deposits and withdrawals", count: ledger.length },
];

export function isTab(v: unknown): v is TabId {
	return TABS.some((t) => t.id === v);
}
