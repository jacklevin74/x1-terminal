import { getAddress, isAddress, zeroAddress, type Address } from "viem";
import { UNIT_API, UNIT_GUARDIANS, verifyUnitGuardian } from "./eth-deposit";
import { isSolDepositAddress, parseSolDepositAmount } from "./sol-deposit";

export const MIN_SOL_WITHDRAWAL = "0.12";
export function parseSolWithdrawalAmount(amount: string): bigint {
 try { return parseSolDepositAmount(amount); }
 catch { throw new Error(`Enter a valid SOL withdrawal amount of at least ${MIN_SOL_WITHDRAWAL} SOL (up to 9 decimals).`); }
}
export async function verifySolWithdrawalAddress(address: Address, destination: string, signatures: Record<string, string>) {
 const addresses = new Set([address, getAddress(address), address.toLowerCase()]);
 const checks = await Promise.all(UNIT_GUARDIANS.map(async ({ id, key }) => {
  if (typeof signatures[id] !== "string") return false;
  for (const bridge of addresses) {
   if (await verifyUnitGuardian(key, signatures[id], `${id}:${destination}-solana-sol-${bridge}-hyperliquid-deposit`)
    || await verifyUnitGuardian(key, signatures[id], `${id}:user-ethereum-solana-${destination}-${bridge}`)) return true;
  }
  return false;
 }));
 return checks.filter(Boolean).length >= 2;
}
export async function fetchSolWithdrawalAddress(destination: string, signal?: AbortSignal): Promise<Address> {
 if (!isSolDepositAddress(destination)) throw new Error("Connect a valid Solana wallet first.");
 const response = await fetch(`${UNIT_API}/gen/hyperliquid/solana/sol/${destination}`, { signal });
 if (!response.ok) throw new Error("Unit could not generate a withdrawal address. Try again.");
 const data = await response.json();
 if (data?.status !== "OK" || !isAddress(data.address) || data.address.toLowerCase() === zeroAddress
  || !data.signatures || typeof data.signatures !== "object"
  || !await verifySolWithdrawalAddress(data.address, destination, data.signatures)) {
  throw new Error("Could not verify the Unit withdrawal address. No transfer was sent.");
 }
 return data.address;
}
export async function fetchSolWithdrawalFees(signal?: AbortSignal): Promise<{ fee: number; eta: string }> {
 const response = await fetch(`${UNIT_API}/v2/estimate-fees`, { signal });
 if (!response.ok) throw new Error("Withdrawal fee unavailable.");
 const data = (await response.json())?.solana;
 const fee = data?.["withdrawal-fee-in-units"];
 if (typeof fee !== "number" || !Number.isFinite(fee) || fee < 0 || typeof data?.withdrawalEta !== "string") throw new Error("Withdrawal fee unavailable.");
 return { fee, eta: data.withdrawalEta };
}

export async function fetchEthWithdrawalAddress(destination: string, signal?: AbortSignal): Promise<Address> {
 if (!isAddress(destination) || destination.toLowerCase() === zeroAddress) throw new Error("Enter a valid Ethereum mainnet recipient address.");
 const recipient = getAddress(destination);
 const response = await fetch(`${UNIT_API}/gen/hyperliquid/ethereum/eth/${recipient}`, { signal });
 if (!response.ok) throw new Error("Unit could not generate an ETH withdrawal address. Try again.");
 const data = await response.json();
 if (data?.status !== "OK" || !isAddress(data.address) || data.address.toLowerCase() === zeroAddress || !data.signatures || typeof data.signatures !== "object") throw new Error("Unit returned an invalid withdrawal address.");
 const addresses = new Set([data.address, getAddress(data.address), data.address.toLowerCase()]);
 const destinations = new Set([destination, recipient, recipient.toLowerCase()]);
 const checks = await Promise.all(UNIT_GUARDIANS.map(async ({ id, key }) => {
  if (typeof data.signatures[id] !== "string") return false;
  for (const target of destinations) for (const bridge of addresses) {
   if (await verifyUnitGuardian(key, data.signatures[id], `${id}:${target}-ethereum-eth-${bridge}-hyperliquid-deposit`)
    || await verifyUnitGuardian(key, data.signatures[id], `${id}:user-ethereum-ethereum-${target}-${bridge}`)) return true;
  }
  return false;
 }));
 if (checks.filter(Boolean).length < 2) throw new Error("Could not verify the Unit ETH withdrawal address. No transfer was sent.");
 return data.address;
}
export async function fetchEthWithdrawalFees(signal?: AbortSignal): Promise<{ fee: number; eta: string }> {
 const response = await fetch(`${UNIT_API}/v2/estimate-fees`, { signal });
 if (!response.ok) throw new Error("Withdrawal fee unavailable.");
 const data = (await response.json())?.ethereum;
 const fee = data?.["withdrawal-fee-in-units"];
 if (typeof fee !== "number" || !Number.isFinite(fee) || fee < 0 || typeof data?.withdrawalEta !== "string") throw new Error("Withdrawal fee unavailable.");
 return { fee, eta: data.withdrawalEta };
}
