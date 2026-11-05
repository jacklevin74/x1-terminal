import { type Numeric, toBig } from "@/lib/trade/numbers";

export type TickDirection = -1 | 0 | 1;

const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";

const activeFlashes = new WeakMap<Element, Animation>();

export function prefersReducedMotion(): boolean {
	if (typeof window === "undefined" || typeof window.matchMedia !== "function") return true;
	return window.matchMedia(REDUCED_MOTION_QUERY).matches;
}

export function getTickDirection(prev: Numeric, next: Numeric): TickDirection {
	const a = toBig(prev);
	const b = toBig(next);
	if (!a || !b) return 0;
	return b.cmp(a) as TickDirection;
}

export function isLevelResized(
	prev: { price: number; size: number } | null,
	next: { price: number; size: number },
): boolean {
	return prev !== null && prev.price === next.price && prev.size !== next.size;
}

export function shouldPulse(now: number, lastPulseAt: number, minIntervalMs: number): boolean {
	return now - lastPulseAt >= minIntervalMs;
}

export function playFlash(
	element: Element | null,
	keyframes: Keyframe[],
	options: KeyframeAnimationOptions,
): Animation | null {
	if (!element || typeof element.animate !== "function" || prefersReducedMotion()) return null;
	activeFlashes.get(element)?.cancel();
	const animation = element.animate(keyframes, options);
	activeFlashes.set(element, animation);
	return animation;
}
