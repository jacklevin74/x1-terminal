import { describe, expect, it } from "vitest";
import { buildRollCells, getRollDirection, parseFormattedNumber } from "../ui/rolling-number";

describe("rolling number", () => {
	it("parses formatted currency values", () => {
		expect(parseFormattedNumber("$1,234.56")).toBe(1234.56);
		expect(parseFormattedNumber("-$12.30")).toBe(-12.3);
		expect(parseFormattedNumber("−$12.30")).toBe(-12.3);
		expect(parseFormattedNumber("+$4.00")).toBe(4);
	});

	it("rolls up when the value rises and down when it falls", () => {
		expect(getRollDirection("$1.00", "$1.01")).toBe("up");
		expect(getRollDirection("$1.01", "$1.00")).toBe("down");
		expect(getRollDirection("+$1.00", "-$1.00")).toBe("down");
	});

	it("rolls only changed digits and keeps symbols static", () => {
		const cells = buildRollCells("$1,234.56", "$1,235.06", 3);
		expect(cells.filter((c) => c.rolls).map((c) => [c.prevChar, c.char])).toEqual([
			["4", "5"],
			["5", "0"],
		]);
		expect(cells.find((c) => c.char === ",")?.rolls).toBe(false);
	});

	it("does not roll on the first render and aligns digits from the right", () => {
		expect(buildRollCells(null, "$9.99", 0).some((c) => c.rolls)).toBe(false);
		const cells = buildRollCells("$9.99", "$10.00", 1);
		expect(cells.map((c) => c.prevChar)).toEqual([null, null, "9", null, "9", "9"]);
	});
});
