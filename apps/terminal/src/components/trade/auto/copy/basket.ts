import type { BasketMember } from "@/lib/auto-trader/types";
import { DEFAULT_BASKET, type Query, queryDirectory } from "./data";

export const defaultMembers = (): BasketMember[] => DEFAULT_BASKET.map((id) => ({ id, on: true }));

export const onIds = (m: BasketMember[]) => m.filter((x) => x.on).map((x) => x.id);

export function isDefault(m: BasketMember[]) {
	return m.length === DEFAULT_BASKET.length && m.every((x, i) => x.on && x.id === DEFAULT_BASKET[i]);
}

export function membersOrDefault(m: BasketMember[] | null) {
	return m ?? defaultMembers();
}

export type PresetKey = "pool" | "pnl30" | "pnlAll" | "consistent" | "lowDegen" | "active";

export const PRESETS: { key: PresetKey; label: string; done: string }[] = [
	{ key: "pool", label: "Pool default (37)", done: "Basket set to the 37 pool traders." },
	{ key: "pnl30", label: "Top PNL 30d", done: "Basket set to the 6 traders with the top PNL over 30d." },
	{ key: "pnlAll", label: "Top PNL all time", done: "Basket set to the 6 traders with the top all-time PNL." },
	{ key: "consistent", label: "Most consistent", done: "Basket set to the 6 most consistent traders." },
	{ key: "lowDegen", label: "Lowest degen", done: "Basket set to the 6 traders with the lowest degen score." },
	{ key: "active", label: "Most active", done: "Basket set to the 6 most active traders." },
];

const PRESET_QUERY: Record<Exclude<PresetKey, "pool">, Query> = {
	pnl30: { sort: "pnl", window: "d30" },
	pnlAll: { sort: "pnl", window: "all" },
	consistent: { sort: "consistency", window: "d30" },
	lowDegen: { sort: "degen", window: "d30", dir: "asc" },
	active: { sort: "trades", window: "d30" },
};

export const PRESET_SIZE = 6;

export function presetMembers(key: PresetKey): BasketMember[] {
	if (key === "pool") return defaultMembers();
	return queryDirectory(PRESET_QUERY[key])
		.slice(0, PRESET_SIZE)
		.map((t) => ({ id: t.id, on: true }));
}

function sameMembers(a: BasketMember[], b: BasketMember[]) {
	return a.length === b.length && a.every((m, i) => m.id === b[i].id && m.on === b[i].on);
}

export function activePreset(members: BasketMember[]): PresetKey | "custom" {
	if (isDefault(members)) return "pool";
	return PRESETS.find((p) => p.key !== "pool" && sameMembers(members, presetMembers(p.key)))?.key ?? "custom";
}

/** The `basket` field for the bot settings: the counted member addresses, or undefined for the default pool. */
export function basketField(members: BasketMember[] | null): string[] | undefined {
	if (!members || isDefault(members)) return undefined;
	return onIds(members);
}
