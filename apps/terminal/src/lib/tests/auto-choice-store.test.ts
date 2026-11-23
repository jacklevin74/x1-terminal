// @vitest-environment jsdom
import { expect, it } from "vitest";
import {
	DEFAULT_FOLLOW_LEVERAGE,
	setAutoLeverage,
	setAutoMembers,
	setAutoMode,
	setAutoTrader,
	useAutoChoiceStore,
	validAutoChoice,
} from "@/stores/use-auto-choice-store";

const TRADER = "0x418AA6BF98A2B2BC93779F810330D88CDE488888";

it("persists the mode, trader, leverage and basket and restores them on reload", async () => {
	setAutoMode("basket");
	setAutoTrader(TRADER);
	setAutoLeverage(20);
	setAutoMembers([{ id: TRADER, on: false }]);
	const raw = localStorage.getItem("x1-auto-choice") ?? "{}";
	const saved = JSON.parse(raw).state;
	expect(saved).toEqual({
		mode: "basket",
		trader: TRADER.toLowerCase(),
		leverage: 20,
		members: [{ id: TRADER.toLowerCase(), on: false }],
	});
	useAutoChoiceStore.setState({ mode: "copy", trader: null, leverage: DEFAULT_FOLLOW_LEVERAGE, members: null });
	localStorage.setItem("x1-auto-choice", raw);
	await useAutoChoiceStore.persist.rehydrate();
	expect(useAutoChoiceStore.getState()).toMatchObject({ mode: "basket", trader: TRADER.toLowerCase(), leverage: 20 });
});

it("clamps leverage to 1..40 and drops invalid traders", () => {
	setAutoLeverage(99);
	expect(useAutoChoiceStore.getState().leverage).toBe(40);
	setAutoLeverage(0);
	expect(useAutoChoiceStore.getState().leverage).toBe(1);
	setAutoTrader("nope");
	expect(useAutoChoiceStore.getState().trader).toBeNull();
});

it("rejects broken saved state field by field", () => {
	expect(validAutoChoice({ mode: "x", trader: "0x12", leverage: 3.5, members: [{ id: "bad", on: true }] })).toEqual({
		mode: "copy",
		trader: null,
		leverage: DEFAULT_FOLLOW_LEVERAGE,
		members: null,
	});
	expect(validAutoChoice(null).mode).toBe("copy");
});
