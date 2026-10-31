import { useQuery } from "@tanstack/react-query";
import { useSubscription } from "@/lib/hyperliquid";
import { getHyperliquidTxUrl } from "@/lib/explorer";
import { isTestnet } from "@/lib/network";
import { fetchWithdrawalOperations } from "@/lib/unit/operations";

export function useWithdrawalHistory(address?: `0x${string}`) {
 const unit = useQuery({ queryKey: ["unit", "withdrawal-history", address], queryFn: ({ signal }) => fetchWithdrawalOperations(address!, signal), enabled: !!address && !isTestnet(), staleTime: 15_000, refetchInterval: 30_000, retry: 1 });
 const ledger = useSubscription("userNonFundingLedgerUpdates", { user: address ?? "0x0" }, { enabled: !!address });
 const withdrawals = (ledger.data?.nonFundingLedgerUpdates ?? []).filter(entry => entry.delta.type === "withdraw");
 const rows = [ ...(unit.data ?? []).map(op => ({ ...op, sourceUrl: undefined as string | undefined })), ...withdrawals.map(entry => ({ id: entry.hash, time: entry.time, asset: "USDC", amount: entry.delta.type === "withdraw" ? entry.delta.usdc : "", destination: "", chain: "Arbitrum", status: "Submitted", trackingUrl: undefined, transactionUrl: undefined, sourceUrl: getHyperliquidTxUrl(entry.hash) })) ].sort((a,b) => b.time-a.time).slice(0,100);
 return { rows, loading: !!address && unit.isPending && !isTestnet(), error: unit.isError, refresh: () => unit.refetch() };
}

export function WithdrawalLinks({ row }: { row: ReturnType<typeof useWithdrawalHistory>["rows"][number] }) {
 return <div className="flex gap-3">{[[row.trackingUrl,"Unit"],[row.transactionUrl,row.chain],[row.sourceUrl,"Hyperliquid"]].map(([url,label]) => url ? <a key={url} className="text-brand hover:underline" href={url} target="_blank" rel="noopener noreferrer">{label} ↗</a> : null)}</div>;
}
