import { expect, it } from "vitest";
import { parseWithdrawalOperations } from "../unit/operations";
const user = "0x95Df02809abd0594E122773DeaB9a72033FeBcD9";
const recipient = "aVuLr2twoecnZGWqHFVtRtPM6W5iwSPfHRr9cpp9mMf";
const signature = "2uHLAPCbivZyjD6sNej2YRswLn8kyG3LkjgsHkafBRQvKdGaAngFUvwCdcw8kZvLMUM6Vv7dHCWzUzB4xJMP2JJ6";
const operation = { operationId: "withdraw-1", opCreatedAt: "2026-10-30T12:00:00Z", sourceChain: "hyperliquid", sourceAddress: user.toLowerCase(), destinationChain: "solana", asset: "sol", sourceAmount: "130000000", destinationAddress: recipient, state: "done", destinationTxHash: `${signature}:${recipient}` };
it("tracks withdrawals with the actual recipient and native transaction signature", () => {
 const rows = parseWithdrawalOperations({operations:[operation]}, user);
 expect(rows).toHaveLength(1);
 expect(rows[0]).toMatchObject({amount:"0.13", status:"Completed", trackingUrl:`https://explorer.hyperunit.xyz/addresses/${recipient}`,transactionUrl:`https://solscan.io/tx/${signature}`});
});
it("excludes deposits, other users and malformed amounts and deduplicates operations", () => {
 expect(parseWithdrawalOperations({operations:[operation, operation, {...operation, sourceChain:"solana"}, {...operation,sourceAddress:"0xother"}, {...operation,sourceAmount:"invalid"}]},user)).toHaveLength(1);
});
it("never treats pending withdrawals as delivered or creates malformed native links", () => {
 const rows = parseWithdrawalOperations({operations:[{...operation,state:"queuedForWithdraw",destinationTxHash:"invalid"}]}, user);
 expect(rows[0].status).toBe("Processing");
 expect(rows[0].transactionUrl).toBeUndefined();
});
it("parses ETH integer units without precision loss and removes trace suffix", () => {
 const hash = `0x${"a".repeat(64)}`;
 const rows = parseWithdrawalOperations({operations:[{...operation,asset:"eth",destinationChain:"ethereum",sourceAmount:"100000000000000001",destinationTxHash:`${hash}:0`}]},user);
 expect(rows[0].amount).toBe("0.100000000000000001");
 expect(rows[0].transactionUrl).toBe(`https://etherscan.io/tx/${hash}`);
});
