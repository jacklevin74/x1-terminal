// Shared data for copy-trader round 2: one trader directory for both modes.
//
// Sources (all fetched once, saved in the repo, never fetched at runtime):
// 1. ../copy-trader/leaderboard.json: Hyperliquid leaderboard (57 rows). Equity and PNL / ROI / volume
//    for 7d, 30d and all time. No trade counts, no positions.
// 2. ./pool.json: Jack's server (wxnt-sale-sim.vercel.app/api/daytraders), the 37 mood pool traders.
//    Equity, 30d and all-time PNL, PNL per month (last 4 months), fills in the last 14 days
//    (the Hyperliquid fills API stops at 2,000, so 2,000 means "2,000 or more") and every open
//    position with notional and leverage. No 7d PNL.
// 3. ../mood-traders/data.ts: HYPE positions of the same 37 traders and the server's HYPE order flow.
//    The basket mood score reuses its moodFor() unchanged.
// 7 addresses are in both 1 and 2; they merge into one row.
// Example values: followers (no X1 users yet). Everything else is real or shown as missing.
import { scoreOf } from "../copy-trader/data";
import lbRaw from "../copy-trader/leaderboard.json";
import { holders, ALL as MOOD_POOL, moodFor } from "../mood-traders/data";
import poolRaw from "./pool.json";

interface Perf {
	pnl: number;
	roi: number;
	vlm: number;
}

interface LbRow {
	address: string;
	displayName: string | null;
	accountValue: number;
	day: Perf;
	week: Perf;
	month: Perf;
	allTime: Perf;
}

export interface PoolPosition {
	coin: string;
	szi: number;
	ntl: number;
	upnl: number;
	lev: string;
}

interface PoolRow {
	usr: string;
	name: string;
	style: string;
	coins: string[];
	acct: number;
	pnl30: number;
	pnlAll: number;
	months: { m: string; pnl: number }[];
	green: number;
	nmonths: number;
	fills14: number;
	positions: PoolPosition[];
}

export const leaderboard = lbRaw as { source: string; capturedAt: string; rows: LbRow[] };
export const pool = poolRaw as { source: string; capturedAt: string; traders: PoolRow[] };

export type Window = "d7" | "d30" | "all";
export const WINDOW_LABEL: Record<Window, string> = { d7: "7d", d30: "30d", all: "All time" };

export interface DegenParts {
	/** Open notional / equity, 10x or more = 1. */
	size: number | null;
	/** Highest leverage on an open position, 1x = 0, 25x or more = 1. */
	leverage: number | null;
	/** Biggest single-period return (one month, or the 7d / 30d window), 100% or more = 1. */
	swing: number;
	/** How much of the PNL came from one period. Even months = 0, all in one = 1. */
	concentration: number;
	/** Few fills = 1. 0 fills in 14 days = 1, 2,000 or more = 0, log scale. */
	fewTrades: number | null;
}

export interface DirTrader {
	id: string;
	name: string;
	named: boolean;
	style: string | null;
	inPool: boolean;
	equity: number;
	pnl: Record<Window, number | null>;
	/** Fills a day over the last 14 days. null = not in the snapshot. */
	tradesDay: number | null;
	/** true when the fills API cap (2,000 in 14 days) was hit, so the real count is higher. */
	tradesCapped: boolean;
	consistency: number;
	consistencyBasis: "months" | "windows";
	degen: number;
	degenParts: DegenParts;
	/** Number of real inputs behind the degen score (5 for pool traders, 2 for leaderboard only). */
	degenInputs: number;
	maxLev: number | null;
	exposure: number | null;
	/** -100 all short .. +100 all long, from open notional. null = no positions in the snapshot. */
	lean: number | null;
	months: { m: string; pnl: number }[] | null;
	positions: PoolPosition[];
	/** Example value. */
	followers: number;
}

const clamp01 = (n: number) => Math.min(1, Math.max(0, n));

function seeded(id: string, salt: number) {
	let h = 2166136261 ^ salt;
	for (let i = 2; i < id.length; i++) h = Math.imul(h ^ id.charCodeAt(i), 16777619);
	return ((h >>> 0) % 10_000) / 10_000;
}

