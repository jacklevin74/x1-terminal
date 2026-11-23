// Real snapshot of the mood pool, fetched once (see snapshot.json "source").
// Positions, accounts and profiles come from /api/daytraders. The HYPE coin record comes from
// /api/daytraders?view=sent, taken 19 seconds later.
//
// Score math matches the shipped signal for the full pool:
//   posScore = 100 × (long notional − short notional) / (long + short), over the selected traders
//   score    = 0.6 × posScore + 0.4 × flowScore
// With all 37 selected this gives posScore 34 and score 20, the same as the server for HYPE.
// Per-trader order flow is not in the snapshot, so flowScore stays the pool value (−1).
import type { MoodCoin } from "@/lib/mood/signal";
import raw from "./snapshot.json";

export interface Trader {
	usr: string;
	name: string;
	acct: number;
	pnl30: number;
	pnlAll: number;
	green: number;
	months: number;
	pos: { szi: number; ntl: number; entry: number; upnl: number; lev: string } | null;
}

export const snapshot = raw as unknown as { now: number; coin: MoodCoin; traders: Trader[] };
export const coin = snapshot.coin;
export const traders = snapshot.traders;
export const MARKET = "HYPE";
export const ALL = traders.map((t) => t.usr);

export const holders = [...traders].filter((t) => t.pos).sort((a, b) => (b.pos?.ntl ?? 0) - (a.pos?.ntl ?? 0));
export const flat = traders.filter((t) => !t.pos);

export const isLong = (t: Trader) => (t.pos?.szi ?? 0) > 0;
export const isConsistent = (t: Trader) => t.green >= 3;

export const PRESETS = {
	all: ALL,
	top: [...traders]
		.sort((a, b) => b.pnlAll - a.pnlAll)
		.slice(0, 10)
		.map((t) => t.usr),
	consistent: traders.filter(isConsistent).map((t) => t.usr),
};

export interface Mood {
	score: number;
	posScore: number;
	long: number;
	short: number;
	longCount: number;
	shortCount: number;
}

export function moodFor(selected: ReadonlySet<string>): Mood {
	let long = 0;
	let short = 0;
	let longCount = 0;
	let shortCount = 0;
	for (const t of holders) {
		if (!selected.has(t.usr) || !t.pos) continue;
		if (t.pos.szi > 0) {
			long += t.pos.ntl;
			longCount++;
		} else {
			short += t.pos.ntl;
			shortCount++;
		}
	}
	const total = long + short;
	const posScore = total ? Math.round((100 * (long - short)) / total) : 0;
	const score = Math.round(0.6 * posScore + 0.4 * coin.flowScore);
	return { score, posScore, long, short, longCount, shortCount };
}

export const poolMood = moodFor(new Set(ALL));

export function traderLabel(t: Trader) {
	return t.name || `${t.usr.slice(0, 6)}…${t.usr.slice(-4)}`;
}

export function sizeText(t: Trader) {
	if (!t.pos) return "Flat";
	return `${Math.abs(t.pos.szi).toLocaleString("en-US", { maximumFractionDigits: 0 })} ${MARKET}`;
}

export interface VariantProps {
	selected: ReadonlySet<string>;
	onChange: (next: Set<string>) => void;
}
