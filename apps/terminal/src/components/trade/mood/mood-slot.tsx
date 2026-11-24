import { useSelectedMarketInfo } from "@/lib/hyperliquid";
import { personalSignal, useMoodPool } from "@/lib/mood/pool";
import { useMoodSelection } from "@/lib/mood/selection";
import { findMoodCoin, useMoodSignal } from "@/lib/mood/signal";
import { MoodMarketRing } from "./mood-market-ring";

export function MoodSlot() {
	const { data: live } = useMoodSignal();
	const { data: pool } = useMoodPool();
	const selected = useMoodSelection();
	const { data: market } = useSelectedMarketInfo();
	if (!live) return null;
	const signal = personalSignal(live, pool, selected);
	const marketName = market?.name ?? "";
	const coin = findMoodCoin(signal, marketName);
	return (
		<MoodMarketRing
			signal={signal}
			coin={coin}
			marketName={marketName}
			score={coin?.score ?? null}
			pool={pool}
			selected={selected}
		/>
	);
}
