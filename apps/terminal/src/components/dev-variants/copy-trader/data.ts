// Shared data for the copy-trader round.
//
// leaderboard.json: real snapshot of https://stats-data.hyperliquid.xyz/Mainnet/leaderboard
// fetched once on 2026-11-18. Trimmed to accounts with at least $50K equity that actually trade
// (all-time volume >= account value): the top 40 by all-time PNL, the top 25 by 30-day PNL and
// the 5 traders that dominate a market in the mood ring snapshot (../mood-ring/signal.json).
//
// Real fields: address, displayName, accountValue, and pnl / roi / vlm for day, week, month, allTime.
// Example fields (the leaderboard does not have them): followers, lean, and the coin list for
// traders outside the mood ring snapshot. They are deterministic so the gallery is stable.
import signal from "../mood-ring/signal.json";
import raw from "./leaderboard.json";

export interface Perf {
	pnl: number;
	roi: number;
	vlm: number;
}

export interface Row {
	address: string;
	displayName: string | null;
	accountValue: number;
	day: Perf;
	week: Perf;
	month: Perf;
	allTime: Perf;
}

export type Grade = "Consistent" | "Mixed" | "One big run" | "Losing" | "Unrated";

export interface ScoreParts {
	/** 0..50. Share of all-time PNL that was made before the last 30 days. */
	track: number;
	/** 0..30. Week, month and all-time PNL windows in profit, 10 points each. */
	windows: number;
	/** 0..20. All-time ROI, capped at 200%. */
	returns: number;
}

export interface Trader extends Row {
	name: string;
	score: number;
	grade: Grade;
	parts: ScoreParts;
	/** Share of all-time PNL made in the last 30 days, 0..1. High = one recent run. */
	recentShare: number;
	/** Average 30-day notional traded per day as a % of account value (real). */
	turnoverDay: number;
	/** -100 (all short) .. +100 (all long). Example value. */
	lean: number;
	/** X1 users copying this trader. Example value. */
	followers: number;
	coins: string[];
	/** true when the coin list comes from the mood ring snapshot. */
	coinsReal: boolean;
	/** Cumulative PNL at: start, 30d ago, 7d ago, 1d ago, now. Real, derived from the four windows. */
	path: number[];
}

export const snapshot = raw as { source: string; capturedAt: string; rows: Row[] };

const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));

/**
 * Consistency score, 0..100, from leaderboard fields only.
 *
 * The leaderboard has no month-by-month history, so the score uses what it has:
 * 1. Track record (50): how much of the all-time PNL existed before the last 30 days.
 *    A trader who made everything in one recent run scores 0 here.
 * 2. Windows in profit (30): week, month and all-time PNL above zero, 10 points each.
 * 3. Returns (20): all-time ROI, capped at 200%, so size alone does not win.
 *
 * Grades: 70+ Consistent, 40..69 Mixed, below 40 One big run, all-time PNL <= 0 Losing.
 * A real 12-18 month check needs the per-trader portfolio history (one request per trader);
 * this snapshot does not include it.
 */
export function scoreOf(r: Row): { score: number; grade: Grade; parts: ScoreParts; recentShare: number } {
	const all = r.allTime.pnl;
	const recentShare = all > 0 ? clamp(Math.max(r.month.pnl, 0) / all, 0, 1) : 1;
	const track = all > 0 ? Math.round(50 * (1 - recentShare)) : 0;
	const windows = [r.week, r.month, r.allTime].filter((w) => w.pnl > 0).length * 10;
	const returns = Math.round(20 * clamp(r.allTime.roi / 2, 0, 1));
	const score = track + windows + returns;
	return { score, grade: gradeOf(all, score), parts: { track, windows, returns }, recentShare };
}

function gradeOf(allTimePnl: number, score: number): Grade {
	if (allTimePnl <= 0) return "Losing";
	if (score >= 70) return "Consistent";
	if (score >= 40) return "Mixed";
	return "One big run";
}

// Deterministic 0..1 value per address and salt, for example fields.
function seeded(address: string, salt: number) {
	let h = 2166136261 ^ salt;
	for (let i = 2; i < address.length; i++) h = Math.imul(h ^ address.charCodeAt(i), 16777619);
	return ((h >>> 0) % 10_000) / 10_000;
}

export const COINS = ["BTC", "ETH", "SOL", "HYPE", "ZEC", "XRP"] as const;

// Real: in the mood ring snapshot these traders hold the largest share of a market.
const dominantCoins = new Map<string, string[]>();
for (const c of signal.coins) {
	if (!c.dominant) continue;
	const k = c.dominant.usr.toLowerCase();
	dominantCoins.set(k, [...(dominantCoins.get(k) ?? []), c.coin]);
}

// Jack named this account on the call: short almost everything since August.
const KNOWN_LEAN: Record<string, number> = { "0xfc27136e42af1732ddc9ce2605ea9bff1b959d9d": -88 };

export const shortAddr = (a: string) => `${a.slice(0, 6)}…${a.slice(-4)}`;

