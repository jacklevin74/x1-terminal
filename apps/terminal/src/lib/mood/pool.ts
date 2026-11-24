import { useQuery } from "@tanstack/react-query";
import { type MoodCoin, type MoodSignal, shortAddress, withOverall } from "./signal";

export interface PoolPosition {
	coin: string;
	szi: number;
	ntl: number;
	entry: number;
	mark: number;
	upnl: number;
	lev: string;
	liq: number | null;
}

export interface PoolTrader {
	usr: string;
	name: string;
	acct: number;
	pnl30: number;
	pnlAll: number;
	green: number;
	months: number;
	positions: Map<string, PoolPosition>;
}

export type Stance = "bullish" | "neutral" | "bearish";

interface RawPool {
	profiles?: { usr: string; nickname?: string | null; green?: number; nmonths?: number; pnlAll?: number }[];
	accounts?: { usr: string; acct?: number; pnl30?: number; pnlAll?: number }[];
	positions?: (PoolPosition & { usr: string })[];
}

export function parsePool(raw: RawPool): PoolTrader[] {
	const accounts = new Map((raw.accounts ?? []).map((a) => [a.usr.toLowerCase(), a]));
	const positions = new Map<string, Map<string, PoolPosition>>();
	for (const p of raw.positions ?? []) {
		const usr = p.usr.toLowerCase();
		const list = positions.get(usr) ?? new Map<string, PoolPosition>();
		list.set(p.coin, {
			coin: p.coin,
			szi: p.szi,
			ntl: p.ntl,
			entry: p.entry,
			mark: p.mark,
			upnl: p.upnl,
			lev: p.lev,
			liq: p.liq ?? null,
		});
		positions.set(usr, list);
	}
	return (raw.profiles ?? []).map((p) => {
		const usr = p.usr.toLowerCase();
		const a = accounts.get(usr);
		return {
			usr,
			name: p.nickname || shortAddress(usr),
			acct: a?.acct ?? 0,
			pnl30: a?.pnl30 ?? 0,
			pnlAll: a?.pnlAll ?? p.pnlAll ?? 0,
			green: p.green ?? 0,
			months: p.nmonths ?? 0,
			positions: positions.get(usr) ?? new Map(),
		};
	});
}

async function fetchPool(signal: AbortSignal) {
	const response = await fetch("/api/auto-trader-signal", { signal, cache: "no-store" });
	if (!response.ok) throw new Error(`Mood pool request failed (${response.status})`);
	return parsePool(await response.json());
}

export function useMoodPool() {
	return useQuery({
		queryKey: ["mood", "pool"],
		queryFn: ({ signal }) => fetchPool(signal),
		refetchInterval: 60_000,
		staleTime: 30_000,
		retry: 1,
	});
}

export function stanceOn(t: PoolTrader, coin: string): Stance {
	const p = t.positions.get(coin);
	if (!p) return "neutral";
	return p.szi > 0 ? "bullish" : "bearish";
}

export function positionScore(pool: PoolTrader[], coin: string, selected?: ReadonlySet<string>) {
	let long = 0;
	let short = 0;
	for (const t of pool) {
		if (selected && !selected.has(t.usr)) continue;
		const p = t.positions.get(coin);
		if (!p) continue;
		if (p.szi > 0) long += p.ntl;
		else short += p.ntl;
	}
	const total = long + short;
	return total ? (100 * (long - short)) / total : 0;
}

const clamp = (n: number) => Math.max(-100, Math.min(100, Math.round(n)));

function personalCoin(c: MoodCoin, pool: PoolTrader[], selected: ReadonlySet<string>): MoodCoin {
	const shift = positionScore(pool, c.coin, selected) - positionScore(pool, c.coin);
	let tradersLong = 0;
	let tradersShort = 0;
	for (const t of pool) {
		if (!selected.has(t.usr)) continue;
		const s = stanceOn(t, c.coin);
		if (s === "bullish") tradersLong++;
		if (s === "bearish") tradersShort++;
	}
	return {
		...c,
		score: clamp(c.score + 0.6 * shift),
		posScore: clamp(c.posScore + shift),
		tradersLong,
		tradersShort,
	};
}

export function isWholePool(pool: PoolTrader[], selected: ReadonlySet<string>) {
	return pool.every((t) => selected.has(t.usr));
}

export function personalSignal(signal: MoodSignal, pool: PoolTrader[] | undefined, selected: ReadonlySet<string>) {
	if (!pool?.length || isWholePool(pool, selected)) return signal;
	return withOverall(
		signal.now,
		signal.coins.map((c) => personalCoin(c, pool, selected)),
	);
}
