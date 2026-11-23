// Round 3 of the mood basket picker. Austin's spec: the default drawer view shows only the number of
// traders and how many are bullish, bearish and neutral. Editing the list is one level deeper.
// Bullish = long HYPE, bearish = short HYPE, neutral = no HYPE position. Data comes from round 1 by import.
import { type BasketProps, type Trader, traders } from "../mood-traders-2/data";

export * from "../mood-traders-2/data";

export type Stance = "bullish" | "bearish" | "neutral";
export type Scene = "default" | "editing";

export interface Props extends BasketProps {
	scene: Scene;
}

export function stanceOf(t: Trader): Stance {
	if (!t.pos) return "neutral";
	return t.pos.szi > 0 ? "bullish" : "bearish";
}

export const STANCES: { id: Stance; label: string; text: string; fill: string }[] = [
	{ id: "bullish", label: "Bullish", text: "text-market-up", fill: "bg-market-up" },
	{ id: "neutral", label: "Neutral", text: "text-fg-secondary", fill: "bg-fg-muted" },
	{ id: "bearish", label: "Bearish", text: "text-market-down", fill: "bg-market-down" },
];

export function groupsOf(selected: ReadonlySet<string>) {
	const groups: Record<Stance, Trader[]> = { bullish: [], bearish: [], neutral: [] };
	const notional: Record<Stance, number> = { bullish: 0, bearish: 0, neutral: 0 };
	for (const t of traders) {
		if (!selected.has(t.usr)) continue;
		const s = stanceOf(t);
		groups[s].push(t);
		notional[s] += t.pos?.ntl ?? 0;
	}
	return { groups, notional, total: selected.size };
}

export function countLabel(selected: ReadonlySet<string>) {
	return selected.size === traders.length
		? `${traders.length} traders`
		: `${selected.size} of ${traders.length} traders`;
}

export const byStance = [...traders].sort(
	(a, b) =>
		STANCES.findIndex((s) => s.id === stanceOf(a)) - STANCES.findIndex((s) => s.id === stanceOf(b)) ||
		(b.pos?.ntl ?? 0) - (a.pos?.ntl ?? 0),
);
