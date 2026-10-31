import { formatUnits } from "viem";
import { UNIT_API } from "./eth-deposit";

export interface WithdrawalOperation {
 id: string; time: number; asset: "SOL" | "ETH"; amount: string;
 destination: string; chain: "Solana" | "Ethereum"; status: string;
 trackingUrl: string; transactionUrl?: string;
}

export function parseWithdrawalOperations(data: unknown, user: string): WithdrawalOperation[] {
 const operations = (data as { operations?: unknown[] } | null)?.operations;
 if (!Array.isArray(operations)) throw new Error("Invalid Unit history response.");
 const rows: WithdrawalOperation[] = [];
 for (const item of operations) {
  const op = item as Record<string, unknown>;
  if (!op || op.sourceChain !== "hyperliquid" || typeof op.sourceAddress !== "string" || op.sourceAddress.toLowerCase() !== user.toLowerCase()) continue;
  const sol = op.asset === "sol" && op.destinationChain === "solana";
  const eth = op.asset === "eth" && op.destinationChain === "ethereum";
  if ((!sol && !eth) || typeof op.destinationAddress !== "string" || typeof op.sourceAmount !== "string" || !/^\d+$/.test(op.sourceAmount) || typeof op.operationId !== "string") continue;
  const time = Date.parse(String(op.opCreatedAt));
  if (!Number.isFinite(time)) continue;
  const hash = typeof op.destinationTxHash === "string" ? op.destinationTxHash.split(":")[0] : "";
  const validHash = sol ? /^[1-9A-HJ-NP-Za-km-z]{64,88}$/.test(hash) : /^0x[\da-fA-F]{64}$/.test(hash);
  rows.push({ id: op.operationId, time, asset: sol ? "SOL" : "ETH", amount: formatUnits(BigInt(op.sourceAmount), sol ? 9 : 18), destination: op.destinationAddress, chain: sol ? "Solana" : "Ethereum", status: op.state === "done" ? "Completed" : op.state === "failure" ? "Failed" : "Processing", trackingUrl: `https://explorer.hyperunit.xyz/addresses/${encodeURIComponent(op.destinationAddress)}`, transactionUrl: validHash ? `https://${sol ? "solscan.io" : "etherscan.io"}/tx/${hash}` : undefined });
 }
 return [...new Map(rows.map(row => [row.id, row])).values()].sort((a,b) => b.time-a.time);
}

export async function fetchWithdrawalOperations(user: string, signal?: AbortSignal) {
 const response = await fetch(`${UNIT_API}/operations/${encodeURIComponent(user)}`, { signal });
 if (!response.ok) throw new Error("Withdrawal history unavailable.");
 return parseWithdrawalOperations(await response.json(), user);
}
