// Shared data for the tournament round. Real snapshot of
// https://stats-data.hyperliquid.xyz/Mainnet/leaderboard captured 2026-11-18.
// Tiers split by account value (>= $1M, and $1K to $100K; emptied accounts under $1K are dropped), ranked by the "week" window PNL,
// which stands in for one 7-day round. Rows with zero week volume are dropped.
// "you" is a real account from the low tier at about the 18th percentile, used as the example connected user.
// A user plays at one table only, chosen by account value, so the example user sits at the low table.
import { useEffect, useState } from "react";
import raw from "./leaderboard.json";

export interface Trader {
	rank: number;
	address: string;
	name: string | null;
	accountValue: number;
	pnl: number;
	roi: number;
	vlm: number;
}

export type TierId = "high" | "low";

interface TierData {
	count: number;
	top: Trader[];
	you: Trader;
	topVlm: number;
}

const data = raw as Record<TierId, TierData>;

export const FEE_BPS = 5;
export const PAYOUT_SHARE = 0.8;
export const SPLIT = [0.5, 0.3, 0.2] as const;

// Example pots. Jack's estimate on the call is $50K to $100K per round.
const EXAMPLE_POT: Record<TierId, number> = { high: 84_200, low: 12_600 };

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
}

function build(id: TierId, label: string, short: string, rule: string): Tier {
	const d = data[id];
	const pot = EXAMPLE_POT[id];
	return {
		id,
		label,
		short,
		rule,
		count: d.count,
		traders: d.top,
		you: d.you,
		pot,
		payouts: SPLIT.map((s) => pot * PAYOUT_SHARE * s),
	};
}

export const tiers: Record<TierId, Tier> = {
	high: build("high", "High table", "$1M+", "Accounts over $1M"),
	low: build("low", "Low table", "Under $100K", "Accounts under $100K"),
};

export const tierIds: TierId[] = ["high", "low"];

export const ROUND = { number: 1, days: 7 };

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
		progress: 1 - ms / ROUND_MS,
	};
}

export const pad = (n: number) => String(n).padStart(2, "0");

export const clock = (t: { d: number; h: number; m: number; s: number }) =>
	`${t.d}d ${pad(t.h)}h ${pad(t.m)}m ${pad(t.s)}s`;

export const usd = (n: number, digits = 0) =>
	`${n < 0 ? "-" : ""}$${Math.abs(n).toLocaleString("en-US", { minimumFractionDigits: digits, maximumFractionDigits: digits })}`;

export const usdCompact = (n: number) => {
	const a = Math.abs(n);
	let v = a.toFixed(0);
	if (a >= 1e9) v = `${(a / 1e9).toFixed(2)}B`;
	else if (a >= 1e6) v = `${(a / 1e6).toFixed(2)}M`;
	else if (a >= 1e3) v = `${(a / 1e3).toFixed(1)}K`;
	return `${n < 0 ? "-" : ""}$${v}`;
};

export const signedUsd = (n: number, compact = false) => {
	const body = compact ? usdCompact(Math.abs(n)) : usd(Math.abs(n));
	if (n > 0) return `+${body}`;
	if (n < 0) return `-${body}`;
	return body;
};

export const pct = (n: number) => `${n >= 0 ? "+" : "-"}${Math.abs(n * 100).toFixed(2)}%`;

export const short = (a: string) => `${a.slice(0, 6)}…${a.slice(-4)}`;

export const traderName = (t: Trader) => t.name ?? short(t.address);

export const pnlClass = (n: number) => (n >= 0 ? "text-market-up" : "text-market-down");

export const placeLabel = ["1st", "2nd", "3rd"] as const;

export const MY_TIER: TierId = "low";
export const me = tiers[MY_TIER].you;
