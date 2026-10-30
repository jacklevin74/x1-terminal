import { expect, it, vi } from "vitest";
import { closePositionsInSequence } from "../positions/close-all";
it("closes positions sequentially and reports the completed count", async () => {
 let active = 0; let peak = 0; const calls: number[] = [];
 const count = await closePositionsInSequence([1, 2, 3], () => true, async p => {
  active++; peak = Math.max(peak, active); await Promise.resolve(); calls.push(p); active--; return true;
 });
 expect(calls).toEqual([1, 2, 3]); expect(peak).toBe(1); expect(count).toBe(3);
});
it("stops the remaining orders if a close fails", async () => {
 const close = vi.fn(async (p: number) => p !== 2);
 expect(await closePositionsInSequence([1, 2, 3], () => true, close)).toBe(1);
 expect(close.mock.calls.map(([p]) => p)).toEqual([1, 2]);
});
it("submits nothing if the account changed before closing", async () => {
 const close = vi.fn(async () => true);
 await expect(closePositionsInSequence([1, 2], () => false, close)).rejects.toThrow("Wallet changed");
 expect(close).not.toHaveBeenCalled();
});
it("stops if the account changes between two orders", async () => {
 let current = true; const close = vi.fn(async () => { current = false; return true; });
 await expect(closePositionsInSequence([1, 2], () => current, close)).rejects.toThrow("Remaining positions were not closed");
 expect(close).toHaveBeenCalledOnce();
});
