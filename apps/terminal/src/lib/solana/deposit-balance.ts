import { Connection, PublicKey, SystemProgram, Transaction } from "@solana/web3.js";
import { SOLANA_RPC_URL } from "./phantom-deposit";
import { connectSolSource, getSolSourceWallet, type SolSourceKind } from "./source-wallet";
import { isSolDepositAddress } from "../unit/sol-deposit";
export interface SolDepositBalance { address: string; lamports: bigint; feeLamports: bigint; maxLamports: bigint }
export async function readSolDepositBalance(kind: SolSourceKind, destination: string, assertCurrentAccount: () => void): Promise<SolDepositBalance> {
 if (!isSolDepositAddress(destination)) throw new Error("Wait for a verified SOL deposit address.");
 const wallet = getSolSourceWallet(kind);
 if (!wallet) throw new Error(`Connect ${kind === "x1" ? "X1 Wallet" : "Phantom"} first.`);
 const publicKey = await connectSolSource(kind, wallet);
 assertCurrentAccount();
 const connection = new Connection(SOLANA_RPC_URL, { commitment: "confirmed", disableRetryOnRateLimit: true });
 try {
  const genesis = await connection.getGenesisHash();
  if (!genesis.startsWith("5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp")) throw new Error("SOL balances must be read from Solana mainnet.");
  const block = await connection.getLatestBlockhash("confirmed");
  const transaction = new Transaction({ feePayer: publicKey, blockhash: block.blockhash, lastValidBlockHeight: block.lastValidBlockHeight })
   .add(SystemProgram.transfer({ fromPubkey: publicKey, toPubkey: new PublicKey(destination), lamports: 1n }));
  const fee = await connection.getFeeForMessage(transaction.compileMessage(), "confirmed");
  if (fee.value === null) throw new Error("Network fee estimate unavailable. Please retry.");
  const balance = await connection.getBalance(publicKey, "confirmed");
  assertCurrentAccount();
  if (wallet.publicKey?.toBase58() !== publicKey.toBase58()) throw new Error("Wallet account changed. Read your balance again.");
  const lamports = BigInt(balance); const feeLamports = BigInt(fee.value);
  // Leave the current fee plus a small reserve for changes before signing.
  const spendable = lamports - feeLamports - 5000n;
  return { address: publicKey.toBase58(), lamports, feeLamports, maxLamports: spendable > 0n ? spendable : 0n };
 } catch (e) {
  if (/429|too many requests/i.test(e instanceof Error ? e.message : String(e))) throw new Error("Solana balance requests are rate-limited. Wait before refreshing. You can still copy the deposit address and send from your wallet.");
  throw e;
 }
}
