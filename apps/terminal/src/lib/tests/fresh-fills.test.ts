import { describe, expect, it } from "vitest";
import type { ExecutionFill } from "../chart/execution-markers";
import { createFreshFillTracker, FRESH_FILL_MAX_AGE_MS, observeFills } from "../chart/fresh-fills";

const NOW = 1_800_000_000_000;

function fill(tid: number, time = NOW): ExecutionFill {
	return { coin: "BTC", side: "B", time, px: "100", sz: "1", tid };
}

describe("observeFills", () => {
	it("treats the first observation as history", () => {
		const tracker = createFreshFillTracker();
		expect(observeFills(tracker, [fill(1), fill(2)], false, NOW)).toEqual([]);
	});

	it("returns only fills that arrive after the first observation", () => {
		const tracker = createFreshFillTracker();
		observeFills(tracker, [fill(1)], true, NOW);
		expect(observeFills(tracker, [fill(2), fill(1)], false, NOW).map((f) => f.tid)).toEqual([2]);
		expect(observeFills(tracker, [fill(2), fill(1)], false, NOW)).toEqual([]);
	});

	it("reseeds on a snapshot so reconnects and account switches do not animate history", () => {
		const tracker = createFreshFillTracker();
		observeFills(tracker, [fill(1)], true, NOW);
		expect(observeFills(tracker, [fill(1), fill(5), fill(6)], true, NOW)).toEqual([]);
		expect(observeFills(tracker, [fill(7), fill(6)], false, NOW).map((f) => f.tid)).toEqual([7]);
	});

	it("skips unseen fills that are too old to be a live fill", () => {
		const tracker = createFreshFillTracker();
		observeFills(tracker, [], true, NOW);
		expect(observeFills(tracker, [fill(3, NOW - FRESH_FILL_MAX_AGE_MS - 1)], false, NOW)).toEqual([]);
	});
});
