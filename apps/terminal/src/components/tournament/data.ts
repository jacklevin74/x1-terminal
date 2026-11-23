// Tournament data. Promoted from dev-variants/tournament-2 (data.ts + ../tournament/data.ts).
//
// standings.json: one fetch of https://stats-data.hyperliquid.xyz/Mainnet/leaderboard on 2026-11-19.
// Tiers: high = account value >= $1M, low = $1K to $100K. Ranked by the "week" window PNL
// (stands in for one 7-day round). Zero week volume dropped.
// Derived (real): prevRank = rank by (week PNL - day PNL), the standing 24h ago.
// Derived (real): path = cumulative PNL 30d ago, 7d ago, 1d ago, now.
// Example values until the contract exists: pots, time left. Split is 50/30/20 of 80% of the pot.
import { useEffect, useState } from "react";
import raw from "./standings.json";

export type TierId = "high" | "low";

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

const PAYOUT_SHARE = 0.8;
const SPLIT = [0.5, 0.3, 0.2] as const;

// Example pots. Jack's estimate on the call is $50K to $100K per round.
const EXAMPLE_POT: Record<TierId, number> = { high: 84_200, low: 12_600 };

export interface Tier {
	id: TierId;
	label: string;
	short: string;
	description: string;
	count: number;
	traders: Trader[];
	you: Trader;
	pot: number;
	payouts: number[];
}

function build(id: TierId, label: string, short: string, description: string): Tier {
	const d = data[id];
	const pot = EXAMPLE_POT[id];
	return {
		id,
		label,
		short,
		description,
		count: d.count,
		traders: d.top,
		you: d.you,
		pot,
		payouts: SPLIT.map((s) => pot * PAYOUT_SHARE * s),
	};
}

export const tiers: Record<TierId, Tier> = {
	high: build("high", "High table", "Over $1M volume", "High table is for traders with over $1M in volume."),
	low: build("low", "Low table", "Under $1M volume", "Low table is for traders with under $1M in volume."),
};

export const tierIds: TierId[] = ["high", "low"];

export const ROUND_NUMBER = 1;

export const MY_TIER: TierId = "low";
export const me = tiers[MY_TIER].you;

const ROUND_MS = 7 * 24 * 3600 * 1000;
const LEFT_AT_LOAD_MS = (2 * 24 * 3600 + 14 * 3600 + 32 * 60 + 10) * 1000;

export function useTimeLeft() {
	const [end] = useState(() => Date.now() + LEFT_AT_LOAD_MS);
	const [now, setNow] = useState(() => Date.now());
	useEffect(() => {
		const t = setInterval(() => setNow(Date.now()), 1000);
		return () => clearInterval(t);
	}, []);
	const ms = Math.max(0, end - now);
	const s = Math.floor(ms / 1000);
	return {
		ms,
		d: Math.floor(s / 86400),
		h: Math.floor((s % 86400) / 3600),
		m: Math.floor((s % 3600) / 60),
		s: s % 60,
	};
}

export function roundDates(msLeft: number) {
	const end = new Date(Date.now() + msLeft);
	const start = new Date(end.getTime() - ROUND_MS);
	const f = (d: Date) => d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
	return { start: f(start), end: f(end) };
}

export const pad = (n: number) => String(n).padStart(2, "0");

export const usd = (n: number) =>
	`${n < 0 ? "-" : ""}$${Math.abs(n).toLocaleString("en-US", { maximumFractionDigits: 0 })}`;

export const usdc = (n: number) => Math.round(n).toLocaleString("en-US");

export const usdCompact = (n: number) => {
	const a = Math.abs(n);
	let v = a.toFixed(0);
	if (a >= 1e9) v = `${(a / 1e9).toFixed(2)}B`;
	else if (a >= 1e6) v = `${(a / 1e6).toFixed(2)}M`;
	else if (a >= 1e3) v = `${(a / 1e3).toFixed(1)}K`;
	return `${n < 0 ? "-" : ""}$${v}`;
};

export const signedUsd = (n: number, compact = false) => {
	const v = compact ? Math.round(n) : n;
	const body = compact ? usdCompact(Math.abs(v)) : usd(Math.abs(v));
	if (v > 0) return `+${body}`;
	if (v < 0) return `-${body}`;
	return body;
};

export const pct = (n: number) => `${n >= 0 ? "+" : "-"}${Math.abs(n * 100).toFixed(2)}%`;

export const pnlClass = (n: number) => (n >= 0 ? "text-market-up" : "text-market-down");

export const move = (t: Trader) => t.prevRank - t.rank;

export const path = (t: Trader) => [0, t.monthPnl - t.pnl, t.monthPnl - t.dayPnl, t.monthPnl];

export const traderName = (t: Trader) => t.name ?? `${t.address.slice(0, 6)}…${t.address.slice(-4)}`;

export function prizeFor(tier: Tier, rank: number) {
	return rank <= 3 ? tier.payouts[rank - 1] : 0;
}
