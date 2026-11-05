import { useEffect, useRef } from "react";
import { cn } from "@/lib/cn";
import { type SpotMarketInfo, useSelectedMarketInfo, useSubscription } from "@/lib/hyperliquid";
import { playFlash, shouldPulse } from "@/lib/ui/flash";

const PULSE_MIN_INTERVAL_MS = 2_000;
const PULSE_KEYFRAMES: Keyframe[] = [
	{ opacity: 0.5, transform: "scale(1)" },
	{ opacity: 0, transform: "scale(3.5)" },
];
const PULSE_OPTIONS: KeyframeAnimationOptions = { duration: 600, easing: "ease-out" };

interface Props {
	dotClass: string;
	isConnected: boolean;
}

export function FooterStatusDot({ dotClass, isConnected }: Props) {
	const { data: market } = useSelectedMarketInfo();
	const isSpot = market?.kind === "spot";
	const perpCoin = market?.name ?? "";
	const spotCoin = isSpot ? `@${(market as SpotMarketInfo).index}` : "";

	const { data: perpCtxEvent } = useSubscription(
		"activeAssetCtx",
		{ coin: perpCoin },
		{ enabled: isConnected && !!perpCoin && !isSpot },
	);
	const { data: spotCtxEvent } = useSubscription(
		"activeSpotAssetCtx",
		{ coin: spotCoin },
		{ enabled: isConnected && !!spotCoin && isSpot },
	);
	const lastUpdate = isSpot ? spotCtxEvent : perpCtxEvent;

	const ringRef = useRef<HTMLSpanElement>(null);
	const lastPulseAtRef = useRef(0);

	useEffect(() => {
		if (!isConnected || !lastUpdate) return;
		const now = performance.now();
		if (!shouldPulse(now, lastPulseAtRef.current, PULSE_MIN_INTERVAL_MS)) return;
		lastPulseAtRef.current = now;
		playFlash(ringRef.current, PULSE_KEYFRAMES, PULSE_OPTIONS);
	}, [isConnected, lastUpdate]);

	return (
		<span aria-hidden className="relative inline-flex size-1.5 shrink-0">
			{isConnected && (
				<span ref={ringRef} className="pointer-events-none absolute inset-0 rounded-full bg-success opacity-0" />
			)}
			<span className={cn("relative size-1.5 rounded-full", dotClass)} />
		</span>
	);
}
