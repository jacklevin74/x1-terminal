// Round 2 tournament data.
//
// standings.json: one fetch of https://stats-data.hyperliquid.xyz/Mainnet/leaderboard on 2026-11-19.
// Same tier rules as round 1 (../tournament/data.ts): high = account value >= $1M, low = $1K to $100K,
// ranked by the "week" window PNL (stands in for one 7-day round), zero week volume dropped. Round 1 did
// not save day or month PNL, so rank movement and PNL paths needed this one new snapshot.
//
// Real fields: address, name, accountValue, pnl/roi/vlm (week), dayPnl, monthPnl, allTimePnl.
// Derived (real): prevRank = rank by (week PNL - day PNL), the standing 24h ago.
// Derived (real): path = cumulative PNL 30d ago, 7d ago, 1d ago, now (from month, week and day windows).
// Example values (imported from round 1): pots, 50/30/20 split, time left.
import { signedUsd as r1SignedUsd, tiers as r1Tiers, type TierId } from "../tournament/data";
import raw from "./standings.json";

export {
	clock,
	MY_TIER,
	PAYOUT_SHARE,
	pad,
	pct,
	pnlClass,
	SPLIT,
	short,
	type TierId,
	tierIds,
	usd,
	usdCompact,
	useTimeLeft,
} from "../tournament/data";

export interface Trader {
	rank: number;
	prevRank: number;
	address: string;
	name: string | null;
	accountValue: number;
	pnl: number;
	roi: number;
	vlm: number;
	dayPnl: number;
	monthPnl: number;
	allTimePnl: number;
}

interface RawTier {
	count: number;
	top: Trader[];
	you: Trader;
}

const data = raw as unknown as { capturedAt: string; high: RawTier; low: RawTier };

export interface Tier {
	id: TierId;
	label: string;
	short: string;
	rule: string;
	count: number;
	traders: Trader[];
	you: Trader;
	pot: number;
	payouts: number[];
	feeVolume: number;
}

function build(id: TierId): Tier {
	const r1 = r1Tiers[id];
	const d = data[id];
	return {
		id,
		label: r1.label,
		short: r1.short,
		rule: r1.rule,
		count: d.count,
		traders: d.top,
		you: d.you,
		pot: r1.pot,
		payouts: r1.payouts,
		feeVolume: r1.pot / 0.0005,
	};
}

export const tiers: Record<TierId, Tier> = { high: build("high"), low: build("low") };

export const me = tiers.low.you;

export const SNAPSHOT = data.capturedAt.slice(0, 10);

export const FEE_RATE = 0.0005;

export const signedUsd = (n: number, compact = false) => r1SignedUsd(compact ? Math.round(n) : n, compact);

export const move = (t: Trader) => t.prevRank - t.rank;

export const path = (t: Trader) => [0, t.monthPnl - t.pnl, t.monthPnl - t.dayPnl, t.monthPnl];

export const traderName = (t: Trader) => t.name ?? `${t.address.slice(0, 6)}…${t.address.slice(-4)}`;

export const ordinal = ["1st", "2nd", "3rd"] as const;

export function prizeFor(tier: Tier, rank: number) {
	return rank <= 3 ? tier.payouts[rank - 1] : 0;
}

export function moversOf(tier: Tier) {
	return [...tier.traders].sort((a, b) => move(b) - move(a)).slice(0, 5);
}

const ROUND_MS = 7 * 24 * 3600 * 1000;

export function roundDates(msLeft: number) {
	const end = new Date(Date.now() + msLeft);
	const start = new Date(end.getTime() - ROUND_MS);
	const f = (d: Date) => d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
	return { start: f(start), end: f(end), startDate: start, endDate: end };
}
