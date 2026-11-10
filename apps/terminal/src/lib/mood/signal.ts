import { useQuery } from "@tanstack/react-query";

export interface MoodCoin {
	coin: string;
	score: number;
	label: string;
	pctLong: number;
	tradersLong: number;
	tradersShort: number;
	flow1h: number;
	flow24h: number;
	vol24h: number;
	posScore: number;
	flowScore: number;
	dominant: { usr: string; share: number } | null;
	long: number;
	short: number;
	history: [number, number][];
}

export interface MoodOverall {
	score: number;
	posScore: number;
	flowScore: number;
	bullish: number;
	neutral: number;
	bearish: number;
	history: [number, number][];
}

export interface MoodSignal {
	now: number;
	coins: MoodCoin[];
	overall: MoodOverall;
}

const SLOT_MS = 15 * 60 * 1000;
export const MOOD_POOL_SIZE = 37;
export const MOOD_DEADBAND = 15;

function toSlots(history: [number, number][]) {
	const slots = new Map<number, number>();
	for (const [t, s] of history) slots.set(Math.floor(t / SLOT_MS) * SLOT_MS, s);
	return [...slots.entries()].sort((a, b) => a[0] - b[0]);
}

function volumeWeighted(coins: MoodCoin[], pick: (c: MoodCoin) => number) {
	const total = coins.reduce((sum, c) => sum + c.vol24h, 0);
	if (!total) return 0;
	return Math.round(coins.reduce((sum, c) => sum + pick(c) * c.vol24h, 0) / total);
}

function overallHistory(coins: MoodCoin[]) {
	const slots = new Map<number, { s: number; w: number }>();
	for (const c of coins)
		for (const [t, s] of c.history) {
			const slot = slots.get(t) ?? { s: 0, w: 0 };
			slot.s += s * c.vol24h;
			slot.w += c.vol24h;
			slots.set(t, slot);
		}
	return [...slots.entries()]
		.sort((a, b) => a[0] - b[0])
		.filter(([, v]) => v.w > 0)
		.map(([t, v]) => [t, Math.round(v.s / v.w)] as [number, number]);
}

export function parseMoodSignal(raw: { now?: number; coins?: unknown[] }): MoodSignal {
	const coins = (raw.coins ?? [])
		.map((c) => c as MoodCoin & { score: number | null })
		.filter((c) => typeof c.score === "number")
		.map((c) => ({ ...c, dominant: c.dominant ?? null, history: toSlots(c.history ?? []).slice(-96) }));
	return {
		now: raw.now ?? Date.now(),
		coins,
		overall: {
			score: volumeWeighted(coins, (c) => c.score),
			posScore: volumeWeighted(coins, (c) => c.posScore),
			flowScore: volumeWeighted(coins, (c) => c.flowScore),
			bullish: coins.filter((c) => c.score >= 20).length,
			bearish: coins.filter((c) => c.score <= -20).length,
			neutral: coins.filter((c) => c.score > -20 && c.score < 20).length,
			history: overallHistory(coins),
		},
	};
}

async function fetchMoodSignal(signal: AbortSignal) {
	const response = await fetch("/api/auto-trader-signal?view=sent", { signal, cache: "no-store" });
	if (!response.ok) throw new Error(`Sentiment request failed (${response.status})`);
	return parseMoodSignal(await response.json());
}

export function useMoodSignal() {
	return useQuery({
		queryKey: ["mood", "signal"],
		queryFn: ({ signal }) => fetchMoodSignal(signal),
		refetchInterval: 30_000,
		staleTime: 10_000,
		retry: 1,
	});
}

export function moodLabel(score: number) {
	if (score >= 60) return "Strong bullish";
	if (score >= 20) return "Bullish";
	if (score <= -60) return "Strong bearish";
	if (score <= -20) return "Bearish";
	return "Neutral";
}

export function signedScore(score: number) {
	if (score > 0) return `+${score}`;
	if (score < 0) return `−${-score}`;
	return "0";
}

const MOOD_NEUTRAL = "oklch(0.64 0 0)";

function moodStrength(abs: number) {
	if (abs < 20) return abs * 1.5;
	return 70 + (abs - 20) * 0.375;
}

export function moodColor(score: number) {
	const s = Math.max(-100, Math.min(100, score));
	const side = s >= 0 ? "var(--color-success)" : "var(--color-error)";
	return `color-mix(in oklab, ${side} ${Math.round(moodStrength(Math.abs(s)))}%, ${MOOD_NEUTRAL})`;
}

export function moodTile(score: number) {
	return `color-mix(in oklab, ${moodColor(score)} ${Math.round(12 + Math.abs(score) * 0.5)}%, var(--color-overlay))`;
}

export function targetWeight(score: number) {
	return Math.abs(score) <= MOOD_DEADBAND ? 0 : score / 100;
}

export function coinName(coin: string) {
	return coin.replace(/^xyz:/, "");
}

export function isStockCoin(coin: string) {
	return coin.startsWith("xyz:");
}

export function compactUsd(n: number) {
	const a = Math.abs(n);
	let v = a.toFixed(0);
	if (a >= 1e9) v = `${(a / 1e9).toFixed(2)}B`;
	else if (a >= 1e6) v = `${(a / 1e6).toFixed(1)}M`;
	else if (a >= 1e3) v = `${(a / 1e3).toFixed(0)}K`;
	return `${n < 0 ? "−" : ""}$${v}`;
}

export function shortAddress(a: string) {
	return `${a.slice(0, 6)}…${a.slice(-4)}`;
}

export function sparkPath(history: [number, number][], width: number, height: number) {
	const n = Math.max(1, history.length - 1);
	return history
		.map(([, s], i) => `${i ? "L" : "M"}${((i / n) * width).toFixed(1)} ${((1 - (s + 100) / 200) * height).toFixed(1)}`)
		.join(" ");
}

export function findMoodCoin(signal: MoodSignal | undefined, marketName: string | undefined) {
	if (!signal || !marketName) return undefined;
	return signal.coins.find((c) => c.coin === marketName || coinName(c.coin) === marketName);
}