const levOf = (s: string) => Number.parseFloat(s) || 1;

function monthConcentration(months: { pnl: number }[]) {
	const abs = months.map((m) => Math.abs(m.pnl));
	const sum = abs.reduce((a, b) => a + b, 0);
	if (months.length < 2 || sum === 0) return 1;
	const even = 1 / months.length;
	return clamp01((Math.max(...abs) / sum - even) / (1 - even));
}

function windowConcentration(r: LbRow) {
	const recent = Math.abs(r.month.pnl);
	const before = Math.abs(r.allTime.pnl - r.month.pnl);
	return recent + before ? recent / (recent + before) : 0;
}

/**
 * Degen score, 0..100. High = a few big "hail mary" trades. Low = many small consistent trades.
 *
 *   degen = round(100 × mean of the parts that exist for this trader)
 *
 * Parts, each 0..1 (see DegenParts):
 *   size          open notional / equity, capped at 10x            (pool only, from open positions)
 *   leverage      (max leverage − 1) / 24, capped                  (pool only, from open positions)
 *   swing         biggest |month PNL| / equity, capped at 100%     (pool: monthly PNL)
 *                 or max(|7d ROI|, |30d ROI|), capped at 100%      (leaderboard only)
 *   concentration share of |PNL| in the biggest month, rescaled so even months = 0
 *                 (pool), or |30d PNL| / (|30d PNL| + |PNL before|) (leaderboard only)
 *   fewTrades     1 − ln(1 + fills in 14 days) / ln(2001)          (pool only)
 *
 * Leaderboard-only traders have 2 of 5 inputs; the directory says so on their row.
 */
function degenOf(p: Omit<DegenParts, "fewTrades"> & { fewTrades: number | null }) {
	const parts = [p.size, p.leverage, p.swing, p.concentration, p.fewTrades].filter((n): n is number => n !== null);
	return { score: Math.round((100 * parts.reduce((a, b) => a + b, 0)) / parts.length), inputs: parts.length };
}

/**
 * Consistency, 0..100.
 * Pool traders: 70 × share of months in profit + 30 × (1 − concentration).
 * Leaderboard only: the round 1 score (track record before the last 30 days 50, 7d / 30d / all-time
 * windows in profit 30, all-time ROI 20). See ../copy-trader/data.ts scoreOf().
 */
function poolConsistency(p: PoolRow, concentration: number) {
	return Math.round(70 * (p.nmonths ? p.green / p.nmonths : 0) + 30 * (1 - concentration));
}

function followersOf(id: string, consistency: number) {
	return Math.round(3 + seeded(id, 11) * 40 + (consistency / 100) ** 2 * 360);
}

const shortAddr = (a: string) => `${a.slice(0, 6)}…${a.slice(-4)}`;

function fromPool(p: PoolRow, lb: LbRow | undefined): DirTrader {
	const id = p.usr.toLowerCase();
	const gross = p.positions.reduce((a, x) => a + x.ntl, 0);
	const long = p.positions.filter((x) => x.szi > 0).reduce((a, x) => a + x.ntl, 0);
	const maxLev = p.positions.length ? Math.max(...p.positions.map((x) => levOf(x.lev))) : null;
	const exposure = p.acct > 0 && p.positions.length ? gross / p.acct : null;
	const concentration = monthConcentration(p.months);
	const parts: DegenParts = {
		size: exposure === null ? null : clamp01(exposure / 10),
		leverage: maxLev === null ? null : clamp01((maxLev - 1) / 24),
		swing: p.acct > 0 ? clamp01(Math.max(...p.months.map((m) => Math.abs(m.pnl))) / p.acct) : 1,
		concentration,
		fewTrades: clamp01(1 - Math.log(1 + p.fills14) / Math.log(2001)),
	};
	const d = degenOf(parts);
	const consistency = poolConsistency(p, concentration);
	return {
		id,
		name: p.name,
		named: true,
		style: p.style,
		inPool: true,
		equity: p.acct,
		pnl: { d7: lb ? lb.week.pnl : null, d30: p.pnl30, all: p.pnlAll },
		tradesDay: p.fills14 / 14,
		tradesCapped: p.fills14 >= 2000,
		consistency,
		consistencyBasis: "months",
		degen: d.score,
		degenParts: parts,
		degenInputs: d.inputs,
		maxLev,
		exposure,
		lean: gross ? Math.round((100 * (2 * long - gross)) / gross) : null,
		months: p.months,
		positions: p.positions,
		followers: followersOf(id, consistency),
	};
}

