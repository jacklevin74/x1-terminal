import { PublicKey } from "@solana/web3.js";
import { isAddress, zeroAddress, type Address } from "viem";
import { fetchUnitDepositFees, UNIT_API, verifyUnitAddress } from "./eth-deposit";

export const MIN_SOL_DEPOSIT = "0.12";
export function parseSolDepositAmount(amount: string): bigint {
 const text = amount.trim();
 if (!/^\d+(\.\d{1,9})?$/.test(text)) throw new Error("Enter a valid SOL amount (up to 9 decimals).");
 const [whole, fraction = ""] = text.split(".");
 const lamports = BigInt(whole) * 1_000_000_000n + BigInt(fraction.padEnd(9, "0"));
 if (lamports < 120_000_000n) throw new Error(`Minimum deposit is ${MIN_SOL_DEPOSIT} SOL. Smaller deposits cannot be processed.`);
 if (lamports > BigInt(Number.MAX_SAFE_INTEGER)) throw new Error("SOL amount is too large.");
 return lamports;
}
export function isSolDepositAddress(address: unknown): address is string {
 if (typeof address !== "string") return false;
 try {
  const key = new PublicKey(address);
  return key.toBase58() === address && !key.equals(PublicKey.default);
 } catch { return false; }
}
export async function fetchSolDepositAddress(recipient: Address, signal?: AbortSignal): Promise<string> {
 if (!isAddress(recipient) || recipient.toLowerCase() === zeroAddress) throw new Error("Connect a valid Hyperliquid account first.");
 const destination = recipient.toLowerCase() as Address;
 const response = await fetch(`${UNIT_API}/gen/solana/hyperliquid/sol/${destination}`, { signal });
 if (!response.ok) throw new Error("Unit could not generate a SOL deposit address. Try again.");
 const data = await response.json();
 if (data?.status !== "OK" || !isSolDepositAddress(data.address) || !data.signatures || typeof data.signatures !== "object") throw new Error("Unit returned an invalid SOL deposit address.");
 if (!await verifyUnitAddress(data.address, destination, data.signatures, "sol")) throw new Error("Could not verify the Unit SOL deposit address. No address will be shown; retry later.");
 return data.address;
}
export function fetchSolDepositFees(signal?: AbortSignal) {
 return fetchUnitDepositFees("solana", signal);
}
