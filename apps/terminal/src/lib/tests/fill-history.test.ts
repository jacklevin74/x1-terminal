import { describe, expect, it } from "vitest";
import { HISTORY_DAY_MS, loadDayFills, mergeHistoryFills, type HistoryFill } from "../trade/fill-history";
const fill = (tid: number, time: number) => ({ tid, time, coin: "BTC", hash: `0x${tid}` }) as HistoryFill;
describe("24-hour fill history", () => {
 it("loads the full day and preserves more than 200 fills", async () => {
  const now = HISTORY_DAY_MS * 2;
  const rows = Array.from({ length: 350 }, (_, i) => fill(i, now - i));
  const result = await loadDayFills(async (start, end) => { expect(start).toBe(now - HISTORY_DAY_MS); expect(end).toBe(now); return rows; }, now);
  expect(result.fills).toHaveLength(350); expect(result.limited).toBe(false);
 });
 it("splits full pages without losing fills at inclusive boundaries", async () => {
  const now = HISTORY_DAY_MS;
  const rows = Array.from({ length: 2501 }, (_, i) => fill(i, i));
  const result = await loadDayFills(async (start, end) => rows.filter(row => row.time >= start && row.time <= end).slice(0, 2000), now);
  expect(result.fills).toHaveLength(2501); expect(result.limited).toBe(false);
 });
 it("deduplicates snapshot/live overlap and sorts newest first", () => {
  expect(mergeHistoryFills([fill(1, 10), fill(2, 20)], [fill(2, 20), fill(3, 30)]).map(row => row.tid)).toEqual([3, 2, 1]);
 });
 it("warns rather than claiming completeness for saturated single timestamps", async () => {
  const rows = Array.from({ length: 2000 }, (_, i) => fill(i, 0));
  const result = await loadDayFills(async (start, end) => start === 0 && end >= 0 ? rows : [], HISTORY_DAY_MS);
  expect(result.limited).toBe(true);
 });
 it("propagates API failures instead of returning an empty successful cache", async () => {
  await expect(loadDayFills(async () => { throw new Error("offline"); }, HISTORY_DAY_MS)).rejects.toThrow("offline");
 });
});
