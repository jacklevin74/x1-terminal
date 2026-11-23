import { describe, expect, it, vi } from "vitest";
import { AUTO_TRADER_DEFAULTS } from "@/config/auto-trader";
import { AutoTraderResponseError } from "@/lib/auto-trader/api";
import {
	BASKET_UNAVAILABLE,
	basketFields,
	COPY_UNAVAILABLE,
	copyFields,
	sameChoice,
	submitChoice,
	withChoice,
} from "@/lib/auto-trader/choice";
import { validateSettings } from "@/lib/auto-trader/targets";
import type { AutoTraderSettings } from "@/lib/auto-trader/types";

const TRADER = "0x418aa6bf98a2b2bc93779f810330d88cde488888";
const OTHER = "0x7dacca32aaaaaaaaaaaaaaaaaaaaaaaaaa8ef410";
const base: AutoTraderSettings = { ...AUTO_TRADER_DEFAULTS };
const universe = ["BTC", "ETH"];

describe("settings fields", () => {
	it("adds follow and followLeverage for copy mode and strips them for the default basket", () => {
		const copy = withChoice(base, copyFields(TRADER.toUpperCase().replace("0X", "0x"), 12));
		expect(copy).toMatchObject({ follow: TRADER, followLeverage: 12 });
		expect(copy.basket).toBeUndefined();
		const pool = withChoice(copy, basketFields(undefined));
		expect(pool).not.toHaveProperty("follow");
		expect(pool).not.toHaveProperty("followLeverage");
		expect(withChoice(base, basketFields([TRADER, OTHER])).basket).toEqual([TRADER, OTHER]);
	});

	it("compares the saved choice", () => {
		expect(sameChoice(base, {})).toBe(true);
		expect(sameChoice(base, copyFields(TRADER, 5))).toBe(false);
		expect(sameChoice({ ...base, follow: TRADER, followLeverage: 5 }, copyFields(TRADER, 5))).toBe(true);
		expect(sameChoice({ ...base, follow: TRADER, followLeverage: 5 }, copyFields(TRADER, 6))).toBe(false);
		expect(sameChoice({ ...base, basket: [TRADER] }, basketFields([TRADER]))).toBe(true);
	});

	it("validates the new optional fields", () => {
		expect(() => validateSettings({ ...base, follow: TRADER, followLeverage: 40 }, universe)).not.toThrow();
		expect(() => validateSettings({ ...base, follow: "0x12" }, universe)).toThrow(/trader address/);
		expect(() => validateSettings({ ...base, follow: TRADER, followLeverage: 41 }, universe)).toThrow(/1 to 40/);
		expect(() => validateSettings({ ...base, basket: [] }, universe)).toThrow(/basket/);
		expect(() => validateSettings({ ...base, basket: ["nope"] }, universe)).toThrow(/basket/);
	});
});

describe("submitChoice", () => {
	it("skips the request when the choice is already saved", async () => {
		const send = vi.fn();
		expect(await submitChoice({ current: base, fields: {}, universe, send, reload: async () => base })).toBe(false);
		expect(send).not.toHaveBeenCalled();
	});

	it("sends the current settings plus follow and followLeverage", async () => {
		const send = vi.fn(async () => ({}));
		const fields = copyFields(TRADER, 8);
		await submitChoice({ current: base, fields, universe, send, reload: async () => withChoice(base, fields) });
		expect(send).toHaveBeenCalledWith({ ...base, follow: TRADER, followLeverage: 8, exclude: [] });
	});

	it("turns a server error into the not-available message", async () => {
		const send = vi.fn(async () => {
			throw new AutoTraderResponseError("Unknown field follow", 400);
		});
		await expect(
			submitChoice({ current: base, fields: copyFields(TRADER, 8), universe, send, reload: async () => base }),
		).rejects.toThrow(COPY_UNAVAILABLE);
		await expect(
			submitChoice({ current: base, fields: basketFields([TRADER]), universe, send, reload: async () => base }),
		).rejects.toThrow(BASKET_UNAVAILABLE);
	});

	it("reports a server that saves but drops the new fields", async () => {
		const send = vi.fn(async () => ({}));
		await expect(
			submitChoice({ current: base, fields: copyFields(TRADER, 8), universe, send, reload: async () => base }),
		).rejects.toThrow(COPY_UNAVAILABLE);
	});

	it("passes wallet errors through unchanged", async () => {
		const send = vi.fn(async () => {
			throw new Error("User rejected the request.");
		});
		await expect(
			submitChoice({ current: base, fields: copyFields(TRADER, 8), universe, send, reload: async () => base }),
		).rejects.toThrow("User rejected the request.");
	});
});
