import { getAddress, hexToBytes, isAddress, parseEther, zeroAddress, type Address, type Hex } from "viem";

export const UNIT_API = "https://api.hyperunit.xyz";
export const MIN_ETH_DEPOSIT = "0.007";
// Public verification keys published by Unit (P-256, not wallet keys).
// https://docs.hyperunit.xyz/developers/api/generate-address/guardian-signatures
export const UNIT_GUARDIANS = [
 { id: "unit-node", key: "04dc6f89f921dc816aa69b687be1fcc3cc1d48912629abc2c9964e807422e1047e0435cb5ba0fa53cb9a57a9c610b4e872a0a2caedda78c4f85ebafcca93524061" },
 { id: "hl-node", key: "048633ea6ab7e40cdacf37d1340057e84bb9810de0687af78d031e9b07b65ad4ab379180ab55075f5c2ebb96dab30d2c2fab49d5635845327b6a3c27d20ba4755b" },
 { id: "field-node", key: "04ae2ab20787f816ea5d13f36c4c4f7e196e29e867086f3ce818abb73077a237f841b33ada5be71b83f4af29f333dedc5411ca4016bd52ab657db2896ef374ce99" },
] as const;

export function parseEthDepositAmount(amount: string): bigint {
 if (!/^\d+(\.\d{1,18})?$/.test(amount.trim())) throw new Error("Enter a valid ETH amount (up to 18 decimals).");
 const value = parseEther(amount.trim());
 if (value < parseEther(MIN_ETH_DEPOSIT)) throw new Error(`Minimum deposit is ${MIN_ETH_DEPOSIT} ETH. Smaller deposits cannot be processed.`);
 return value;
}

export async function verifyUnitGuardian(
 key: string, signature: string, payload: string,
): Promise<boolean> {
 try {
  const publicKey = await crypto.subtle.importKey("raw", new Uint8Array(hexToBytes(`0x${key}` as Hex)), { name: "ECDSA", namedCurve: "P-256" }, false, ["verify"]);
  const bytes = Uint8Array.from(atob(signature), c => c.charCodeAt(0));
  return bytes.length === 64 && await crypto.subtle.verify({ name: "ECDSA", hash: "SHA-256" }, publicKey, bytes, new TextEncoder().encode(payload));
 } catch { return false; }
}

export async function verifyUnitGuardianForAddress(
 key: string, signature: string, guardian: string, recipient: Address, address: string, asset: "eth" | "sol" = "eth",
): Promise<boolean> {
 // Signatures cover text. The API can attest to checksummed strings even when
 // the request uses lowercase. Only try equivalent casings of these same accounts.
 const recipients = new Set([recipient, getAddress(recipient), recipient.toLowerCase()]);
 const addresses = asset === "eth" ? new Set([address, getAddress(address), address.toLowerCase()]) : new Set([address]);
 const chain = asset === "eth" ? "ethereum" : "solana";
 for (const destination of recipients) for (const deposit of addresses) {
  if (await verifyUnitGuardian(key, signature, `${guardian}:user-${chain}-hyperliquid-${destination}-${deposit}`)
   || await verifyUnitGuardian(key, signature, `${guardian}:${destination}-hyperliquid-${asset}-${deposit}-${chain}-deposit`)) return true;
 }
 return false;
}

export async function verifyUnitAddress(address: string, recipient: Address, signatures: Record<string, string>, asset: "eth" | "sol" = "eth"): Promise<boolean> {
 const checks = await Promise.all(UNIT_GUARDIANS.map(async ({ id, key }) => {
  const signature = signatures[id];
  return typeof signature === "string" && await verifyUnitGuardianForAddress(key, signature, id, recipient, address, asset);
 }));
 return checks.filter(Boolean).length >= 2;
}

export async function fetchEthDepositAddress(recipient: Address, signal?: AbortSignal): Promise<Address> {
 if (!isAddress(recipient) || recipient.toLowerCase() === zeroAddress) throw new Error("Connect a valid Hyperliquid account first.");
 const destination = recipient.toLowerCase() as Address;
 const response = await fetch(`${UNIT_API}/gen/ethereum/hyperliquid/eth/${destination}`, { signal });
 if (!response.ok) throw new Error("Unit could not generate a deposit address. Try again.");
 const data = await response.json();
 if (data?.status !== "OK" || typeof data.address !== "string" || !isAddress(data.address) || data.address.toLowerCase() === zeroAddress || !data.signatures || typeof data.signatures !== "object") {
  throw new Error("Unit returned an invalid deposit address.");
 }
 if (!await verifyUnitAddress(data.address, destination, data.signatures)) throw new Error("Could not verify the Unit deposit address. No address will be shown; retry later.");
 return data.address;
}

export function fetchEthDepositFees(signal?: AbortSignal) {
 return fetchUnitDepositFees("ethereum", signal);
}

export async function fetchUnitDepositFees(chain: "ethereum" | "solana", signal?: AbortSignal): Promise<{ fee: number; eta: string }> {
 const response = await fetch(`${UNIT_API}/v2/estimate-fees`, { signal });
 if (!response.ok) throw new Error("Fee estimate unavailable.");
 const data = (await response.json())?.[chain];
 const fee = data?.["deposit-fee-in-units"];
 if (typeof fee !== "number" || !Number.isFinite(fee) || fee < 0 || typeof data?.depositEta !== "string") throw new Error("Fee estimate unavailable.");
 return { fee, eta: data.depositEta };
}