function fromLeaderboard(r: LbRow): DirTrader {
	const id = r.address.toLowerCase();
	const parts: DegenParts = {
		size: null,
		leverage: null,
		swing: clamp01(Math.max(Math.abs(r.week.roi), Math.abs(r.month.roi))),
		concentration: windowConcentration(r),
		fewTrades: null,
	};
	const d = degenOf(parts);
	const consistency = scoreOf(r).score;
	return {
		id,
		name: r.displayName ?? shortAddr(r.address),
		named: !!r.displayName,
		style: null,
		inPool: false,
		equity: r.accountValue,
		pnl: { d7: r.week.pnl, d30: r.month.pnl, all: r.allTime.pnl },
		tradesDay: null,
		tradesCapped: false,
		consistency,
		consistencyBasis: "windows",
		degen: d.score,
		degenParts: parts,
		degenInputs: d.inputs,
		maxLev: null,
		exposure: null,
		lean: null,
		months: null,
		positions: [],
		followers: followersOf(id, consistency),
	};
}

const lbById = new Map(leaderboard.rows.map((r) => [r.address.toLowerCase(), r]));
const poolIds = new Set(pool.traders.map((p) => p.usr.toLowerCase()));

export const directory: DirTrader[] = [
	...pool.traders.map((p) => fromPool(p, lbById.get(p.usr.toLowerCase()))),
	...leaderboard.rows.filter((r) => !poolIds.has(r.address.toLowerCase())).map(fromLeaderboard),
];

export const byId = new Map(directory.map((t) => [t.id, t]));
export const DEFAULT_BASKET: string[] = MOOD_POOL.map((u) => u.toLowerCase());

export type SortKey = "pnl" | "trades" | "consistency" | "degen" | "followers";
export const SORT_LABEL: Record<SortKey, string> = {
	pnl: "PNL",
	trades: "Trades a day",
	consistency: "Consistency",
	degen: "Degen score",
	followers: "Followers",
};
export const SORT_KEYS: SortKey[] = ["pnl", "trades", "consistency", "degen"];

export function sortValue(t: DirTrader, key: SortKey, window: Window): number | null {
	if (key === "pnl") return t.pnl[window];
	if (key === "trades") return t.tradesDay;
	return t[key];
}

export const isAddress = (s: string) => /^0x[0-9a-fA-F]{40}$/.test(s.trim());

export interface Query {
	sort: SortKey;
	window: Window;
	dir?: "desc" | "asc";
	text?: string;
}

/** Missing values always sort last, whatever the direction. */
export function queryDirectory({ sort, window, dir = "desc", text = "" }: Query): DirTrader[] {
	const q = text.trim().toLowerCase();
	const sign = dir === "desc" ? -1 : 1;
	return directory
		.filter((t) => !q || t.name.toLowerCase().includes(q) || t.id.includes(q) || t.style?.toLowerCase().includes(q))
		.sort((a, b) => {
			const va = sortValue(a, sort, window);
			const vb = sortValue(b, sort, window);
			if (va === null && vb === null) return 0;
			if (va === null) return 1;
			if (vb === null) return -1;
			return sign * (va - vb) || b.equity - a.equity;
		});
}

/** A pasted address that is not in either snapshot: copyable, but no stats until its history loads. */
export function pastedTrader(address: string): DirTrader {
	const id = address.trim().toLowerCase();
	return (
		byId.get(id) ?? {
			id,
			name: shortAddr(id),
			named: false,
			style: null,
			inPool: false,
			equity: 0,
			pnl: { d7: null, d30: null, all: null },
			tradesDay: null,
			tradesCapped: false,
			consistency: 0,
			consistencyBasis: "windows",
			degen: 0,
			degenParts: { size: null, leverage: null, swing: 0, concentration: 0, fewTrades: null },
			degenInputs: 0,
			maxLev: null,
			exposure: null,
			lean: null,
			months: null,
			positions: [],
			followers: 0,
		}
	);
}