function build(r: Row): Trader {
	const s = scoreOf(r);
	const key = r.address.toLowerCase();
	const real = dominantCoins.get(key);
	const coins = real
		? [...new Set(["BTC", ...real.filter((c) => !c.startsWith("xyz:"))])].concat(
				real.filter((c) => c.startsWith("xyz:")),
			)
		: COINS.filter((_, i) => (i === 0 ? seeded(key, 1) < 0.8 : seeded(key, i + 2) < 0.4));
	const lean = KNOWN_LEAN[key] ?? (Math.round((seeded(key, 9) * 2 - 1) * 90) || 0);
	const followers = Math.round(4 + seeded(key, 11) * 30 + (s.score / 100) ** 2 * 380);
	const all = r.allTime.pnl;
	return {
		...r,
		...s,
		name: r.displayName ?? shortAddr(r.address),
		turnoverDay: r.accountValue > 0 ? (r.month.vlm / r.accountValue / 30) * 100 : 0,
		lean,
		followers,
		coins: coins.length ? coins : ["BTC"],
		coinsReal: !!real,
		path: [0, all - r.month.pnl, all - r.week.pnl, all - r.day.pnl, all],
	};
}

// A copy bot needs a trader who still trades: keep accounts that traded at least 30% of their
// equity in the last 30 days (about 1% a day on average).
export const traders: Trader[] = snapshot.rows
	.filter((r) => r.month.vlm >= r.accountValue * 0.3)
	.map(build)
	.sort((a, b) => b.score - a.score || b.allTime.pnl - a.allTime.pnl);

export const PATH_LABELS = ["Start", "30d ago", "7d ago", "1d ago", "Now"] as const;

export type Lean = "all" | "bull" | "bear";
export function leanOf(n: number): Exclude<Lean, "all"> | "flat" {
	if (n >= 20) return "bull";
	if (n <= -20) return "bear";
	return "flat";
}
export const LEAN_LABEL = { bull: "Bullish", bear: "Bearish", flat: "Neutral" } as const;

export type Sort = "score" | "month" | "allTime" | "followers";
export const SORT_LABEL: Record<Sort, string> = {
	score: "Score",
	month: "30d PNL",
	allTime: "All-time PNL",
	followers: "Followers",
};

function sortValue(t: Trader, sort: Sort) {
	if (sort === "score") return t.score;
	if (sort === "followers") return t.followers;
	return t[sort].pnl;
}

export function topTraders(coin: string, lean: Lean = "all", sort: Sort = "score", limit = 50) {
	return traders
		.filter((t) => t.coins.includes(coin))
		.filter((t) => lean === "all" || leanOf(t.lean) === lean)
		.sort((a, b) => sortValue(b, sort) - sortValue(a, sort) || b.allTime.pnl - a.allTime.pnl)
		.slice(0, limit);
}

export const isAddress = (s: string) => /^0x[0-9a-fA-F]{40}$/.test(s.trim());

/** A pasted address: use the leaderboard row when the address is on it. */
export function traderFromAddress(s: string): Trader | null {
	const a = s.trim().toLowerCase();
	if (!isAddress(a)) return null;
	return traders.find((t) => t.address.toLowerCase() === a) ?? null;
}

const NO_PERF: Perf = { pnl: 0, roi: 0, vlm: 0 };

/** A pasted address that is not in the snapshot: no score, no stats until its history loads. */
export function unlistedTrader(address: string): Trader {
	return {
		address,
		displayName: null,
		accountValue: 0,
		day: NO_PERF,
		week: NO_PERF,
		month: NO_PERF,
		allTime: NO_PERF,
		name: shortAddr(address),
		score: 0,
		grade: "Unrated",
		parts: { track: 0, windows: 0, returns: 0 },
		recentShare: 0,
		turnoverDay: 0,
		lean: 0,
		followers: 0,
		coins: [],
		coinsReal: false,
		path: [0, 0, 0, 0, 0],
	};
}

// Jack's whale echo replay (real numbers from the call): $100K deposit, 6 days.
// The whale trades about 2,000 times; the low-churn bot trades 88 times for the same PNL.
// The dollar PNL was not read out on the call, so whalePnl is an example value; the bot's PNL
// is the same gross PNL plus the fee difference over 6 days ((177 - 15) x 6 = $972).
export const echo = {
	deposit: 100_000,
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

export const usd = (n: number, signed = false) => {
	const v = compact(Math.abs(n));
	const sign = n < 0 ? "-" : signed && n > 0 ? "+" : "";
	return `${sign}$${v}`;
};

export const pct = (n: number) => `${n >= 0 ? "+" : "-"}${Math.abs(n * 100).toFixed(0)}%`;
export const count = (n: number) => n.toLocaleString("en-US");
export const coinName = (c: string) => c.replace(/^xyz:/, "");

/** Markets for the basket mode card: the mood ring snapshot's coins. */
export const basketMarkets = signal.coins.map((c) => c.coin);

export type Stage = "pick" | "running";
export interface VariantProps {
	initial: Stage;
}
