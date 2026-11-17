import { PublicKey, type Transaction } from "@solana/web3.js";
export type SolSourceKind = "phantom";
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
 void kind;
 return (window as Window & { phantom?: { solana?: SolSourceWallet } }).phantom?.solana;
}
export async function connectSolSource(kind: SolSourceKind, provider: SolSourceWallet, forSigning = false): Promise<PublicKey> {
  void kind;
 let key: { toBase58(): string } | null | undefined;
 if (forSigning && (provider.connected === false || provider.isConnected === false)) key = undefined;
 if (!key) {
  const result = await provider.connect();
  key = provider.publicKey ?? (result as { publicKey?: { toBase58(): string } } | null)?.publicKey;
 }
 if (!key || typeof key.toBase58 !== "function") throw new Error("Wallet did not return its Solana address.");
 return new PublicKey(key.toBase58());
}
export function formatSolLamports(value: bigint): string {
 const whole = value / 1_000_000_000n;
 const fraction = (value % 1_000_000_000n).toString().padStart(9, "0").replace(/0+$/, "");
 return `${whole}${fraction ? `.${fraction}` : ""}`;
}