export function isListed(id: string) {
	return byId.has(id.toLowerCase());
}

export interface BasketMood {
	score: number;
	posScore: number;
	longCount: number;
	shortCount: number;
	/** Basket traders with a HYPE position in the mood snapshot. */
	counted: number;
}

/** Mood of an edited basket on HYPE: ../mood-traders/data.ts moodFor() over the basket ids. */
export function basketMood(ids: readonly string[]): BasketMood {
	const set = new Set(ids.map((i) => i.toLowerCase()));
	const m = moodFor(set);
	return {
		score: m.score,
		posScore: m.posScore,
		longCount: m.longCount,
		shortCount: m.shortCount,
		counted: holders.filter((h) => set.has(h.usr.toLowerCase())).length,
	};
}

export const MOOD_MARKET = "HYPE";

const moodSide = new Map(holders.map((h) => [h.usr.toLowerCase(), (h.pos?.szi ?? 0) > 0 ? "Long" : "Short"] as const));

/** Side on HYPE in the mood snapshot (the one the basket score uses). null = no HYPE position. */
export function hypeSide(id: string): "Long" | "Short" | null {
	return moodSide.get(id.toLowerCase()) ?? null;
}

export function memberNote(on: boolean, inPool: boolean) {
	if (!on) return "Off, not counted";
	return inPool ? "Pool trader" : "Added by you";
}

export function moodLabel(score: number) {
	if (score >= 15) return "Bullish";
	if (score <= -15) return "Bearish";
	return "Neutral";
}

export function degenLabel(score: number) {
	if (score >= 60) return "Hail mary";
	if (score >= 35) return "Mixed";
	return "Steady";
}

/** Jack's whale echo replay (real numbers from the call). whalePnl is an example value. */
export const echo = {
	days: 6,
	whaleTrades: 2_000,
	botTrades: 88,
	whaleFeesDay: 177,
	botFeesDay: 15,
	whaleTurnoverDay: 369,
	botTurnoverDay: 77,
	whalePnl: 3_480,
	botPnl: 3_480 + (177 - 15) * 6,
};

export const LEVERAGE_MARKS = [1, 5, 10, 20, 30, 40] as const;

function compact(a: number) {
	if (a >= 1e9) return `${(a / 1e9).toFixed(2)}B`;
	if (a >= 1e6) return `${(a / 1e6).toFixed(1)}M`;
	if (a >= 1e4) return `${(a / 1e3).toFixed(0)}K`;
	return a.toLocaleString("en-US", { maximumFractionDigits: 0 });
}

export function usd(n: number | null, signed = false) {
	if (n === null) return "n/a";
	const sign = n < 0 ? "-" : signed && n > 0 ? "+" : "";
	return `${sign}$${compact(Math.abs(n))}`;
}

export function tradesText(t: DirTrader) {
	if (t.tradesDay === null) return "n/a";
	if (t.tradesCapped) return "143+";
	return t.tradesDay < 10 ? t.tradesDay.toFixed(1) : Math.round(t.tradesDay).toString();
}

export const count = (n: number) => n.toLocaleString("en-US");
export const pnlTone = (n: number | null) => {
	if (n === null) return "text-fg-muted";
	return n >= 0 ? "text-market-up" : "text-market-down";
};

export type Stage = "pick" | "copy-picked" | "copy-running" | "basket-running";
export type Open = "directory" | "basket" | "add";
export interface VariantProps {
	stage: Stage;
	open?: Open;
	mode?: "copy" | "basket";
}

export const SCORE_NOTE =
	"Trades a day: fills in the last 14 days, pool traders only (143+ means the 2,000 fill cap). Degen: size, leverage, swing, PNL concentration, few trades. Followers are example values.";
