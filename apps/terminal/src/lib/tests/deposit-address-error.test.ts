import { expect, it } from "vitest";
import { formatDepositAddressError, RESTRICTED_JURISDICTION_MESSAGE } from "../jurisdiction";
it("uses the requested restriction copy for Unit address Failed to fetch errors", () => {
 expect(formatDepositAddressError(new TypeError("Failed to fetch"))).toBe(RESTRICTED_JURISDICTION_MESSAGE);
 expect(formatDepositAddressError(new Error("failed to fetch."))).toBe(RESTRICTED_JURISDICTION_MESSAGE);
});
it("preserves address verification and other specific errors", () => {
 const error = new Error("Could not verify the Unit deposit address.");
 expect(formatDepositAddressError(error)).toBe(error.message);
 expect(formatDepositAddressError(new Error("Connect your wallet first."))).toBe("Connect your wallet first.");
});
it("handles wrapped SDK errors, prefixes, plain objects, and nested causes", () => {
 for (const error of [new Error("TypeError: Failed to fetch"), { message: "Failed to fetch" }, new Error("Request failed", { cause: new TypeError("Failed to fetch") }), { message: "Request failed", details: "Failed to fetch\nURL: https://api.hyperunit.xyz" }]) {
  expect(formatDepositAddressError(error)).toBe(RESTRICTED_JURISDICTION_MESSAGE);
 }
});
