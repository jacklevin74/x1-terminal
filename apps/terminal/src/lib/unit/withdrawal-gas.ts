import { getSpotAvailable, type SpotAvailableAfterMaintenance } from "@/domain/trade/balances";
import type { SpotBalance } from "@/hooks/trade/use-account-balances";

export function hasWithdrawalGas(fee: string, balances: SpotBalance[], maintenance?: SpotAvailableAfterMaintenance, perpsWithdrawable = "0") {
 const required = Number(fee);
 if (!Number.isFinite(required) || required < 0) return false;
 if (required === 0) return true;
 // Do not combine different quote currencies to satisfy a single fee.
 return ["USDC", "USDT", "USDH"].some(coin => getSpotAvailable(balances.find(b => b.coin === coin), maintenance) >= required)
  || Number(perpsWithdrawable) >= required;
}
export function withdrawalErrorMessage(error: unknown): string {
 const message = error instanceof Error ? error.message : "Withdrawal failed.";
 if (/insufficient.*(?:quote token|USDC).*token transfer gas/i.test(message)) {
  return "Hyperliquid rejected this withdrawal because a quote-token balance is needed for the destination activation fee (usually 1 USDC). Keep at least 1 USDC available on Hyperliquid, then retry. You can sell a small amount of SOL or ETH for USDC first. This fee is separate from Unit’s fee; SOL in your wallet cannot pay it.";
 }
 return `${message} Check your Hyperliquid transfer history before retrying if you already signed.`;
}
