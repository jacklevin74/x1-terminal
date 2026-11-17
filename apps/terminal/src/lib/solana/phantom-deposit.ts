import { confirmSolDeposit, SolDepositConfirmationPendingError } from "./confirm-deposit";
import { connectSolSource, getSolSourceWallet, type SolSourceKind } from "./source-wallet";
import { Connection, PublicKey, SystemProgram, Transaction } from "@solana/web3.js";
import { isSolDepositAddress, parseSolDepositAmount } from "../unit/sol-deposit";

export const SOLANA_RPC_URL = import.meta.env.VITE_SOLANA_RPC_URL || "https://solana-rpc.publicnode.com";
interface PhantomSolana {
 publicKey?: PublicKey | null;
 connect(): Promise<{ publicKey: PublicKey }>;
 signAndSendTransaction(transaction: Transaction): Promise<{ signature: string }>;
}
export function getPhantomSolana(): PhantomSolana | undefined {
 if (typeof window === "undefined") return undefined;
 return (window as Window & { phantom?: { solana?: PhantomSolana } }).phantom?.solana;
}
export async function sendSolDeposit(
 destination: string, amount: string, onSubmitted: (signature: string) => void,
 assertCurrentAccount: () => void,
 source: { kind: SolSourceKind; expectedAddress?: string } = { kind: "phantom" },
): Promise<string> {
 let submitted = false;
 try {
 const lamports = parseSolDepositAmount(amount);
 if (!isSolDepositAddress(destination)) throw new Error("Invalid SOL deposit address.");
 const provider = getSolSourceWallet(source.kind);
 if (!provider) throw new Error("Connect Phantom to send SOL.");
 const connection = new Connection(SOLANA_RPC_URL, { commitment: "confirmed", disableRetryOnRateLimit: true });
 const genesis = await connection.getGenesisHash();
 if (!genesis.startsWith("5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp")) throw new Error("SOL deposits require a Solana mainnet RPC.");
 const publicKey = await connectSolSource(source.kind, provider, true);
 if (source.expectedAddress && source.expectedAddress !== publicKey.toBase58()) throw new Error("Wallet source account changed. Read your SOL balance again.");
 assertCurrentAccount();
 // A mainnet blockhash binds the transaction to Solana mainnet. A wallet set
 // to another network cannot execute this transaction on that network.
 const block = await connection.getLatestBlockhash("confirmed");
 const transaction = new Transaction({ feePayer: publicKey, blockhash: block.blockhash, lastValidBlockHeight: block.lastValidBlockHeight })
  .add(SystemProgram.transfer({ fromPubkey: publicKey, toPubkey: new PublicKey(destination), lamports }));
 const fee = await connection.getFeeForMessage(transaction.compileMessage(), "confirmed");
 if (fee.value === null) throw new Error("Solana fee estimate unavailable. Please retry.");
 const balance = await connection.getBalance(publicKey, "confirmed");
 if (BigInt(balance) < lamports + BigInt(fee.value)) throw new Error("Insufficient SOL for the deposit plus network fees.");
 assertCurrentAccount();
 if (provider.publicKey?.toBase58() !== publicKey.toBase58()) throw new Error("Wallet source account changed. Read your SOL balance again.");
 let signature: string;
 if (!provider.signAndSendTransaction) throw new Error("Phantom cannot send this SOL transaction.");
 ({ signature } = await provider.signAndSendTransaction(transaction));
 if (typeof signature !== "string" || !/^[1-9A-HJ-NP-Za-km-z]{64,88}$/.test(signature)) throw new Error("Wallet returned an invalid transaction signature. Check wallet activity before retrying.");
 submitted = true;
 onSubmitted(signature);

 await confirmSolDeposit(connection, signature, block);
 return signature;
 } catch (error) {
  if (/429|too many requests/i.test(error instanceof Error ? error.message : String(error))) {
   if (submitted) throw new SolDepositConfirmationPendingError();
   throw new Error("The Solana RPC is rate-limiting requests. Wait before retrying, or copy your SOL deposit address and send from Phantom directly. The operator can configure VITE_SOLANA_RPC_URL for a dedicated mainnet RPC.");
  }
  throw error;
 }
}
