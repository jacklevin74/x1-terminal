// Shared data for the mood-ring round. Real snapshot of /api/auto-trader-signal?view=sent
// captured 2026-11-09 05:18 UTC, history trimmed to 15-minute slots (24h).
import raw from "./signal.json";

export interface Coin {
	coin: string;
	score: number;
	label: string;
	pctLong: number;
	tradersLong: number;
	tradersShort: number;
	flow24h: number;
	vol24h: number;
	posScore: number;
	flowScore: number;
	dominant: { usr: string; share: number } | null;
	long: number;
	short: number;
	net: number;
	history: [number, number][];
}

export const signal = raw as { now: number; coins: Coin[] };
export const coins = signal.coins;

export const name = (c: string) => c.replace(/^xyz:/, "");
export const isStock = (c: string) => c.startsWith("xyz:");

const weighted = (pick: (c: Coin) => number) => {
	const total = coins.reduce((s, c) => s + c.vol24h, 0);
	return Math.round(coins.reduce((s, c) => s + pick(c) * c.vol24h, 0) / total);
};

// Market-wide mood: 24h-volume-weighted mean of the per-coin scores.
// The API has no single overall score, so this is derived here.
export const overall = {
	score: weighted((c) => c.score),
	posScore: weighted((c) => c.posScore),
	flowScore: weighted((c) => c.flowScore),
	bullish: coins.filter((c) => c.score >= 20).length,
	bearish: coins.filter((c) => c.score <= -20).length,
	neutral: coins.filter((c) => c.score > -20 && c.score < 20).length,
	history: (() => {
		const slots = new Map<number, { s: number; w: number }>();
		for (const c of coins)
			for (const [t, s] of c.history) {
				const v = slots.get(t) ?? { s: 0, w: 0 };
				v.s += s * c.vol24h;
				v.w += c.vol24h;
				slots.set(t, v);
			}
		return [...slots.entries()]
			.sort((a, b) => a[0] - b[0])
			.map(([t, v]) => [t, Math.round(v.s / v.w)] as [number, number]);
	})(),
};

export const labelOf = (s: number) =>
	s >= 60 ? "Strong bullish" : s >= 20 ? "Bullish" : s <= -60 ? "Strong bearish" : s <= -20 ? "Bearish" : "Neutral";

export const signed = (s: number) => (s > 0 ? `+${s}` : s < 0 ? `\u2212${-s}` : "0");

// Score → colour. Interpolates in OKLCH between the terminal's error, a neutral grey and success.
export const moodColor = (s: number) => {
	const t = Math.max(-100, Math.min(100, s)) / 100;
	if (t >= 0) return `color-mix(in oklch, #2ee6a6 ${Math.round(t * 100)}%, #8b8b98)`;
	return `color-mix(in oklch, #ff5c6c ${Math.round(-t * 100)}%, #8b8b98)`;
};

export const usd = (n: number) => {
	const a = Math.abs(n);
	const v =
		a >= 1e9
			? `${(a / 1e9).toFixed(2)}B`
			: a >= 1e6
				? `${(a / 1e6).toFixed(1)}M`
				: a >= 1e3
					? `${(a / 1e3).toFixed(0)}K`
					: a.toFixed(0);
	return `${n < 0 ? "-" : ""}$${v}`;
};

export const short = (a: string) => `${a.slice(0, 6)}…${a.slice(-4)}`;

// Auto Trader target weight: w = s/100 outside the ±15 flat band, 0 inside it.
export const weight = (s: number) => (Math.abs(s) <= 15 ? 0 : s / 100);

export const sparkPath = (h: [number, number][], w: number, hgt: number) => {
	const xs = h.map((_, i) => (i / Math.max(1, h.length - 1)) * w);
	return h
		.map(([, s], i) => `${i ? "L" : "M"}${xs[i].toFixed(1)} ${((1 - (s + 100) / 200) * hgt).toFixed(1)}`)
		.join(" ");
};

export const updated = new Date(signal.now).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
