import type { Connection } from "@solana/web3.js";
import { expect, it, vi } from "vitest";
import { confirmSolDeposit, SolDepositConfirmationPendingError } from "../solana/confirm-deposit";
const signature = "2uHLAPCbivZyjD6sNej2YRswLn8kyG3LkjgsHkafBRQvKdGaAngFUvwCdcw8kZvLMUM6Vv7dHCWzUzB4xJMP2JJ6";
const block = { blockhash: "11111111111111111111111111111111", lastValidBlockHeight: 100 };
function rpc(status: unknown) {
 return { confirmTransaction: vi.fn(async () => { throw new Error(`Signature ${signature} has expired: block height exceeded.`); }), getSignatureStatus: vi.fn(async () => ({ value: status })) };
}
it.each(["confirmed", "finalized"])("recognizes an already %s transfer after block-height expiry", async confirmationStatus => {
 const connection = rpc({ err: null, confirmationStatus, confirmations: confirmationStatus === "finalized" ? null : 2 });
 await expect(confirmSolDeposit(connection as unknown as Connection, signature, block)).resolves.toBeUndefined();
 expect(connection.getSignatureStatus).toHaveBeenCalledExactlyOnceWith(signature, { searchTransactionHistory: true });
});
it("recognizes legacy rooted status when confirmationStatus is absent", async () => {
 await expect(confirmSolDeposit(rpc({ err: null, confirmations: null }) as unknown as Connection, signature, block)).resolves.toBeUndefined();
});
it.each([null, { err: null, confirmationStatus: "processed", confirmations: 0 }])("leaves unknown/unconfirmed history pending instead of reporting expiry as failure", async status => {
 await expect(confirmSolDeposit(rpc(status) as unknown as Connection, signature, block)).rejects.toBeInstanceOf(SolDepositConfirmationPendingError);
});
it("reports a real on-chain error from transaction history", async () => {
 await expect(confirmSolDeposit(rpc({ err: { InstructionError: [0, "failure"] }, confirmationStatus: "finalized" }) as unknown as Connection, signature, block)).rejects.toThrow("failed on-chain");
});
it("leaves confirmation unknown when the history RPC is also unavailable", async () => {
 const connection = rpc(null); connection.getSignatureStatus.mockRejectedValueOnce(new Error("429 Too Many Requests"));
 await expect(confirmSolDeposit(connection as unknown as Connection, signature, block)).rejects.toBeInstanceOf(SolDepositConfirmationPendingError);
});
it("does not replace a directly observed on-chain failure with a success", async () => {
 const history = vi.fn();
 const connection = { confirmTransaction: async () => ({ value: { err: { InstructionError: [0, "failure"] } } }), getSignatureStatus: history };
 await expect(confirmSolDeposit(connection as unknown as Connection, signature, block)).rejects.toThrow("failed on-chain");
 expect(history).not.toHaveBeenCalled();
});
