import { useEffect, useRef } from "react";
import type { Numeric } from "@/lib/trade/numbers";
import { getTickDirection, playFlash } from "@/lib/ui/flash";

const TICK_FLASH_MS = 450;
const UP_FLASH = "var(--market-up-flash)";
const DOWN_FLASH = "var(--market-down-flash)";

export function useTickFlash<T extends HTMLElement>(value: Numeric, resetKey: string) {
	const ref = useRef<T>(null);
	const prevRef = useRef({ value, resetKey });

	useEffect(() => {
		const prev = prevRef.current;
		prevRef.current = { value, resetKey };
		if (prev.resetKey !== resetKey) return;
		const direction = getTickDirection(prev.value, value);
		if (direction === 0) return;
		const color = direction > 0 ? UP_FLASH : DOWN_FLASH;
		playFlash(
			ref.current,
			[
				{ color, offset: 0 },
				{ color, offset: 0.3 },
			],
			{
				duration: TICK_FLASH_MS,
				easing: "ease-out",
			},
		);
	}, [value, resetKey]);

	return ref;
}
