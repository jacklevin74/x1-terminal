import { useEffect } from "react";
import { useAutoManaged } from "@/hooks/use-auto-managed";
import { setTradeMode, type TradeMode, useTradeModeStore } from "@/stores/use-trade-mode-store";

export function useTradeMode(): TradeMode {
	const stored = useTradeModeStore((state) => state.mode);
	const { live } = useAutoManaged();
	useEffect(() => {
		if (live && stored !== "auto") setTradeMode("auto");
	}, [live, stored]);
	return live ? "auto" : stored;
}
