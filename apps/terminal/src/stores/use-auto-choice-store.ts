import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { BasketMember } from "@/lib/auto-trader/types";

export type AutoChoiceMode = "copy" | "basket";

export const FOLLOW_LEVERAGE_MIN = 1;
export const FOLLOW_LEVERAGE_MAX = 40;
export const DEFAULT_FOLLOW_LEVERAGE = 10;
const MAX_MEMBERS = 200;

export interface AutoChoice {
	mode: AutoChoiceMode;
	trader: string | null;
	leverage: number;
	members: BasketMember[] | null;
}

const DEFAULT_CHOICE: AutoChoice = { mode: "copy", trader: null, leverage: DEFAULT_FOLLOW_LEVERAGE, members: null };

const isAddress = (value: unknown): value is string => typeof value === "string" && /^0x[0-9a-fA-F]{40}$/.test(value);

function validLeverage(value: unknown) {
	return (
		typeof value === "number" && Number.isInteger(value) && value >= FOLLOW_LEVERAGE_MIN && value <= FOLLOW_LEVERAGE_MAX
	);
}

function validMembers(value: unknown): BasketMember[] | null {
	if (!Array.isArray(value) || value.length > MAX_MEMBERS) return null;
	const ok = value.every(
		(m) =>
			!!m && typeof m === "object" && isAddress((m as BasketMember).id) && typeof (m as BasketMember).on === "boolean",
	);
	return ok ? (value as BasketMember[]).map((m) => ({ id: m.id.toLowerCase(), on: m.on })) : null;
}

export function validAutoChoice(saved: unknown): AutoChoice {
	const s = (saved ?? {}) as Partial<Record<keyof AutoChoice, unknown>>;
	return {
		mode: s.mode === "basket" ? "basket" : "copy",
		trader: isAddress(s.trader) ? s.trader.toLowerCase() : null,
		leverage: validLeverage(s.leverage) ? (s.leverage as number) : DEFAULT_FOLLOW_LEVERAGE,
		members: validMembers(s.members),
	};
}

export const useAutoChoiceStore = create<AutoChoice>()(
	persist((): AutoChoice => DEFAULT_CHOICE, {
		name: "x1-auto-choice",
		merge: (saved, current) => ({ ...current, ...validAutoChoice(saved) }),
	}),
);

export function setAutoMode(mode: AutoChoiceMode) {
	useAutoChoiceStore.setState({ mode });
}

export function setAutoTrader(trader: string | null) {
	useAutoChoiceStore.setState({ trader: isAddress(trader) ? trader.toLowerCase() : null });
}

export function setAutoLeverage(leverage: number) {
	const n = Math.round(leverage);
	useAutoChoiceStore.setState({ leverage: Math.min(FOLLOW_LEVERAGE_MAX, Math.max(FOLLOW_LEVERAGE_MIN, n)) });
}

export function setAutoMembers(members: BasketMember[] | null) {
	useAutoChoiceStore.setState({ members: members === null ? null : validMembers(members) });
}
