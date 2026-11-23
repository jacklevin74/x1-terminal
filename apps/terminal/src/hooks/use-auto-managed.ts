import { toast } from "sonner";
import { zeroAddress } from "viem";
import { useTradingAccount } from "@/hooks/use-trading-account";
import { autoTraderErrorMessage } from "@/lib/auto-trader/error-message";
import { useAutoTraderMutation, useAutoTraderSignal, useAutoTraderStatus } from "@/lib/auto-trader/hooks";
import { autoTraderPhase, isTrading, managesMarket } from "@/lib/auto-trader/phase";
import { useHyperliquid } from "@/lib/hyperliquid";

export function useAutoManaged() {
	const { address, isConnected } = useTradingAccount();
	const { env } = useHyperliquid();
	const available = env === "Mainnet" && isConnected && !!address;
	const status = useAutoTraderStatus(address ?? zeroAddress, available);
	const signal = useAutoTraderSignal(available);
	const phase = autoTraderPhase(status.data);
	const universe = [...new Set(signal.data?.coins.map((c) => c.coin) ?? [])];
	const settings = status.data?.settings;
	const active = available && isTrading(phase);
	const control = useAutoTraderMutation(address ?? zeroAddress);

	async function pause() {
		try {
			await control.mutateAsync({ action: "pause", body: {} });
			await status.refetch();
			toast.success("Auto Trader paused. You can close positions now.");
			return true;
		} catch (e) {
			toast.error(autoTraderErrorMessage(e));
			return false;
		}
	}

	return {
		pause,
		pausing: control.isPending,
		registered: available && phase !== "setup",
		live: active,
		isManaged: (coin: string) => active && managesMarket(settings, universe, coin),
	};
}
