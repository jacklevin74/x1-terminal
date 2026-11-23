export type Point = [number, number];

export type RangeId = "day" | "week" | "month" | "allTime";
export type SeriesId = "value" | "pnl" | "perp";
export type WindowId = RangeId | "perpDay" | "perpWeek" | "perpMonth" | "perpAllTime";

export interface HistoryWindow {
	value: Point[];
	pnl: Point[];
	volume: string;
}

export type History = Partial<Record<WindowId, HistoryWindow>>;

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

const PERP_KEY: Record<RangeId, WindowId> = {
	day: "perpDay",
	week: "perpWeek",
	month: "perpMonth",
	allTime: "perpAllTime",
};

export function seriesFor(history: History, series: SeriesId, range: RangeId): Point[] {
	if (series === "value") return history[range]?.value ?? [];
	if (series === "pnl") return history[range]?.pnl ?? [];
	return history[PERP_KEY[range]]?.pnl ?? [];
}

function last(points: Point[]) {
	return points.at(-1)?.[1] ?? 0;
}

export function drawdownOf(points: Point[]) {
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
}

export function rangeStats(history: History, range: RangeId): RangeStats {
	const dd = drawdownOf(seriesFor(history, "value", range));
	const meta = RANGES.find((r) => r.id === range) ?? RANGES[0];
	return {
		range,
		label: meta.label,
		long: meta.long,
		pnl: last(seriesFor(history, "pnl", range)),
		perpPnl: last(seriesFor(history, "perp", range)),
		volume: Number(history[range]?.volume ?? 0),
		drawdown: dd.amount,
		drawdownPct: dd.pct,
	};
}

export interface Outcome {
	id: string;
	win: boolean;
	pnl: number;
	coin: string;
}

export interface AccountSummary {
	value: number;
	perpEquity: number;
	spotEquity: number;
	withdrawable: string;
	unrealized: number;
	marginEquity: number;
	notional: number;
	leverage: number;
	setLeverage: number | null;
	marginUsed: number;
	marginUsage: number;
	free: number;
	longNotional: number;
	shortNotional: number;
	longShare: number;
	bias: string;
	fees: number;
	feeFills: number;
	wins: number;
	closed: number;
	winRate: number;
	outcomes: Outcome[];
}

export interface BalanceRow {
	id: string;
	asset: string;
	tag: string;
	total: string;
	available: string;
	value: string;
	pnl: string;
	pnlNum: number;
	contract: string;
	perp: boolean;
}

export interface PositionRow {
	id: string;
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

export interface OrderRow {
	id: number;
	time: string;
	type: string;
	coin: string;
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

export interface OrderHistoryRow extends OrderRow {
	filled: string;
	status: string;
}

export interface TwapRow {
	id: number;
	coin: string;
	buy: boolean;
	size: string;
	executed: string;
	avgPrice: string;
	running: string;
	reduceOnly: string;
	created: string;
}

export interface FillRow {
	id: string;
	time: string;
	coin: string;
	buy: boolean;
	direction: string;
	price: string;
	size: string;
	tradeValue: string;
	fee: string;
	pnl: number;
	pnlText: string;
}

export interface FundingRow {
	id: string;
	time: string;
	coin: string;
	size: string;
	long: boolean;
	payment: number;
	paymentText: string;
	rate: string;
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

export type TabId = "balances" | "positions" | "orders" | "twap" | "history" | "funding" | "orders-history" | "ledger";

export const TABS: { id: TabId; label: string; mobile: string }[] = [
	{ id: "balances", label: "Balances", mobile: "Balances" },
	{ id: "positions", label: "Positions", mobile: "Positions" },
	{ id: "orders", label: "Open Orders", mobile: "Orders" },
	{ id: "twap", label: "TWAP", mobile: "TWAP" },
	{ id: "history", label: "Trade History", mobile: "Trades" },
	{ id: "funding", label: "Funding History", mobile: "Funding" },
	{ id: "orders-history", label: "Order History", mobile: "Order history" },
	{ id: "ledger", label: "Deposits and withdrawals", mobile: "Deposits and withdrawals" },
];

export interface PortfolioRows {
	balances: BalanceRow[];
	positions: PositionRow[];
	orders: OrderRow[];
	twap: TwapRow[];
	history: FillRow[];
	funding: FundingRow[];
	"orders-history": OrderHistoryRow[];
	ledger: LedgerRow[];
}

export interface PortfolioData {
	history: History;
	account: AccountSummary;
	rows: PortfolioRows;
	loading: { summary: boolean; chart: boolean } & Record<TabId, boolean>;
	failed: Record<TabId, boolean>;
}
