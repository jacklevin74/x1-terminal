import { useConnection } from "wagmi";
import type { ExecutionFill } from "@/lib/chart/execution-markers";
import { useSubscription } from "@/lib/hyperliquid";

const EMPTY: ExecutionFill[] = [];
export function useExecutionFills(): readonly ExecutionFill[] {
	const { address, isConnected } = useConnection();
	const { data } = useSubscription(
		"userFills",
		{ user: address ?? "0x0", aggregateByTime: true },
		{ enabled: isConnected && !!address },
	);
	if (!isConnected || !address || data?.user.toLowerCase() !== address.toLowerCase()) return EMPTY;
	return data.fills;
}
