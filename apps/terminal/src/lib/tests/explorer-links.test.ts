import { expect, it } from "vitest";
import { getExplorerTxUrl, getHyperliquidTxUrl } from "../explorer";
const hash = "0x956dc5b12086eaea96e70447b5d9320203a60096bb8a09bc39367103df8ac4d5";
it("routes trade and liquidation transaction hashes to Hyperliquid", () => {
 expect(getHyperliquidTxUrl(hash, false)).toBe(`https://app.hyperliquid.xyz/explorer/tx/${hash}`);
 expect(getHyperliquidTxUrl(hash, true)).toBe(`https://testnet.app.hyperliquid.xyz/explorer/tx/${hash}`);
});
it("preserves the external-chain deposit explorer", () => {
 expect(getExplorerTxUrl(hash)).toBe(`https://arbiscan.io/tx/${hash}`);
});
it("does not create broken transaction links for missing, malformed or placeholder hashes", () => {
 for (const value of [undefined, null, "", "0x123", `0x${"0".repeat(64)}`, "undefined"]) expect(getHyperliquidTxUrl(value, false)).toBeUndefined();
 expect(getHyperliquidTxUrl(` ${hash} `, false)).toBe(`https://app.hyperliquid.xyz/explorer/tx/${hash}`);
});
