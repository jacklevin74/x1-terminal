// Real snapshot of the mood pool, fetched once (see mood-snapshot.json "source").
// Copied from dev-variants/mood-traders/data.ts. Positions, accounts and profiles come from
// /api/daytraders. The HYPE coin record comes from /api/daytraders?view=sent, taken 19 seconds later.
//
// Score math matches the shipped signal for the full pool:
//   posScore = 100 × (long notional − short notional) / (long + short), over the selected traders
//   score    = 0.6 × posScore + 0.4 × flowScore
// Per-trader order flow is not in the snapshot, so flowScore stays the pool value.
import type { MoodCoin } from "@/lib/mood/signal";
import raw from "./mood-snapshot.json";

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

const snapshot = raw as unknown as { now: number; coin: MoodCoin; traders: Trader[] };
const coin = snapshot.coin;

export const ALL = snapshot.traders.map((t) => t.usr);

export const holders = [...snapshot.traders].filter((t) => t.pos).sort((a, b) => (b.pos?.ntl ?? 0) - (a.pos?.ntl ?? 0));

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
