// Real snapshot, fetched once from /api/daytraders (see snapshot.json "source").
// The example user account is a real pool trader (0x0ca4…0fa8): $33K equity, four open perps.
// botMarkets is the real 18-market list the Auto Trader trades (the mood signal universe).
// Bot rule from the call: markets on the list get resized, positions in other coins can be closed.
import type { AutoTraderSettings } from "@/lib/auto-trader/types";
import raw from "./snapshot.json";

export interface Position {
	coin: string;
	szi: number;
	ntl: number;
	entry: number;
	mark: number;
	upnl: number;
	lev: string;
	liq: number | null;
}

export const snapshot = raw as unknown as {
	now: number;
	account: { usr: string; name: string; equity: number };
	positions: Position[];
	botMarkets: string[];
};

export const account = snapshot.account;
export const positions = [...snapshot.positions].sort((a, b) => b.ntl - a.ntl);
export const botMarkets = snapshot.botMarkets;

const base = (c: string) => c.split(":").at(-1) ?? c;
export const onList = (p: Position) => botMarkets.some((m) => base(m) === base(p.coin));
export const resized = positions.filter(onList);
export const atRisk = positions.filter((p) => !onList(p));
export const coinLabel = (c: string) => c.replace(/^xyz:/, "");

export const BOT: AutoTraderSettings = { leverage: 3, killPct: 0.1, minOrderUsd: 10, include: null, exclude: [] };

export function usd(n: number, digits = 0) {
	const sign = n < 0 ? "−" : "";
	return `${sign}$${Math.abs(n).toLocaleString("en-US", { minimumFractionDigits: digits, maximumFractionDigits: digits })}`;
}

export function signedUsd(n: number) {
	return `${n >= 0 ? "+" : "−"}$${Math.abs(n).toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
}

export function sizeText(p: Position) {
	return `${Math.abs(p.szi).toLocaleString("en-US", { maximumFractionDigits: 2 })} ${coinLabel(p.coin)}`;
}

export type Scene = "manual" | "start" | "close";

export interface SceneProps {
	scene: Scene;
}
