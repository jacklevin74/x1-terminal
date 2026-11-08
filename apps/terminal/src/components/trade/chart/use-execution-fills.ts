import { useTradeHistory } from "@/hooks/use-trade-history";
import type { ExecutionFill } from "@/lib/chart/execution-markers";

/** Share the account-scoped, cached 24-hour history with the trade table. */
export function useExecutionFills(): readonly ExecutionFill[] {
 return useTradeHistory().fills;
}
