import { expect, it } from "vitest";
import { hasWithdrawalGas, withdrawalErrorMessage } from "../unit/withdrawal-gas";
import type { SpotBalance } from "@/hooks/trade/use-account-balances";
const balance = (coin: string, total: string, hold = "0") => ({ coin, total, hold, token: coin === "USDC" ? 0 : 1 }) as SpotBalance;
it("requires available quote tokens only when the destination has an activation fee", () => {
 expect(hasWithdrawalGas("0", [])).toBe(true);
 expect(hasWithdrawalGas("1", [balance("USOL", "100")])).toBe(false);
 expect(hasWithdrawalGas("1", [balance("USDC", "1")])).toBe(true);
 expect(hasWithdrawalGas("1", [balance("USDT", "1")])).toBe(true);
 expect(hasWithdrawalGas("1", [balance("USDC", "1", "0.1")])).toBe(false);
 expect(hasWithdrawalGas("1", [balance("USDC", "2")], [[0, "0.5"]])).toBe(false);
 expect(hasWithdrawalGas("1", [], undefined, "1")).toBe(true);
 expect(hasWithdrawalGas("bad", [])).toBe(false);
});
it("explains activation rejection separately from uncertain transfer errors", () => {
 const message = withdrawalErrorMessage(new Error("Insufficient quote token (e.g., 1 USDC or USDT) balance for token transfer gas."));
 expect(message).toContain("Hyperliquid rejected"); expect(message).toContain("separate from Unit");
 expect(message).not.toContain("before retrying if you already signed");
 expect(withdrawalErrorMessage(new Error("Network timeout"))).toContain("Check your Hyperliquid transfer history");
});
