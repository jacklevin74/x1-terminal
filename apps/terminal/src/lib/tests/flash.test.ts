import { describe, expect, it } from "vitest";
import { getTickDirection, isLevelResized, shouldPulse } from "@/lib/ui/flash";

describe("getTickDirection", () => {
	it("compares string prices with precision", () => {
		expect(getTickDirection("100.1", "100.2")).toBe(1);
		expect(getTickDirection("100.2", "100.1")).toBe(-1);
		expect(getTickDirection("100.10", "100.1")).toBe(0);
	});

	it("returns 0 when either side is missing", () => {
		expect(getTickDirection(undefined, "1")).toBe(0);
		expect(getTickDirection("1", null)).toBe(0);
	});
});

describe("isLevelResized", () => {
	it("flags a size change at the same price", () => {
		expect(isLevelResized({ price: 10, size: 1 }, { price: 10, size: 2 })).toBe(true);
	});

	it("ignores first mount, unchanged size and a different price", () => {
		expect(isLevelResized(null, { price: 10, size: 2 })).toBe(false);
		expect(isLevelResized({ price: 10, size: 2 }, { price: 10, size: 2 })).toBe(false);
		expect(isLevelResized({ price: 10, size: 1 }, { price: 11, size: 2 })).toBe(false);
	});
});

describe("shouldPulse", () => {
	it("throttles to the minimum interval", () => {
		expect(shouldPulse(1_000, 0, 2_000)).toBe(false);
		expect(shouldPulse(2_000, 0, 2_000)).toBe(true);
	});
});
