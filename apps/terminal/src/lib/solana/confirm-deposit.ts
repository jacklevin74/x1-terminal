import type { Connection } from "@solana/web3.js";
export class SolDepositConfirmationPendingError extends Error {
 constructor(message = "Your SOL transfer has a recorded signature, but confirmation is unavailable. Check the transaction before sending again.") {
  super(message); this.name = "SolDepositConfirmationPendingError";
 }
}
const failedMessage = "The Solana transfer failed on-chain. Check the transaction before retrying.";
export async function confirmSolDeposit(connection: Connection, signature: string, block: { blockhash: string; lastValidBlockHeight: number }): Promise<void> {
 let confirmation;
 try {
  confirmation = await connection.confirmTransaction({ signature, ...block }, "confirmed");
 } catch {
  // An expired local block-height window is not proof that the signature did
  // not land. Wallet/RPC blockhash replacement and delayed subscriptions can
  // leave this observer behind the actual on-chain transaction.
  let status;
  try { status = (await connection.getSignatureStatus(signature, { searchTransactionHistory: true })).value; }
  catch { throw new SolDepositConfirmationPendingError(); }
  if (status?.err != null) throw new Error(failedMessage);
  if (status && (status.confirmationStatus === "confirmed" || status.confirmationStatus === "finalized" || (!status.confirmationStatus && status.confirmations === null))) return;
  throw new SolDepositConfirmationPendingError();
 }
 if (confirmation.value.err) throw new Error(failedMessage);
}
