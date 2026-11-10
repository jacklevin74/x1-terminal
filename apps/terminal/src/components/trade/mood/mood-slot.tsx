import { useSelectedMarketInfo } from "@/lib/hyperliquid";
import { findMoodCoin, useMoodSignal } from "@/lib/mood/signal";
import { MoodMarketRing } from "./mood-market-ring";

export function MoodSlot() {
	const { data: signal } = useMoodSignal();
	const { data: market } = useSelectedMarketInfo();
	if (!signal) return null;
	const marketName = market?.name ?? "";
	const coin = findMoodCoin(signal, marketName);
	return <MoodMarketRing signal={signal} coin={coin} marketName={marketName} score={coin?.score ?? null} />;
}
