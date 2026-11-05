import { useConnection } from "wagmi";
import type { ExecutionFill } from "@/lib/chart/execution-markers";
import { useSubscription } from "@/lib/hyperliquid";

const EMPTY: ExecutionFill[] = [];
export function useExecutionFillsEvent(): { fills: readonly ExecutionFill[]; isSnapshot: boolean } {
	const { address, isConnected } = useConnection();
	const { data } = useSubscription(
		"userFills",
		{ user: address ?? "0x0", aggregateByTime: true },
		{ enabled: isConnected && !!address },
	);
	if (!isConnected || !address || data?.user.toLowerCase() !== address.toLowerCase())
		return { fills: EMPTY, isSnapshot: true };
	return { fills: data.fills, isSnapshot: data.isSnapshot === true };
}
export function useExecutionFills(): readonly ExecutionFill[] {
	return useExecutionFillsEvent().fills;
}
