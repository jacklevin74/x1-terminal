import { PublicKey, type Transaction } from "@solana/web3.js";
import { getX1Wallet } from "../x1/provider";
export type SolSourceKind = "phantom" | "x1";
export interface SolSourceWallet {
 connected?: boolean;
 isConnected?: boolean;
 on?(event: string, callback: () => void): unknown;
 off?(event: string, callback: () => void): void;
 removeListener?(event: string, callback: () => void): void;
 publicKey?: { toBase58(): string } | null;
 connect(options?: { chain: string }): Promise<unknown>;
 signAndSendTransaction?(transaction: Transaction): Promise<{ signature: string }>;
 signTransaction?(transaction: Transaction): Promise<{ serialize(): Uint8Array }>;
}
export function getSolSourceWallet(kind: SolSourceKind): SolSourceWallet | undefined {
 if (typeof window === "undefined") return undefined;
 return kind === "x1" ? getX1Wallet() as unknown as SolSourceWallet | undefined
  : (window as Window & { phantom?: { solana?: SolSourceWallet } }).phantom?.solana;
}
export async function connectSolSource(kind: SolSourceKind, provider: SolSourceWallet, forSigning = false): Promise<PublicKey> {
 // X1 is already connected to derive the HL account. Reading its public key
 // does not require another signature or a change of network.
 let key = kind === "x1" ? provider.publicKey : undefined;
 if (forSigning && (provider.connected === false || provider.isConnected === false)) key = undefined;
 if (!key) {
  const result = await provider.connect(kind === "x1" ? { chain: "solana:mainnet" } : undefined);
  key = provider.publicKey ?? (result as { publicKey?: { toBase58(): string } } | null)?.publicKey;
 }
 if (!key || typeof key.toBase58 !== "function") throw new Error("Wallet did not return its Solana address.");
 return new PublicKey(key.toBase58());
}
export function encodeSolSignature(bytes: Uint8Array): string {
 if (bytes.length !== 64) throw new Error("Wallet returned an invalid signature.");
 const alphabet = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
 let value = 0n;
 for (const byte of bytes) value = value * 256n + BigInt(byte);
 let text = "";
 while (value > 0n) { text = alphabet[Number(value % 58n)] + text; value /= 58n; }
 for (const byte of bytes) { if (byte !== 0) break; text = "1" + text; }
 return text;
}
export function formatSolLamports(value: bigint): string {
 const whole = value / 1_000_000_000n;
 const fraction = (value % 1_000_000_000n).toString().padStart(9, "0").replace(/0+$/, "");
 return `${whole}${fraction ? `.${fraction}` : ""}`;
}
