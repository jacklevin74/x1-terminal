import { describe, expect, it } from "vitest";
import { fallbackMarket } from "../use-selected-market-fallback";

const has = (names: string[]) => (n: string) => names.includes(n);

describe("fallbackMarket", () => {
	it("keeps a selection that resolves (incl. HIP-3 xyz markets)", () => {
		expect(fallbackMarket("all", "xyz:NVDA", has(["BTC", "xyz:NVDA"]), true)).toBeNull();
	});
	it("waits while the market list is loading", () => {
		expect(fallbackMarket("all", "xyz:NVDA", has([]), false)).toBeNull();
	});
	it("falls back to the scope default when the persisted market is unknown", () => {
		expect(fallbackMarket("all", "xyz:GONE", has(["BTC", "ETH"]), true)).toBe("BTC");
		expect(fallbackMarket("builders-perp", "xyz:GONE", has(["BTC", "xyz:SILVER"]), true)).toBe("xyz:SILVER");
	});
	it("uses BTC when the scope default doesn't resolve either; never an unknown market", () => {
		expect(fallbackMarket("builders-perp", "xyz:GONE", has(["BTC"]), true)).toBe("BTC");
		expect(fallbackMarket("all", "xyz:GONE", has(["ETH"]), true)).toBeNull();
	});
});
