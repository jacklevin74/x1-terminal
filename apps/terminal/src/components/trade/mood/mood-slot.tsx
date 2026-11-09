import { useSelectedMarketInfo } from "@/lib/hyperliquid";
import { findMoodCoin, useMoodSignal } from "@/lib/mood/signal";
import { type MoodVariant, useMoodPreview, useMoodVariant } from "@/stores/use-mood-variant-store";
import { MoodFooterStone } from "./mood-footer-stone";
import { MoodHeaderRing } from "./mood-header-ring";
import { MoodMarketRing } from "./mood-market-ring";
import { MoodNavSegments } from "./mood-nav-segments";
import { MoodOrb } from "./mood-orb";
import { MoodOrderRing } from "./mood-order-ring";

type Slot = "header" | "nav" | "market" | "footer" | "floating" | "order";

const SLOT_VARIANT: Record<Slot, MoodVariant> = { header: 1, market: 2, footer: 3, nav: 4, floating: 5, order: 6 };

interface Props {
	slot: Slot;
}

export function MoodSlot({ slot }: Props) {
	const variant = useMoodVariant();
	if (SLOT_VARIANT[slot] !== variant) return null;
	return <MoodSlotContent slot={slot} />;
}

function MoodSlotContent({ slot }: Props) {
	const { data: signal } = useMoodSignal();
	const preview = useMoodPreview();
	const { data: market } = useSelectedMarketInfo();
	if (!signal) return null;
	const marketName = market?.name ?? "";
	const coin = findMoodCoin(signal, marketName);
	const overallScore = preview ?? signal.overall.score;
	const coinScore = preview ?? coin?.score ?? null;
	switch (slot) {
		case "header":
			return <MoodHeaderRing signal={signal} score={overallScore} />;
		case "nav":
			return <MoodNavSegments signal={signal} score={overallScore} />;
		case "footer":
			return <MoodFooterStone signal={signal} score={overallScore} />;
		case "floating":
			return <MoodOrb signal={signal} score={overallScore} />;
		case "market":
			return <MoodMarketRing signal={signal} coin={coin} marketName={marketName} score={coinScore} />;
		case "order":
			return <MoodOrderRing coin={coin} marketName={marketName} score={coinScore} />;
	}
}
